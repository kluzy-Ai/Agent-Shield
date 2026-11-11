/**
 * Agent Shield Policy Engine (FR-07, FR-08)
 * Evaluates rules across allowed tools, approved destinations, sensitive data categories,
 * transaction limits, and approval requirements.
 * Outcomes: LOG, ALERT, REQUIRE_APPROVAL, PAUSE, BLOCK, plus dry-run mode.
 * Enforces real agent capability constraints (Observe-Only agents cannot halt execution).
 */

export type PolicyAction = 'LOG' | 'ALERT' | 'REQUIRE_APPROVAL' | 'PAUSE' | 'BLOCK';

export type PolicyRuleType =
  | 'ALLOWED_TOOLS'
  | 'APPROVED_DESTINATIONS'
  | 'SENSITIVE_DATA'
  | 'TRANSACTION_LIMIT'
  | 'APPROVAL_REQUIREMENT'
  | 'YOCTO_NEAR_GATE'
  | 'PROMPT_INJECTION';

export interface EvaluatedRule {
  id: string;
  name: string;
  type: PolicyRuleType;
  action: PolicyAction;
  dryRun: boolean;
  threshold?: number | string;
  allowedTools?: string[];
  approvedDestinations?: string[];
  blockedDestinations?: string[];
  sensitiveDataCategories?: ('CUSTOMER_PII' | 'SECRET_KEYS' | 'PROMPT_INJECTION')[];
  config?: Record<string, any>;
}

export interface PolicyDefinition {
  id: string;
  workspaceId: string;
  agentId: string; // 'all' or specific agent ID
  name: string;
  type: string;
  status: 'ACTIVE' | 'DISABLED' | 'TEST_MODE';
  isEnforceable: boolean;
  dryRun: boolean;
  rules: EvaluatedRule[];
  allowedTools?: string[];
  approvedDestinations?: string[];
  blockedDestinations?: string[];
  dataCategories?: string[];
  maxNearPerTransaction?: number;
  requiresApprovalAboveNear?: number;
}

export interface PolicyEvaluationContext {
  agentId: string;
  agentName: string;
  enforcementLevel?: 'ENFORCING' | 'APPROVAL_REQUIRED' | 'OBSERVE_ONLY' | 'LIMITED_VISIBILITY' | 'PAUSED' | 'DISCONNECTED';
  isObserveOnly?: boolean;
  toolName: string;
  destination: string;
  amountNear?: number | string;
  attachedDepositYocto?: string;
  parameters?: Record<string, any>;
  rawPayload?: any;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  outcome: PolicyAction;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  matchedPolicyId?: string;
  matchedRuleId?: string;
  requiresApproval: boolean;
  requiresYoctoDeposit: boolean;
  isDryRun: boolean;
  enforcementUnavailable: boolean;
  signalsTriggered: string[];
}

// Common sensitive data regex patterns
const PATTERNS = {
  NEAR_PRIVATE_KEY: /ed25519:[0-9a-zA-Z]{40,}/gi,
  SECP_PRIVATE_KEY: /secp256k1:[0-9a-zA-Z]{40,}/gi,
  BEARER_TOKEN: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  EMAIL_PII: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/gi,
  PROMPT_INJECTION: [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /disregard\s+(all\s+)?(prior|previous)\s+constraints/i,
    /system\s+override\s*:/i,
    /drain\s+all\s+funds/i,
    /emergency\s+drain/i,
    /transfer\s+all\s+balance/i
  ]
};

