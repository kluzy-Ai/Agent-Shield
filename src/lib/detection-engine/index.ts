/**
 * Agent Shield Detection Rules Engine (FR-06)
 *
 * Evaluates live telemetry events and tool executions across 9 core threat detection rules:
 * 1. unexpected tool use
 * 2. suspicious destination
 * 3. permission violation
 * 4. privilege-escalation attempt
 * 5. unusual data access
 * 6. repeated failures
 * 7. config change
 * 8. high-impact action inconsistent with declared purpose
 * 9. prompt-injection indicators in tool output
 *
 * Every generated alert stores:
 * - whyFlagged: Explicit human-readable reason why the rule fired.
 * - supportingEvidence: Structured evidence payload including fields, thresholds, timestamps, and matched substrings.
 */

import { classifyWithNearAiOrFallback, type LLMClassificationResult } from './llm-classifier.ts';

export interface DetectionAgentContext {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string; // 'FINANCE' | 'ECOMMERCE' | 'SUPPORT' | 'CODING' | 'RESEARCH' | 'WORKFLOW'
  nearAccountId?: string;
  targetContractId?: string;
  hasFunctionCallKey: boolean;
  fckAllowanceNear?: string;
  fckReceiverId?: string;
  fckAllowedMethods?: string[];
  declaredTools?: string[];
  declaredEndpoints?: string[];
  dataAccessScopes?: string[];
  enforcementLevel?: string;
}

export interface DetectionInvocationEvent {
  id?: string;
  toolName?: string;
  actionType: string;
  destination?: string;
  parameters?: Record<string, any>;
  rawPayload?: any;
  toolOutput?: string; // Crucial for Rule 9 (Prompt-injection indicators in tool output)
  amountNear?: number;
  attachedDepositYocto?: string;
  timestamp?: string;
  callerIdentity?: string; // If agent is attempting config modification
  recentHistory?: Array<{
    timestamp: string;
    status: 'FAILED' | 'BLOCKED' | 'ERROR' | 'SUCCESS';
    toolName?: string;
    errorReason?: string;
  }>;
}

export interface DetectionAlertRecord {
  id: string;
  workspaceId: string;
  agentId: string;
  agentName: string;
  ruleId: string;
  ruleName?: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'ACKNOWLEDGED' | 'RESOLVED';
  attackCategory:
    | 'UNEXPECTED_TOOL_USE'
    | 'SUSPICIOUS_DESTINATION'
    | 'PERMISSION_VIOLATION'
    | 'PRIVILEGE_ESCALATION'
    | 'UNUSUAL_DATA_ACCESS'
    | 'REPEATED_FAILURES'
    | 'CONFIG_CHANGE'
    | 'PURPOSE_INCONSISTENCY'
    | 'PROMPT_INJECTION'
    | 'UNENFORCEABLE_ANOMALY';
  whyFlagged: string;
  supportingEvidence: Record<string, any>;
  remediation: string;
  enforcementAction: 'ALLOWED' | 'FLAGGED' | 'PAUSED' | 'BLOCKED';
  isFalsePositive?: boolean;
  falsePositiveReason?: string;
  llmAssessment?: LLMClassificationResult;
  createdAt: string;
}

export interface DetectionEngineResult {
  hasAlert: boolean;
  alerts: DetectionAlertRecord[];
  signals: string[];
}

