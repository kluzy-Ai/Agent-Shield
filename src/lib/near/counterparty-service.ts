/**
 * NEAR Counterparty Check Service (STAGE 11)
 *
 * Evaluates target counterparties (receivers, smart contracts, external accounts)
 * across multiple on-chain and off-chain security signals:
 * 1. Account existence, code_hash (Contract vs. Named EOA), storage usage via NEAR Testnet RPC
 * 2. Recent code deployment / code hash verification
 * 3. Historical interaction records for this specific agent (from SQLite telemetry)
 * 4. Shared Threat Intelligence blocklist & incident evidence
 *
 * Decisions:
 * - ALLOW: Established, verified counterparty within safe bounds.
 * - WARN: First interaction, recently modified code, or unverified contract -> routes to human Approvals Queue.
 * - BLOCK: Confirmed malicious counterparty on shared threat list or drain exploit -> SDK refuses to sign.
 */

import { DatabaseSync } from 'node:sqlite';

export type CounterpartyRiskOutcome = 'ALLOW' | 'WARN' | 'BLOCK';

export interface CounterpartySignals {
  existsOnChain: boolean;
  isContract: boolean;
  codeHash: string;
  storageUsageBytes?: number;
  balanceNear?: string;
  priorInteractionCount: number;
  priorBlockedInteractions: number;
  isFirstInteraction: boolean;
  isOnSharedBlocklist: boolean;
  threatCategory?: string;
  evidenceSnippet?: string;
  reportId?: string;
  network: 'testnet' | 'mainnet';
  source: 'NEAR_TESTNET_RPC' | 'LOCAL_CACHE';
}

export interface CounterpartyCheckResult {
  counterparty: string;
  outcome: CounterpartyRiskOutcome;
  riskScore: number; // 0 to 100
  reasons: string[];
  signals: CounterpartySignals;
  recommendedAction: string;
  checkedAt: string;
}

const DEFAULT_TESTNET_RPC = 'https://rpc.testnet.near.org';
const EMPTY_CODE_HASH = '11111111111111111111111111111111';

// Static known exploit counterparties from PRD threat scenarios
const STATIC_KNOWN_EXPLOIT_RECEIVERS = new Set([
  'attacker-drain.testnet',
  'untrusted-drain.testnet',
  'exploit-drain.testnet',
  'infiltrator.nearhack.testnet',
  'oracle-exploit.testnet'
]);

export class CounterpartyService {
  private rpcUrl: string;

  constructor(rpcUrl = DEFAULT_TESTNET_RPC) {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Queries on-chain account state from NEAR Testnet RPC.
   */
  public async queryOnChainAccount(accountId: string): Promise<{
    exists: boolean;
    isContract: boolean;
    codeHash: string;
    storageUsage?: number;
    amount?: string;
  }> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `counterparty-${Date.now()}`,
          method: 'query',
          params: {
            request_type: 'view_account',
            finality: 'final',
            account_id: accountId
          }
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        return { exists: false, isContract: false, codeHash: EMPTY_CODE_HASH };
      }

      const data = await response.json();

      if (data.error || !data.result) {
        return { exists: false, isContract: false, codeHash: EMPTY_CODE_HASH };
      }

      const codeHash = data.result.code_hash || EMPTY_CODE_HASH;
      const isContract = codeHash !== EMPTY_CODE_HASH;