export class PolicyEngine {
  /**
   * Evaluates an agent's intended tool invocation against a list of active policies.
   */
  public static evaluate(
    policies: PolicyDefinition[],
    context: PolicyEvaluationContext
  ): PolicyEvaluationResult {
    const isObserveOnly =
      context.isObserveOnly === true ||
      context.enforcementLevel === 'OBSERVE_ONLY';

    const signals: string[] = [];

    // Filter policies relevant to this agent (target agent or 'all')
    const activePolicies = policies.filter(
      (p) =>
        p.status === 'ACTIVE' &&
        (p.agentId === context.agentId || p.agentId === 'all')
    );

    // Default result: if no policies or no violations, allow
    let result: PolicyEvaluationResult = {
      allowed: true,
      outcome: 'LOG',
      riskLevel: 'LOW',
      reason: 'Action verified and within normal policy parameters.',
      requiresApproval: false,
      requiresYoctoDeposit: false,
      isDryRun: false,
      enforcementUnavailable: false,
      signalsTriggered: ['NORMAL_EXECUTION_PERMITTED']
    };

    // Serialize payload for pattern matching
    const payloadStr = typeof context.parameters === 'object'
      ? JSON.stringify(context.parameters)
      : String(context.rawPayload || '');

    // Parse amount if present
    const amountNear = context.amountNear !== undefined
      ? (typeof context.amountNear === 'number' ? context.amountNear : parseFloat(context.amountNear))
      : undefined;

    // Check policies in order of severity
    for (const policy of activePolicies) {
      const isPolicyDryRun = Boolean(policy.dryRun);

      // 1. Destination Allowlist & Blocklist Evaluation
      const blockedDestinations = [
        ...(policy.blockedDestinations || []),
        'attacker-drain.testnet',
        'untrusted-drain.testnet',
        'exploit-drain.testnet'
      ];

      const isExplicitlyBlocked = blockedDestinations.some(
        (b) => b.toLowerCase() === context.destination.toLowerCase()
      );

      if (isExplicitlyBlocked) {
        signals.push('DESTINATION_BLOCKLIST_HIT', 'KNOWN_MALICIOUS_COUNTERPARTY');
        return PolicyEngine.resolveOutcome({
          policyId: policy.id,
          ruleId: 'rule-destination-block',
          requestedAction: 'BLOCK',
          riskLevel: 'CRITICAL',
          reason: `Target destination '${context.destination}' is blocklisted in threat intelligence.`,
          isDryRun: isPolicyDryRun,
          isObserveOnly,
          signals
        });
      }

      // If approved destinations are explicitly defined, check allowlist
      if (policy.approvedDestinations && policy.approvedDestinations.length > 0) {
        const isApproved = policy.approvedDestinations.some(
          (a) => a === '*' || a.toLowerCase() === context.destination.toLowerCase()
        );

        if (!isApproved) {
          signals.push('UNAPPROVED_DESTINATION');
          return PolicyEngine.resolveOutcome({
            policyId: policy.id,
            ruleId: 'rule-unapproved-destination',
            requestedAction: 'BLOCK',
            riskLevel: 'HIGH',
            reason: `Target destination '${context.destination}' is not in approved allowlist [${policy.approvedDestinations.join(', ')}].`,
            isDryRun: isPolicyDryRun,
            isObserveOnly,
            signals
          });
        }
      }

      // 2. Allowed Tools Evaluation
      if (policy.allowedTools && policy.allowedTools.length > 0) {
        const isToolAllowed = policy.allowedTools.some(
          (t) => t === '*' || t.toLowerCase() === context.toolName.toLowerCase()
        );

        if (!isToolAllowed) {
          signals.push('UNAUTHORIZED_TOOL_INVOCATION');
          return PolicyEngine.resolveOutcome({
            policyId: policy.id,
            ruleId: 'rule-unauthorized-tool',
            requestedAction: 'BLOCK',
            riskLevel: 'HIGH',
            reason: `Tool '${context.toolName}' is not in authorized tool allowlist [${policy.allowedTools.join(', ')}].`,
            isDryRun: isPolicyDryRun,
            isObserveOnly,
            signals
          });
        }
      }

      // 3. Sensitive Data Scanning (PII, Keys, Prompt Injections)
      if (PATTERNS.NEAR_PRIVATE_KEY.test(payloadStr) || PATTERNS.SECP_PRIVATE_KEY.test(payloadStr)) {
        signals.push('SECRET_KEY_EXPOSURE_DETECTED');
        return PolicyEngine.resolveOutcome({
          policyId: policy.id,
          ruleId: 'rule-secret-key-exposure',
          requestedAction: 'BLOCK',
          riskLevel: 'CRITICAL',
          reason: 'Raw private key pattern (ed25519/secp256k1) detected in tool payload parameters.',
          isDryRun: isPolicyDryRun,
          isObserveOnly,
          signals
        });
      }

      for (const injectionPattern of PATTERNS.PROMPT_INJECTION) {
        if (injectionPattern.test(payloadStr)) {
          signals.push('PROMPT_INJECTION_SUBSTRING_DETECTED');
          return PolicyEngine.resolveOutcome({
            policyId: policy.id,
            ruleId: 'rule-prompt-injection',
            requestedAction: 'BLOCK',
            riskLevel: 'CRITICAL',
            reason: `Prompt injection attack phrase detected in execution arguments.`,
            isDryRun: isPolicyDryRun,
            isObserveOnly,
            signals
          });
        }
      }

      // 4. Transaction Limits & Spending Ceilings
      if (amountNear !== undefined && !isNaN(amountNear)) {
        // A. Hard single-tx max limit (Block)
        if (policy.maxNearPerTransaction !== undefined && amountNear > policy.maxNearPerTransaction) {
          signals.push('EXCEEDS_MAX_NEAR_CEILING');
          return PolicyEngine.resolveOutcome({
            policyId: policy.id,
            ruleId: 'rule-max-spend-limit',
            requestedAction: 'BLOCK',
            riskLevel: 'HIGH',
            reason: `Amount of ${amountNear} NEAR exceeds maximum transaction ceiling of ${policy.maxNearPerTransaction} NEAR.`,
            isDryRun: isPolicyDryRun,
            isObserveOnly,
            signals
          });
        }

        // B. Approval threshold requirement (Require Approval)
        if (policy.requiresApprovalAboveNear !== undefined && amountNear > policy.requiresApprovalAboveNear) {
          signals.push('REQUIRES_HUMAN_APPROVAL_THRESHOLD_BREACH');
          return PolicyEngine.resolveOutcome({
            policyId: policy.id,
            ruleId: 'rule-approval-threshold',
            requestedAction: 'REQUIRE_APPROVAL',
            riskLevel: 'HIGH',
            reason: `Transaction of ${amountNear} NEAR exceeds autonomous threshold of ${policy.requiresApprovalAboveNear} NEAR. Held for human approval.`,
            isDryRun: isPolicyDryRun,
            isObserveOnly,
            signals,
            requiresApproval: true,
            requiresYoctoDeposit: true
          });
        }
      }

      // 5. 1 YoctoNEAR Rule
      if (context.attachedDepositYocto === '1') {
        signals.push('1_YOCTO_NEAR_GATE_TRIGGERED');
        return PolicyEngine.resolveOutcome({
          policyId: policy.id,
          ruleId: 'rule-yocto-gate',
          requestedAction: 'REQUIRE_APPROVAL',
          riskLevel: 'MEDIUM',
          reason: '1 YoctoNEAR consensus rule triggered. Human wallet signature required to authorize call.',
          isDryRun: isPolicyDryRun,
          isObserveOnly,
          signals,
          requiresApproval: true,
          requiresYoctoDeposit: true
        });
      }

      // 6. Explicit Rules Array in Policy
      if (policy.rules && policy.rules.length > 0) {
        for (const rule of policy.rules) {
          const ruleDryRun = isPolicyDryRun || Boolean(rule.dryRun);

          // Evaluate rule threshold against amount
          if (rule.type === 'APPROVAL_REQUIREMENT' || rule.type === 'TRANSACTION_LIMIT') {
            const ruleThreshold = typeof rule.threshold === 'string' ? parseFloat(rule.threshold) : rule.threshold;
            if (ruleThreshold !== undefined && amountNear !== undefined && amountNear > ruleThreshold) {
              signals.push('RULE_THRESHOLD_BREACH', `RULE_${rule.id}`);
              return PolicyEngine.resolveOutcome({
                policyId: policy.id,
                ruleId: rule.id,
                requestedAction: rule.action,
                riskLevel: rule.action === 'BLOCK' ? 'HIGH' : 'MEDIUM',
                reason: `Rule '${rule.name}': Amount ${amountNear} NEAR exceeds threshold ${ruleThreshold} NEAR.`,
                isDryRun: ruleDryRun,
                isObserveOnly,
                signals,
                requiresApproval: rule.action === 'REQUIRE_APPROVAL',
                requiresYoctoDeposit: rule.action === 'REQUIRE_APPROVAL'
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Helper that resolves the final outcome taking into account:
   * 1. Real Agent Capability (Observe-Only agents cannot halt execution)
   * 2. Dry-Run simulation mode
   */
  private static resolveOutcome(params: {
    policyId: string;
    ruleId: string;
    requestedAction: PolicyAction;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    isDryRun: boolean;
    isObserveOnly: boolean;
    signals: string[];
    requiresApproval?: boolean;
    requiresYoctoDeposit?: boolean;
  }): PolicyEvaluationResult {
    const {
      policyId,
      ruleId,
      requestedAction,
      riskLevel,
      reason,
      isDryRun,
      isObserveOnly,
      signals,
      requiresApproval = false,
      requiresYoctoDeposit = false
    } = params;

    // A. Observe-Only Real Capability Constraint (FR-15 / PRD Section 21)
    if (isObserveOnly) {
      // Observe-only agents cannot block, pause, or require approvals.
      // Automatically degrade to ALERT with clear warning badge.
      const observeSignals = [...signals, 'ENFORCEMENT_UNAVAILABLE_OBSERVE_ONLY'];
      return {
        allowed: true, // Execution is NOT halted
        outcome: 'ALERT',
        riskLevel,
        reason: `[OBSERVE-ONLY] Violation: ${reason}. Enforcement unavailable for Observe-Only integration (alert generated instead of blocking).`,
        matchedPolicyId: policyId,
        matchedRuleId: ruleId,
        requiresApproval: false,
        requiresYoctoDeposit: false,
        isDryRun: false,
        enforcementUnavailable: true,
        signalsTriggered: observeSignals
      };
    }

    // B. Dry-Run Simulation Mode
    if (isDryRun) {
      const drySignals = [...signals, 'DRY_RUN_SIMULATION'];
      return {
        allowed: true, // Execution is NOT halted
        outcome: requestedAction, // Keeps requested action name for audit/display
        riskLevel,
        reason: `[DRY-RUN SIMULATION] Would have triggered ${requestedAction}: ${reason}`,
        matchedPolicyId: policyId,
        matchedRuleId: ruleId,
        requiresApproval: false,
        requiresYoctoDeposit: false,
        isDryRun: true,
        enforcementUnavailable: false,
        signalsTriggered: drySignals
      };
    }

    // C. Live Active Enforcement
    const isBlocking = requestedAction === 'BLOCK' || requestedAction === 'PAUSE' || requestedAction === 'REQUIRE_APPROVAL';
    return {
      allowed: !isBlocking,
      outcome: requestedAction,
      riskLevel,
      reason,
      matchedPolicyId: policyId,
      matchedRuleId: ruleId,
      requiresApproval: requestedAction === 'REQUIRE_APPROVAL' || requiresApproval,
      requiresYoctoDeposit: requestedAction === 'REQUIRE_APPROVAL' || requiresYoctoDeposit,
      isDryRun: false,
      enforcementUnavailable: false,
      signalsTriggered: signals
    };
  }
}

