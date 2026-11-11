/**
 * @agentshield/sdk
 * Official Agent Shield TypeScript SDK for Autonomous AI Agents on NEAR Protocol.
 * Provides in-line tool wrapping, policy evaluation, cryptographic telemetry emission,
 * automated health heartbeats, and real human approval holding queues (FR-07, FR-08).
 */

export interface ToolInvocation<TArgs = any> {
  toolName: string;
  args: TArgs;
  destination?: string;
  attachedDepositYocto?: string;
}

export interface InterceptionResult {
  action: 'ALLOW' | 'WARN' | 'BLOCK';
  reason?: string;
  sanitizedArgs: any;
  requiresHumanSignature?: boolean;
}

export interface AgentShieldConfig {
  agentId: string;
  ingestToken?: string;
  secretKey?: string; // Backwards compatible alias for ingestToken
  gatewayUrl?: string; // Backwards compatible alias for endpointUrl
  endpointUrl?: string; // Default: 'http://localhost:3000/api/ingest'
  nearAccountId?: string;
  targetContractId?: string;
  heartbeatIntervalMs?: number;
  enforcementLevel?: 'ENFORCING' | 'APPROVAL_REQUIRED' | 'OBSERVE_ONLY' | 'LIMITED_VISIBILITY' | 'PAUSED' | 'DISCONNECTED';
  isObserveOnly?: boolean;
  maxNearPerTransaction?: number;
  requiresApprovalAboveNear?: number;
  allowedTools?: string[];
  blockedDestinations?: string[];
  approvedDestinations?: string[];
  dryRun?: boolean;
  approvalPollIntervalMs?: number;
  approvalTimeoutMs?: number;
  approvalResolver?: (approvalId: string, req: any) => Promise<'APPROVE' | 'DENY'> | 'APPROVE' | 'DENY';
  counterpartyCheckService?: {
    evaluateCounterparty: (counterparty: string, context?: any) => Promise<{
      outcome: 'ALLOW' | 'WARN' | 'BLOCK';
      reasons: string[];
      riskScore: number;
    }>;
  };
}

export interface ToolInvocationContext<TArgs = any> {
  toolName: string;
  destination: string;
  actionType?: string;
  args: TArgs;
  attachedDepositYocto?: string;
  attachedNear?: string | number;
}

export interface InterceptionDecision {
  outcome: 'ALLOWED' | 'FLAGGED' | 'PAUSED' | 'BLOCKED' | 'REQUIRE_APPROVAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
  requiresHumanSignature?: boolean;
  requiresApproval?: boolean;
  isDryRun?: boolean;
  enforcementUnavailable?: boolean;
  signalsTriggered: string[];
}

export interface TelemetryPayload {
  id?: string;
  eventType: 'TOOL_CALL' | 'CONTRACT_CALL' | 'OUTBOUND_EGRESS' | 'AUTH_CHECK' | 'HEARTBEAT';
  toolName?: string;
  actionType: string;
  destination: string;
  payloadSummary: string;
  enforcementOutcome: 'ALLOWED' | 'FLAGGED' | 'PAUSED' | 'BLOCKED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signalsTriggered?: string[];
  counterpartySignals?: Record<string, any>;
  rawRedactedPayload?: string;
  isSimulated?: boolean;
}

export interface IngestResponse {
  success: boolean;
  eventId?: string;
  outcome?: string;
  duplicate?: boolean;
  message?: string;
  error?: string;
}

export class PolicyBlockedError extends Error {
  public readonly toolName: string;
  public readonly destination: string;
  public readonly reason: string;

  constructor(toolName: string, destination: string, reason: string) {
    super(`[AGENT SHIELD BLOCKED] Tool '${toolName}' to '${destination}' blocked: ${reason}`);
    this.name = 'PolicyBlockedError';
    this.toolName = toolName;
    this.destination = destination;
    this.reason = reason;
  }
}

export class ApprovalDeniedError extends Error {
  public readonly approvalId: string;
  public readonly toolName: string;
  public readonly reason: string;

  constructor(approvalId: string, toolName: string, reason: string) {
    super(`[APPROVAL DENIED] Action '${toolName}' was denied by security operator: ${reason}`);
    this.name = 'ApprovalDeniedError';
    this.approvalId = approvalId;
    this.toolName = toolName;
    this.reason = reason;
  }
}

export class ApprovalExpiredError extends Error {
  public readonly approvalId: string;
  public readonly toolName: string;