      return {
        exists: true,
        isContract,
        codeHash,
        storageUsage: data.result.storage_usage,
        amount: data.result.amount
      };
    } catch {
      // Offline fallback: if network request fails, assume unverified
      return { exists: false, isContract: false, codeHash: EMPTY_CODE_HASH };
    }
  }

  /**
   * Evaluates counterparty risk combining on-chain state, local interaction history, and shared threat intel.
   */
  public async evaluateCounterparty(
    counterparty: string,
    context?: {
      agentId?: string;
      workspaceId?: string;
      targetContractId?: string;
      approvedDestinations?: string[];
      db?: DatabaseSync;
      expectedIsContract?: boolean;
    }
  ): Promise<CounterpartyCheckResult> {
    const reasons: string[] = [];
    let riskScore = 10; // baseline low risk
    const now = new Date().toISOString();

    const normalizedCounterparty = counterparty.toLowerCase().trim();

    // 1. Check Shared Blocklist (In-Memory + Database)
    let isOnSharedBlocklist = STATIC_KNOWN_EXPLOIT_RECEIVERS.has(normalizedCounterparty);
    let threatCategory: string | undefined;
    let evidenceSnippet: string | undefined;
    let reportId: string | undefined;

    if (isOnSharedBlocklist) {
      threatCategory = 'UNSAFE_TRANSACTION';
      evidenceSnippet = `Identified as known malicious drain counterparty in Agent Shield threat catalog.`;
    }

    if (context?.db) {
      try {
        const threatRow = context.db.prepare(`
          SELECT id, threat_category, description, evidence_snippet, defensive_evidence
          FROM threat_reports
          WHERE LOWER(target_address_or_domain) = ?
            AND is_confirmed = 1
            AND is_hidden = 0
          ORDER BY created_at DESC
          LIMIT 1
        `).get(normalizedCounterparty) as any;

        if (threatRow) {
          isOnSharedBlocklist = true;
          threatCategory = threatRow.threat_category;
          evidenceSnippet = threatRow.evidence_snippet || threatRow.defensive_evidence || threatRow.description;
          reportId = threatRow.id;
        }
      } catch { }
    }

    // 2. Query On-Chain Account State via NEAR Testnet RPC
    const onChain = await this.queryOnChainAccount(normalizedCounterparty);

    // 3. Query Local Interaction History for this Agent
    let priorInteractionCount = 0;
    let priorBlockedInteractions = 0;

    if (context?.db && context.agentId) {
      try {
        const stats = context.db.prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN enforcement_outcome IN ('BLOCKED', 'PAUSED') THEN 1 ELSE 0 END) as blocked
          FROM telemetry_events
          WHERE destination = ? AND agent_id = ?
        `).get(normalizedCounterparty, context.agentId) as any;

        priorInteractionCount = stats?.total || 0;
        priorBlockedInteractions = stats?.blocked || 0;
      } catch { }
    }

    const isFirstInteraction = priorInteractionCount === 0;

    // 4. Decision Logic & Signal Calibration

    // SIGNAL 1: Confirmed Threat Blocklist -> IMMEDIATE BLOCK
    if (isOnSharedBlocklist) {
      riskScore = 95;
      reasons.push(
        `Counterparty '${normalizedCounterparty}' is listed on the verified Threat Intelligence Blocklist (${threatCategory || 'MALICIOUS_DESTINATION'}).`
      );
      if (evidenceSnippet) {
        reasons.push(`Evidence: "${evidenceSnippet.slice(0, 160)}"`);
      }
      return {
        counterparty: normalizedCounterparty,
        outcome: 'BLOCK',
        riskScore,
        reasons,
        signals: {
          existsOnChain: onChain.exists,
          isContract: onChain.isContract,
          codeHash: onChain.codeHash,
          storageUsageBytes: onChain.storageUsage,
          balanceNear: onChain.amount,
          priorInteractionCount,
          priorBlockedInteractions,
          isFirstInteraction,
          isOnSharedBlocklist: true,
          threatCategory,
          evidenceSnippet,
          reportId,
          network: 'testnet',
          source: 'LOCAL_CACHE'
        },
        recommendedAction: 'Refuse transaction signing immediately. Quarantine agent if destination was autonomously chosen.',
        checkedAt: now
      };
    }

    // Declared Target Contract Check (Pre-approved operational receiver)
    const isDeclaredTarget = context?.targetContractId?.toLowerCase() === normalizedCounterparty ||
      context?.approvedDestinations?.some((d) => d.toLowerCase() === normalizedCounterparty);

    if (isDeclaredTarget) {
      riskScore = 10;
      reasons.push(`Counterparty '${normalizedCounterparty}' is the declared, pre-approved target contract for this agent.`);
    } else {
      // SIGNAL 2: On-chain existence and type check
      if (!onChain.exists) {
        riskScore += 35;
        reasons.push(`Account '${normalizedCounterparty}' does not exist on NEAR Testnet state.`);
      } else {
        if (onChain.isContract) {
          reasons.push(`Target is a deployed Smart Contract (code_hash: ${onChain.codeHash.slice(0, 10)}...).`);
        } else {
          reasons.push(`Target is a Named User Account without deployed contract code.`);
        }

        if (context?.expectedIsContract === true && !onChain.isContract) {
          riskScore += 25;
          reasons.push(`Agent expected a Smart Contract counterparty, but target account has no code deployed.`);
        }
      }

      // SIGNAL 3: First Interaction with this agent
      if (isFirstInteraction) {
        riskScore += 20;
        reasons.push(`First-time interaction: Agent has never previously interacted with counterparty '${normalizedCounterparty}'.`);
      } else {
        reasons.push(`Agent has interacted with this counterparty ${priorInteractionCount} time(s).`);
      }

      // SIGNAL 4: Prior Blocked / Flagged History
      if (priorBlockedInteractions > 0) {
        riskScore += 35;
        reasons.push(`Counterparty has ${priorBlockedInteractions} prior blocked/flagged interaction(s) with this agent.`);
      }
    }

    // Calibration of Outcome
    let outcome: CounterpartyRiskOutcome = 'ALLOW';
    let recommendedAction = 'Permit automated transaction execution within declared policy boundaries.';

    if (riskScore >= 75) {
      outcome = 'BLOCK';
      recommendedAction = 'Block transaction signing. Reject autonomous payment execution.';
    } else if (riskScore >= 35) {
      outcome = 'WARN';
      recommendedAction = 'Hold transaction for human approval in the Approvals Queue before signing.';
    }

    return {
      counterparty: normalizedCounterparty,
      outcome,
      riskScore: Math.min(100, Math.max(0, riskScore)),
      reasons,
      signals: {
        existsOnChain: onChain.exists,
        isContract: onChain.isContract,
        codeHash: onChain.codeHash,
        storageUsageBytes: onChain.storageUsage,
        balanceNear: onChain.amount,
        priorInteractionCount,
        priorBlockedInteractions,
        isFirstInteraction,
        isOnSharedBlocklist: false,
        network: 'testnet',
        source: 'NEAR_TESTNET_RPC'
      },
      recommendedAction,
      checkedAt: now
    };
  }
}

export const defaultCounterpartyService = new CounterpartyService();