// Regex patterns for indirect prompt injection in tool output
const TOOL_OUTPUT_INJECTION_PATTERNS = [
  /###\s*instruction/i,
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /system\s+prompt\s+override/i,
  /new\s+system\s+directive/i,
  /disregard\s+(?:all\s+)?prior/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /transfer\s+(?:all|\d+)\s+near\s+to/i,
  /!\[.*?\]\(https?:\/\/(?:attacker|exfil|pastebin|temp-upload)/i,
  /cat\s+\/etc\/passwd/i,
  /print\s*\(\s*os\.environ/i
];

const KNOWN_EXPLOIT_DESTINATION_PATTERNS = [
  'attacker',
  'drain',
  'exploit',
  'untrusted',
  'steal',
  'phish',
  'temp-upload.xyz',
  'pastebin-leak.xyz',
  'webhook.site',
  'evil-drainer.testnet',
  'attacker-drain.testnet',
  'untrusted-drain.testnet'
];

const PRIVILEGE_ESCALATION_OPS = [
  'add_key',
  'add_full_access_key',
  'delete_key',
  'deploy_contract',
  'set_owner',
  'upgrade_code',
  'update_permissions',
  'grant_role',
  'sudo_exec',
  'rotate_master_key'
];

const SENSITIVE_DATA_DOMAINS = [
  'financial_vault',
  'secrets',
  'private_keys',
  'passwords',
  'customer_ssn',
  'credit_cards',
  'api_credentials'
];

export class DetectionEngine {
  /**
   * Evaluates an agent invocation or event against the 9 detection rules.
   */
  public static async evaluate(
    agent: DetectionAgentContext,
    event: DetectionInvocationEvent,
    options: { runLlmClassifier?: boolean } = {}
  ): Promise<DetectionEngineResult> {
    const alerts: DetectionAlertRecord[] = [];
    const signals: string[] = [];
    const now = event.timestamp || new Date().toISOString();

    const toolName = event.toolName || '';
    const destination = (event.destination || '').toLowerCase();
    const actionType = event.actionType || toolName;
    const params = event.parameters || event.rawPayload || {};
    const paramsStr = typeof params === 'object' ? JSON.stringify(params) : String(params);
    const toolOutput = event.toolOutput || '';

    // =========================================================================
    // RULE 1: Unexpected Tool Use (rule-unexpected-tool)
    // =========================================================================
    if (toolName && agent.declaredTools && agent.declaredTools.length > 0) {
      const isDeclared = agent.declaredTools.some(
        (t) => t.toLowerCase() === toolName.toLowerCase() || t === '*'
      );

      if (!isDeclared) {
        signals.push('UNEXPECTED_TOOL_USE');
        alerts.push({
          id: `alt-unexpected-tool-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
          workspaceId: agent.workspaceId,
          agentId: agent.id,
          agentName: agent.name,
          ruleId: 'rule-unexpected-tool',
          ruleName: 'Unexpected Tool Use Detector',
          title: `Unexpected Tool Invocation: '${toolName}'`,
          severity: 'HIGH',
          status: 'OPEN',
          attackCategory: 'UNEXPECTED_TOOL_USE',
          whyFlagged: `Agent '${agent.name}' invoked tool '${toolName}', which is not present in its declared tool manifest [${agent.declaredTools.join(', ')}].`,
          supportingEvidence: {
            invokedTool: toolName,
            declaredTools: agent.declaredTools,
            agentCategory: agent.category,
            parameters: params
          },
          remediation: `Review agent manifest. If '${toolName}' is legitimate, add it to declared tools and apply an allowlist policy. Otherwise, revoke execution credentials.`,
          enforcementAction: 'FLAGGED',
          createdAt: now
        });
      }
    }

    // =========================================================================
    // RULE 2: Suspicious Destination (rule-suspicious-destination)
    // =========================================================================
    if (destination) {
      const isKnownExploit = KNOWN_EXPLOIT_DESTINATION_PATTERNS.some((pat) =>
        destination.includes(pat)
      );
      const isSuspiciousTld =
        destination.endsWith('.xyz') ||
        destination.endsWith('.top') ||
        destination.endsWith('.click') ||
        /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(destination);

      if (isKnownExploit || isSuspiciousTld) {
        signals.push('SUSPICIOUS_DESTINATION_DETECTED');
        alerts.push({
          id: `alt-susp-dest-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
          workspaceId: agent.workspaceId,
          agentId: agent.id,
          agentName: agent.name,
          ruleId: 'rule-suspicious-destination',
          ruleName: 'Suspicious Counterparty & Destination Detector',
          title: `Suspicious Destination Target: '${event.destination}'`,
          severity: 'CRITICAL',
          status: 'OPEN',
          attackCategory: 'SUSPICIOUS_DESTINATION',
          whyFlagged: `Target destination '${event.destination}' matches threat intelligence blocklists or suspicious high-risk egress patterns.`,
          supportingEvidence: {
            destination: event.destination,
            isKnownExploit,
            isSuspiciousTld,
            matchedReason: isKnownExploit
              ? 'Destination flagged in shared community threat intelligence.'
              : 'Destination utilizes high-risk TLD or raw IP address egress.'
          },
          remediation: 'Immediately block counterparty destination at the Gateway and quarantine agent Function Call Keys.',
          enforcementAction: 'BLOCKED',
          createdAt: now
        });
      }
    }

    // =========================================================================
    // RULE 3: Permission Violation (rule-permission-violation)
    // =========================================================================
    if (agent.hasFunctionCallKey) {
      // A. Check receiver mismatch
      if (
        agent.fckReceiverId &&
        destination &&
        destination !== agent.fckReceiverId.toLowerCase() &&
        !destination.includes('rpc.testnet.near.org')
      ) {
        signals.push('FCK_RECEIVER_BOUNDARY_VIOLATION');
        alerts.push({
          id: `alt-perm-recv-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
          workspaceId: agent.workspaceId,
          agentId: agent.id,
          agentName: agent.name,
          ruleId: 'rule-permission-violation',
          ruleName: 'Function Call Key Scope Violation',
          title: `Permission Violation: Destination Exceeds FCK Receiver '${agent.fckReceiverId}'`,
          severity: 'HIGH',
          status: 'OPEN',
          attackCategory: 'PERMISSION_VIOLATION',
          whyFlagged: `Action targets contract '${event.destination}', but agent's Function Call Key is strictly scoped to receiver '${agent.fckReceiverId}'.`,
          supportingEvidence: {
            attemptedDestination: event.destination,
            fckReceiverId: agent.fckReceiverId,
            toolName
          },
          remediation: 'Restrict agent egress strictly to authorized FCK receiver or re-issue scoped credentials.',
          enforcementAction: 'FLAGGED',
          createdAt: now
        });
      }

      // B. Check allowed methods list
      if (
        agent.fckAllowedMethods &&
        agent.fckAllowedMethods.length > 0 &&
        toolName
      ) {
        const isMethodAllowed = agent.fckAllowedMethods.some(
          (m) => m.toLowerCase() === toolName.toLowerCase() || m === '*'
        );
        if (!isMethodAllowed) {
          signals.push('FCK_METHOD_PERMISSION_VIOLATION');
          alerts.push({
            id: `alt-perm-method-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
            workspaceId: agent.workspaceId,
            agentId: agent.id,
            agentName: agent.name,
            ruleId: 'rule-permission-violation',
            ruleName: 'Function Call Key Method Restriction Violation',
            title: `Permission Violation: Method '${toolName}' Not in FCK Scope`,
            severity: 'HIGH',
            status: 'OPEN',
            attackCategory: 'PERMISSION_VIOLATION',
            whyFlagged: `Tool/Method '${toolName}' is not in the permitted methods list [${agent.fckAllowedMethods.join(', ')}] configured for this Function Call Key.`,
            supportingEvidence: {
              attemptedMethod: toolName,
              fckAllowedMethods: agent.fckAllowedMethods
            },
            remediation: 'Revoke and rotate the Function Call Key or update declared allowed methods.',
            enforcementAction: 'FLAGGED',
            createdAt: now
          });
        }
      }
    }

    // =========================================================================
    // RULE 4: Privilege Escalation Attempt (rule-privilege-escalation)
    // =========================================================================
    const combinedActionString = (actionType + ' ' + toolName + ' ' + paramsStr).toLowerCase();
    const isPrivilegeEscalation = PRIVILEGE_ESCALATION_OPS.some((op) =>
      combinedActionString.includes(op)
    );

    if (isPrivilegeEscalation) {
      signals.push('PRIVILEGE_ESCALATION_ATTEMPT_DETECTED');
      alerts.push({
        id: `alt-priv-esc-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
        agentName: agent.name,
        ruleId: 'rule-privilege-escalation',
        ruleName: 'Privilege Escalation Detector',
        title: `Privilege Escalation Attempt: '${toolName || actionType}'`,
        severity: 'CRITICAL',
        status: 'OPEN',
        attackCategory: 'PRIVILEGE_ESCALATION',
        whyFlagged: `Agent attempted a restricted administrative operation designed to alter access keys, modify contract roles, or grant full-access permissions.`,
        supportingEvidence: {
          actionType,
          toolName,
          targetContract: event.destination,
          parameters: params
        },
        remediation: 'Immediately terminate agent session, quarantine access keys, and inspect recent telemetry for signs of prompt injection hijacking.',
        enforcementAction: 'BLOCKED',
        createdAt: now
      });
    }

    // =========================================================================
    // RULE 5: Unusual Data Access (rule-unusual-data-access)
    // =========================================================================
    const accessedDomain = SENSITIVE_DATA_DOMAINS.find((domain) =>
      combinedActionString.includes(domain)
    );
    const isBulkDump =
      /limit\s+(?:10000|\d{5,})/i.test(paramsStr) ||
      /dump_all|export_database|scan_all_keys/i.test(paramsStr);

    if (accessedDomain || isBulkDump) {
      signals.push('UNUSUAL_DATA_ACCESS_DETECTED');
      alerts.push({
        id: `alt-data-access-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
        agentName: agent.name,
        ruleId: 'rule-unusual-data-access',
        ruleName: 'Unusual Data Access & Bulk Exfiltration Detector',
        title: `Unusual Data Access: ${accessedDomain ? `Targeting '${accessedDomain}'` : 'Bulk Data Export Attempt'}`,
        severity: 'HIGH',
        status: 'OPEN',
        attackCategory: 'UNUSUAL_DATA_ACCESS',
        whyFlagged: accessedDomain
          ? `Query accessed restricted high-sensitivity data domain '${accessedDomain}' outside normal operational scope.`
          : `Invocation attempted bulk record export exceeding standard operational volume limits.`,
        supportingEvidence: {
          sensitiveDomain: accessedDomain || 'BULK_RECORD_QUERY',
          isBulkDump,
          querySnippet: paramsStr.substring(0, 200)
        },
        remediation: 'Enforce sensitive data category policies and restrict data query limits.',
        enforcementAction: 'FLAGGED',
        createdAt: now
      });
    }

    // =========================================================================
    // RULE 6: Repeated Failures (rule-repeated-failures)
    // =========================================================================
    if (event.recentHistory && event.recentHistory.length > 0) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentFailures = event.recentHistory.filter((h) => {
        const itemTime = Date.parse(h.timestamp);
        return (
          itemTime >= fiveMinutesAgo &&
          (h.status === 'FAILED' || h.status === 'BLOCKED' || h.status === 'ERROR')
        );
      });

      if (recentFailures.length >= 3) {
        signals.push('REPEATED_FAILURES_THRESHOLD_EXCEEDED');
        alerts.push({
          id: `alt-rep-failures-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
          workspaceId: agent.workspaceId,
          agentId: agent.id,
          agentName: agent.name,
          ruleId: 'rule-repeated-failures',
          ruleName: 'Repeated Failures & Probing Detector',
          title: `Repeated Failures: ${recentFailures.length} Rejections in 5 Minutes`,
          severity: 'HIGH',
          status: 'OPEN',
          attackCategory: 'REPEATED_FAILURES',
          whyFlagged: `Agent experienced ${recentFailures.length} rejected or failed invocations within a 5-minute sliding window, indicating automated trial-and-error probing.`,
          supportingEvidence: {
            failureCount: recentFailures.length,
            threshold: 3,
            timeWindowMinutes: 5,
            recentFailures: recentFailures.map((f) => ({
              time: f.timestamp,
              tool: f.toolName,
              error: f.errorReason
            }))
          },
          remediation: 'Temporarily pause the agent to halt automated retry storms and verify agent instruction context.',
          enforcementAction: 'PAUSED',
          createdAt: now
        });
      }
    }

    // =========================================================================
    // RULE 7: Config Change (rule-config-change)
    // =========================================================================
    const isConfigMutation =
      /update_policy|disable_policy|delete_policy|bypass_shield|disable_guardrail|set_spending_limit/i.test(
        actionType + ' ' + toolName
      );

    if (isConfigMutation) {
      signals.push('UNAUTHORIZED_CONFIG_CHANGE_ATTEMPT');
      alerts.push({
        id: `alt-config-change-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
        agentName: agent.name,
        ruleId: 'rule-config-change',
        ruleName: 'Security Configuration Tamper Detector',
        title: `Unauthorized Config Mutation Attempt: '${toolName || actionType}'`,
        severity: 'CRITICAL',
        status: 'OPEN',
        attackCategory: 'CONFIG_CHANGE',
        whyFlagged: `Agent attempted unauthorized self-modification of active security policies or defensive thresholds.`,
        supportingEvidence: {
          attemptedAction: actionType,
          toolName,
          callerIdentity: event.callerIdentity || agent.id,
          parameters: params
        },
        remediation: 'Lock workspace configuration and revoke any API tokens used in the mutation attempt.',
        enforcementAction: 'BLOCKED',
        createdAt: now
      });
    }

    // =========================================================================
    // RULE 8: High-Impact Action Inconsistent with Declared Purpose (rule-purpose-inconsistency)
    // =========================================================================
    const isHighImpactAction =
      /liquidat|drain|transfer_near|disburse_funds|batch_refund|deploy_contract|drop_database/i.test(
        actionType + ' ' + toolName
      ) || (event.amountNear !== undefined && event.amountNear > 50.0);

    const isSupportOrResearch =
      agent.category === 'SUPPORT' ||
      agent.category === 'RESEARCH' ||
      agent.category === 'WORKFLOW';

    if (isHighImpactAction && isSupportOrResearch) {
      signals.push('PURPOSE_INCONSISTENT_HIGH_IMPACT_ACTION');
      alerts.push({
        id: `alt-purpose-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
        agentName: agent.name,
        ruleId: 'rule-purpose-inconsistency',
        ruleName: 'Declared Purpose Inconsistency Detector',
        title: `Purpose Inconsistency: High-Impact Action for ${agent.category} Agent`,
        severity: 'HIGH',
        status: 'OPEN',
        attackCategory: 'PURPOSE_INCONSISTENCY',
        whyFlagged: `High-impact action '${toolName || actionType}' is inconsistent with declared agent purpose '${agent.description}' (Category: ${agent.category}).`,
        supportingEvidence: {
          declaredCategory: agent.category,
          declaredPurpose: agent.description,
          attemptedAction: toolName || actionType,
          amountNear: event.amountNear
        },
        remediation: 'Verify whether agent has been redirected via indirect prompt injection to execute unauthorized transactions.',
        enforcementAction: 'PAUSED',
        createdAt: now
      });
    }

    // =========================================================================
    // RULE 9: Prompt-Injection Indicators in Tool Output (rule-prompt-injection-output)
    // =========================================================================
    if (toolOutput) {
      for (const pattern of TOOL_OUTPUT_INJECTION_PATTERNS) {
        const match = toolOutput.match(pattern);
        if (match) {
          signals.push('INDIRECT_PROMPT_INJECTION_IN_TOOL_OUTPUT');
          alerts.push({
            id: `alt-inj-out-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
            workspaceId: agent.workspaceId,
            agentId: agent.id,
            agentName: agent.name,
            ruleId: 'rule-prompt-injection-output',
            ruleName: 'Indirect Prompt Injection Output Detector',
            title: `Indirect Prompt Injection Detected in Tool Output`,
            severity: 'CRITICAL',
            status: 'OPEN',
            attackCategory: 'PROMPT_INJECTION',
            whyFlagged: `Tool output from '${toolName || 'external source'}' contains hostile prompt injection indicators designed to hijack downstream agent reasoning.`,
            supportingEvidence: {
              sourceTool: toolName,
              matchedPattern: match[0],
              outputLength: toolOutput.length,
              snippet: toolOutput.substring(0, 150)
            },
            remediation: 'Sanitize tool output stream, strip instruction delimiters, and prevent raw output ingestion into model context.',
            enforcementAction: 'BLOCKED',
            createdAt: now
          });
          break; // Avoid duplicate alerts on multiple pattern matches
        }
      }
    }

    // =========================================================================
    // OPTIONAL: LLM Classifier through NEAR AI Cloud with Deterministic Fallback
    // =========================================================================
    let llmResult: LLMClassificationResult | undefined;
    if (options.runLlmClassifier) {
      llmResult = await classifyWithNearAiOrFallback({
        agentId: agent.id,
        agentName: agent.name,
        toolName,
        actionType,
        destination: event.destination,
        parameters: params,
        toolOutput
      });

      if (llmResult.classifiedAs === 'MALICIOUS') {
        signals.push('LLM_CLASSIFIER_FLAGGED_MALICIOUS');
        // Attach LLM classification to the highest severity alert or create one
        if (alerts.length > 0) {
          alerts[0].llmAssessment = llmResult;
        } else {
          alerts.push({
            id: `alt-llm-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`,
            workspaceId: agent.workspaceId,
            agentId: agent.id,
            agentName: agent.name,
            ruleId: 'rule-llm-classifier',
            ruleName: 'NEAR AI Cloud Security Classifier',
            title: `AI Classifier Flagged Malicious: ${llmResult.threatCategory}`,
            severity: 'HIGH',
            status: 'OPEN',
            attackCategory: 'PROMPT_INJECTION',
            whyFlagged: `NEAR AI Cloud security classifier flagged invocation as MALICIOUS (Confidence: ${llmResult.confidence}): ${llmResult.reasoning}`,
            supportingEvidence: {
              ...llmResult.evidence,
              provider: llmResult.provider,
              isFallback: llmResult.isFallback
            },
            remediation: 'Review execution parameters and inspect agent instruction prompt.',
            enforcementAction: 'FLAGGED',
            llmAssessment: llmResult,
            createdAt: now
          });
        }
      }
    }

    return {
      hasAlert: alerts.length > 0,
      alerts,
      signals
    };
  }
}