  constructor(approvalId: string, toolName: string) {
    super(`[APPROVAL EXPIRED] Action '${toolName}' authorization expired without human signature.`);
    this.name = 'ApprovalExpiredError';
    this.approvalId = approvalId;
    this.toolName = toolName;
  }
}

/**
 * Sanitizes and redacts raw secrets, NEAR private keys, seed phrases, emails, cards and auth headers
 */
export function redactSensitivePayload(input: any): string {
  if (!input) return '';
  let str = typeof input === 'string' ? input : JSON.stringify(input);

  // Redact NEAR ed25519 private keys: ed25519:...
  str = str.replace(/ed25519:[1-9A-HJ-NP-Za-km-z]{40,95}/g, 'ed25519:[REDACTED_NEAR_SECRET_KEY]');
  // Redact EVM 0x wallet private keys (64 hex characters)
  str = str.replace(/\b0x[a-fA-F0-9]{64}\b/g, '[REDACTED_WALLET_PRIVATE_KEY]');
  // Redact secp256k1 private keys
  str = str.replace(/secp256k1:[0-9a-zA-Z]{40,}/g, 'secp256k1:[REDACTED_PRIVATE_KEY]');
  // Redact Bearer tokens
  str = str.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{16,}/gi, 'Bearer [REDACTED_TOKEN]');
  // Redact ash_live_ and NEAR_AI_ tokens
  str = str.replace(/\bash_live_[a-zA-Z0-9_-]{16,}\b/g, 'ash_live_[REDACTED_INGEST_KEY]');
  str = str.replace(/\bNEAR_AI_[a-zA-Z0-9_-]{16,}\b/g, 'NEAR_AI_[REDACTED_KEY]');
  str = str.replace(/\bsk-[a-zA-Z0-9_-]{20,}\b/g, 'sk-[REDACTED_API_KEY]');
  // Redact seed phrases
  str = str.replace(/(?:seed\s+phrase|recovery\s+phrase|mnemonic)\s*[:=]\s*["']?([a-z\s]{20,150})["']?/gi, 'seed phrase: "[REDACTED_SEED_PHRASE]"');
  // Redact customer emails
  str = str.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');
  // Redact phone numbers
  str = str.replace(/(?:\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
  // Redact card-like numbers (16 digits formatted)
  str = str.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[REDACTED_CARD]');
  // Redact raw password fields
  str = str.replace(/"(?:password|secret|api_key|apiKey)"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED]"');

  return str;
}

export class AgentShield {
  public readonly config: Required<Omit<AgentShieldConfig, 'requiresApprovalAboveNear' | 'approvalResolver' | 'counterpartyCheckService'>> & {
    requiresApprovalAboveNear?: number;
    approvalResolver?: (approvalId: string, req: any) => Promise<'APPROVE' | 'DENY'> | 'APPROVE' | 'DENY';
    counterpartyCheckService?: {
      evaluateCounterparty: (counterparty: string, context?: any) => Promise<{
        outcome: 'ALLOW' | 'WARN' | 'BLOCK';
        reasons: string[];
        riskScore: number;
      }>;
    };
  };
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: AgentShieldConfig) {
    const ingestToken = config.ingestToken || config.secretKey || 'default_token';
    const endpointUrl = (config.endpointUrl || config.gatewayUrl || 'http://localhost:3000/api/ingest').replace(/\/$/, '');
    const isObserveOnly = Boolean(config.isObserveOnly || config.enforcementLevel === 'OBSERVE_ONLY');

    this.config = {
      agentId: config.agentId,
      ingestToken,
      secretKey: ingestToken,
      gatewayUrl: endpointUrl,
      endpointUrl,
      nearAccountId: config.nearAccountId || 'unspecified.near',
      targetContractId: config.targetContractId || 'unspecified.near',
      heartbeatIntervalMs: config.heartbeatIntervalMs || 30_000,
      enforcementLevel: config.enforcementLevel || (isObserveOnly ? 'OBSERVE_ONLY' : 'ENFORCING'),
      isObserveOnly,
      maxNearPerTransaction: config.maxNearPerTransaction ?? 5.0,
      requiresApprovalAboveNear: config.requiresApprovalAboveNear,
      allowedTools: config.allowedTools || [],
      blockedDestinations: config.blockedDestinations || ['attacker-drain.testnet', 'untrusted-drain.testnet', 'exploit-drain.near', 'hacker.near'],
      approvedDestinations: config.approvedDestinations || [],
      dryRun: Boolean(config.dryRun),
      approvalPollIntervalMs: config.approvalPollIntervalMs || 250,
      approvalTimeoutMs: config.approvalTimeoutMs || 30_000,
      approvalResolver: config.approvalResolver,
      counterpartyCheckService: config.counterpartyCheckService
    };
  }

  private get baseApiUrl(): string {
    // Strip trailing /ingest or /ingest/
    return this.config.endpointUrl.replace(/\/ingest\/?$/, '');
  }

  /**
   * Evaluates a tool call before execution (Legacy & In-Line signature).
   */
  async intercept<TArgs = any>(invocation: ToolInvocation<TArgs>): Promise<InterceptionResult> {
    if (invocation.attachedDepositYocto && BigInt(invocation.attachedDepositYocto) > 0n) {
      if (invocation.attachedDepositYocto === '1') {
        return {
          action: 'WARN',
          reason: '1 YoctoNEAR human signature required by protocol consensus.',
          sanitizedArgs: invocation.args,
          requiresHumanSignature: true,
        };
      }
    }

    return {
      action: 'ALLOW',
      sanitizedArgs: invocation.args,
      requiresHumanSignature: false,
    };
  }

  /**
   * Pre-execution policy evaluation and security gate (FR-07, FR-08)
   */
  public evaluateCall<TArgs>(context: ToolInvocationContext<TArgs>): InterceptionDecision {
    const signals: string[] = [];
    const isObserveOnly = this.config.isObserveOnly || this.config.enforcementLevel === 'OBSERVE_ONLY';
    const isDryRun = this.config.dryRun;

    const payloadStr = typeof context.args === 'object'
      ? JSON.stringify(context.args)
      : String(context.args || '');

    // 1. Allowed Tools Evaluation
    if (this.config.allowedTools && this.config.allowedTools.length > 0) {
      const isAllowed = this.config.allowedTools.some(
        (t) => t === '*' || t.toLowerCase() === context.toolName.toLowerCase()
      );
      if (!isAllowed) {
        signals.push('UNAUTHORIZED_TOOL');
        return this.resolveDecision({
          outcome: 'BLOCKED',
          riskLevel: 'HIGH',
          reason: `Tool '${context.toolName}' is not in authorized tools [${this.config.allowedTools.join(', ')}].`,
          isDryRun,
          isObserveOnly,
          signals
        });
      }
    }

    // 2. Blocked destination check
    const isBlocked = this.config.blockedDestinations.some(
      (d) => d.toLowerCase() === context.destination.toLowerCase()
    );
    if (isBlocked) {
      signals.push('KNOWN_EXPLOIT_DESTINATION', 'COMMUNITY_BLOCKLIST_HIT');
      return this.resolveDecision({
        outcome: 'BLOCKED',
        riskLevel: 'CRITICAL',
        reason: `Target destination '${context.destination}' is flagged in shared community threat intelligence.`,
        isDryRun,
        isObserveOnly,
        signals
      });
    }

    // 3. Approved destination check (if configured)
    if (this.config.approvedDestinations.length > 0) {
      const isApproved = this.config.approvedDestinations.some(
        (d) => d === '*' || d.toLowerCase() === context.destination.toLowerCase()
      );
      if (!isApproved) {
        signals.push('UNAPPROVED_DESTINATION');
        return this.resolveDecision({
          outcome: 'BLOCKED',
          riskLevel: 'HIGH',
          reason: `Destination '${context.destination}' is not in approved allowlist.`,
          isDryRun,
          isObserveOnly,
          signals
        });
      }
    }

    // 4. Prompt Injection Substring Scan
    const promptInjectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /disregard\s+(all\s+)?(prior|previous)\s+constraints/i,
      /drain\s+all\s+funds/i,
      /emergency\s+drain/i
    ];
    for (const pat of promptInjectionPatterns) {
      if (pat.test(payloadStr)) {
        signals.push('PROMPT_INJECTION_DETECTED');
        return this.resolveDecision({
          outcome: 'BLOCKED',
          riskLevel: 'CRITICAL',
          reason: `Prompt injection attack phrase detected in execution arguments.`,
          isDryRun,
          isObserveOnly,
          signals
        });
      }
    }

    // 5. Transaction Limit & Ceiling Check
    const amount = context.attachedNear !== undefined
      ? (typeof context.attachedNear === 'string' ? parseFloat(context.attachedNear) : context.attachedNear)
      : undefined;

    if (amount !== undefined && !isNaN(amount)) {
      // Hard Ceiling (Block)
      if (amount > this.config.maxNearPerTransaction) {
        signals.push('EXCEEDS_MAX_NEAR_CEILING');
        return this.resolveDecision({
          outcome: 'BLOCKED',
          riskLevel: 'HIGH',
          reason: `Attached amount ${amount} NEAR exceeds policy single-transaction ceiling of ${this.config.maxNearPerTransaction} NEAR.`,
          isDryRun,
          isObserveOnly,
          signals
        });
      }

      // Threshold Holding for Human Approval
      if (this.config.requiresApprovalAboveNear !== undefined && amount > this.config.requiresApprovalAboveNear) {
        signals.push('REQUIRES_HUMAN_APPROVAL_THRESHOLD_BREACH');
        return this.resolveDecision({
          outcome: 'REQUIRE_APPROVAL',
          riskLevel: 'HIGH',
          reason: `Transaction amount ${amount} NEAR exceeds autonomous threshold of ${this.config.requiresApprovalAboveNear} NEAR. Held for human approval.`,
          isDryRun,
          isObserveOnly,
          signals,
          requiresApproval: true,
          requiresHumanSignature: true
        });
      }
    }

    // 6. 1 YoctoNEAR Rule (Cryptographic Human Sign-Off Gate)
    if (context.attachedDepositYocto === '1') {
      signals.push('1_YOCTO_NEAR_HUMAN_SIGNATURE_REQUIRED');
      return this.resolveDecision({
        outcome: 'REQUIRE_APPROVAL',
        riskLevel: 'MEDIUM',
        reason: '1 YoctoNEAR human signature required by protocol consensus.',
        isDryRun,
        isObserveOnly,
        signals,
        requiresApproval: true,
        requiresHumanSignature: true
      });
    }

    signals.push('WITHIN_NORMAL_BOUNDS');
    return {
      outcome: 'ALLOWED',
      riskLevel: 'LOW',
      signalsTriggered: signals
    };
  }

  private resolveDecision(params: {
    outcome: 'BLOCKED' | 'REQUIRE_APPROVAL' | 'PAUSED' | 'FLAGGED' | 'ALLOWED';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    isDryRun: boolean;
    isObserveOnly: boolean;
    signals: string[];
    requiresApproval?: boolean;
    requiresHumanSignature?: boolean;
  }): InterceptionDecision {
    const { outcome, riskLevel, reason, isDryRun, isObserveOnly, signals, requiresApproval, requiresHumanSignature } = params;

    // A. Observe-Only Real Capability Constraint (FR-15 / PRD Section 21)
    if (isObserveOnly) {
      signals.push('ENFORCEMENT_UNAVAILABLE_OBSERVE_ONLY');
      return {
        outcome: 'FLAGGED',
        riskLevel,
        reason: `[OBSERVE-ONLY] Violation: ${reason}. Enforcement unavailable for Observe-Only integration (alert generated instead of blocking).`,
        enforcementUnavailable: true,
        signalsTriggered: signals
      };
    }

    // B. Dry-Run Simulation Mode
    if (isDryRun) {
      signals.push('DRY_RUN_SIMULATION');
      return {
        outcome: 'ALLOWED',
        riskLevel,
        reason: `[DRY-RUN SIMULATION] Would have triggered ${outcome}: ${reason}`,
        isDryRun: true,
        signalsTriggered: signals
      };
    }

    return {
      outcome,
      riskLevel,
      reason,
      requiresApproval,
      requiresHumanSignature,
      signalsTriggered: signals
    };
  }

  /**
   * Holds execution until human approval is granted, denied, or timed out.
   */
  public async holdForApproval(params: {
    toolName: string;
    destination: string;
    amountNear?: string | number;
    parameters: any;
    reason: string;
  }): Promise<{ approved: boolean; approvalId: string; decisionNote?: string }> {
    const approvalId = `appr-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`;
    console.log(`⏳ [APPROVAL QUEUE] Action '${params.toolName}' held for human authorization: ${params.reason}`);

    // If a custom approval resolver is configured (e.g. for deterministic testing):
    if (this.config.approvalResolver) {
      const decision = await this.config.approvalResolver(approvalId, params);
      if (decision === 'APPROVE') {
        console.log(`✅ [APPROVED] Human operator authorized action '${params.toolName}' with 1 yoctoNEAR deposit.`);
        return { approved: true, approvalId, decisionNote: 'Approved via resolver.' };
      }
      throw new ApprovalDeniedError(approvalId, params.toolName, 'Denied by security operator.');
    }

    // Submit approval request to backend Approvals API
    const createUrl = `${this.baseApiUrl}/approvals`;
    let serverApprovalId = approvalId;

    try {
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.ingestToken}`,
          'x-agent-id': this.config.agentId
        },
        body: JSON.stringify({
          agentId: this.config.agentId,
          actionType: params.toolName,
          toolName: params.toolName,
          destination: params.destination,
          amountNear: params.amountNear,
          parameters: params.parameters,
          reason: params.reason,
          requiresYoctoDeposit: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.approval?.id) {
          serverApprovalId = data.approval.id;
        }
      }
    } catch { }

    // Polling loop: Wait for human approval
    const startTime = Date.now();
    const timeoutMs = this.config.approvalTimeoutMs;
    const pollIntervalMs = this.config.approvalPollIntervalMs;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      try {
        const pollRes = await fetch(`${this.baseApiUrl}/approvals/${serverApprovalId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.ingestToken}`,
            'x-agent-id': this.config.agentId
          }
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          const status = pollData.approval?.status;

          if (status === 'APPROVED') {
            console.log(`✅ [APPROVED] Human operator authorized action '${params.toolName}' with 1 yoctoNEAR deposit. Resuming execution...`);
            return {
              approved: true,
              approvalId: serverApprovalId,
              decisionNote: pollData.approval?.decisionNote
            };
          }

          if (status === 'DENIED') {
            throw new ApprovalDeniedError(
              serverApprovalId,
              params.toolName,
              pollData.approval?.decisionNote || 'Action denied by operator.'
            );
          }

          if (status === 'EXPIRED') {
            throw new ApprovalExpiredError(serverApprovalId, params.toolName);
          }
        }
      } catch (err: any) {
        if (err instanceof ApprovalDeniedError || err instanceof ApprovalExpiredError) {
          throw err;
        }
      }
    }

    throw new ApprovalExpiredError(serverApprovalId, params.toolName);
  }

  /**
   * Wrap any tool call with automated policy enforcement and telemetry emission.
   * Real holding queue on REQUIRE_APPROVAL.
   */
  public wrapToolCall<TArgs, TResult>(
    toolName: string,
    destination: string,
    fn: (args: TArgs) => Promise<TResult> | TResult,
    options: {
      actionType?: string;
      attachedNear?: string | number;
      attachedDepositYocto?: string;
    } = {}
  ): (args: TArgs) => Promise<TResult> {
    return async (args: TArgs): Promise<TResult> => {
      const context: ToolInvocationContext<TArgs> = {
        toolName,
        destination,
        actionType: options.actionType || toolName,
        args,
        attachedNear: options.attachedNear,
        attachedDepositYocto: options.attachedDepositYocto
      };

      const decision = this.evaluateCall(context);
      const redactedPayload = redactSensitivePayload(args);
      const payloadSummary = `Tool '${toolName}' invoked targeting '${destination}'. Payload: ${redactedPayload.substring(0, 100)}`;

      // Counterparty Check Service Integration (Stage 11)
      if (this.config.counterpartyCheckService && destination) {
        const cpResult = await this.config.counterpartyCheckService.evaluateCounterparty(destination, {
          agentId: this.config.agentId,
          targetContractId: this.config.targetContractId,
          approvedDestinations: this.config.approvedDestinations
        });

        if (cpResult.outcome === 'BLOCK') {
          decision.signalsTriggered.push('COUNTERPARTY_BLOCKED');
          await this.emitTelemetry({
            eventType: 'TOOL_CALL',
            toolName,
            actionType: context.actionType!,
            destination,
            payloadSummary: `[BLOCKED] Counterparty blocked: ${cpResult.reasons.join('; ')}`,
            enforcementOutcome: 'BLOCKED',
            riskLevel: 'CRITICAL',
            signalsTriggered: ['COUNTERPARTY_BLOCKED', ...cpResult.reasons],
            rawRedactedPayload: redactedPayload
          }).catch(() => { });

          throw new PolicyBlockedError(
            toolName,
            destination,
            `Counterparty '${destination}' is BLOCKED by Agent Shield security intelligence: ${cpResult.reasons.join('; ')}`
          );
        }

        if (cpResult.outcome === 'WARN' && decision.outcome !== 'REQUIRE_APPROVAL') {
          decision.outcome = 'REQUIRE_APPROVAL';
          decision.riskLevel = 'HIGH';
          decision.reason = `Counterparty Warning: ${cpResult.reasons.join('; ')}`;
          decision.signalsTriggered.push('COUNTERPARTY_WARN');
        }
      }

      // 1. BLOCKED Outcome
      if (decision.outcome === 'BLOCKED') {
        await this.emitTelemetry({
          eventType: 'TOOL_CALL',
          toolName,
          actionType: context.actionType!,
          destination,
          payloadSummary: `[BLOCKED] ${decision.reason} (${payloadSummary})`,
          enforcementOutcome: 'BLOCKED',
          riskLevel: decision.riskLevel,
          signalsTriggered: decision.signalsTriggered,
          rawRedactedPayload: redactedPayload
        }).catch(() => { });

        throw new PolicyBlockedError(toolName, destination, decision.reason || 'Blocked by Agent Shield policy.');
      }

      // 2. REQUIRE_APPROVAL Outcome -> Really hold action!
      if (decision.outcome === 'REQUIRE_APPROVAL') {
        await this.emitTelemetry({
          eventType: 'TOOL_CALL',
          toolName,
          actionType: context.actionType!,
          destination,
          payloadSummary: `[HELD FOR APPROVAL] ${decision.reason} (${payloadSummary})`,
          enforcementOutcome: 'PAUSED',
          riskLevel: decision.riskLevel,
          signalsTriggered: [...decision.signalsTriggered, 'HELD_FOR_HUMAN_APPROVAL'],
          rawRedactedPayload: redactedPayload
        }).catch(() => { });

        // Real hold until approved or denied!
        await this.holdForApproval({
          toolName,
          destination,
          amountNear: options.attachedNear,
          parameters: args,
          reason: decision.reason || 'High-impact action requires human approval.'
        });
      }

      // 3. Allowed or Flagged (including observe-only or dry-run): Execute tool
      const startTime = Date.now();
      try {
        const result = await fn(args);
        const duration = Date.now() - startTime;

        const outcome = decision.outcome === 'REQUIRE_APPROVAL' ? 'ALLOWED' : (decision.outcome as any);
        await this.emitTelemetry({
          eventType: 'TOOL_CALL',
          toolName,
          actionType: context.actionType!,
          destination,
          payloadSummary: `${payloadSummary} (completed in ${duration}ms)`,
          enforcementOutcome: outcome === 'REQUIRE_APPROVAL' ? 'ALLOWED' : outcome,
          riskLevel: decision.riskLevel,
          signalsTriggered: decision.signalsTriggered,
          rawRedactedPayload: redactedPayload,
          isSimulated: Boolean(decision.isDryRun)
        }).catch(() => { });

        return result;
      } catch (err: any) {
        await this.emitTelemetry({
          eventType: 'TOOL_CALL',
          toolName,
          actionType: context.actionType!,
          destination,
          payloadSummary: `Tool execution failed: ${err.message}`,
          enforcementOutcome: 'FLAGGED',
          riskLevel: 'MEDIUM',
          signalsTriggered: ['TOOL_EXECUTION_EXCEPTION'],
          rawRedactedPayload: redactedPayload
        }).catch(() => { });

        throw err;
      }
    };
  }

  /**
   * Emit telemetry event directly to Agent Shield ingestion API
   */
  public async emitTelemetry(event: TelemetryPayload): Promise<IngestResponse> {
    const url = `${this.config.endpointUrl}/telemetry`;
    const payload = {
      id: event.id || `evt-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`,
      agentId: this.config.agentId,
      timestamp: new Date().toISOString(),
      ...event
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.ingestToken}`,
          'x-agent-id': this.config.agentId
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}`
        };
      }

      return {
        success: true,
        eventId: payload.id,
        outcome: data.outcome || payload.enforcementOutcome,
        duplicate: Boolean(data.duplicate)
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Telemetry emission network failure'
      };
    }
  }

  /**
   * Send single health heartbeat
   */
  public async sendHeartbeat(status = 'ACTIVE'): Promise<{ success: boolean; error?: string }> {
    const url = `${this.config.endpointUrl}/heartbeat`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.ingestToken}`,
          'x-agent-id': this.config.agentId
        },
        body: JSON.stringify({
          agentId: this.config.agentId,
          timestamp: new Date().toISOString(),
          status
        })
      });

      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        error: !res.ok ? (data.error || `HTTP ${res.status}`) : undefined
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Start recurring heartbeat timer
   */
  public startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.sendHeartbeat().catch(() => { });
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(() => { });
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop recurring heartbeat timer
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
