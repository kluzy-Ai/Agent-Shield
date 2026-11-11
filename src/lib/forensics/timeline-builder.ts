import crypto from 'node:crypto';
import { redactSensitiveText, redactSensitiveObject } from '../redaction/index.ts';

export interface ForensicTimelineStep {
  id: string;
  phase: 'TRIGGER' | 'AGENT_RESPONSE' | 'TOOL_CALL' | 'ATTEMPTED_ACTION' | 'POLICY_DECISION' | 'OUTCOME' | 'INDICATOR';
  label: string;
  timestamp: string;
  description: string;
  payloadSnippet?: string;
  enforcementBadge?: string;
}

export interface BuildTimelineInput {
  incidentId: string;
  agentId: string;
  agentName: string;
  timestamp?: string;
  triggerInput?: string;
  agentResponseText?: string;
  toolName?: string;
  destination?: string;
  actionType?: string;
  parameters?: Record<string, any>;
  attachedNear?: string | number;
  policyOutcome: 'BLOCKED' | 'PAUSED' | 'ALLOWED' | 'FLAGGED';
  policyReason: string;
  matchedRules?: string[];
  threatIndicators?: string[];
  executionDurationMs?: number;
  isDryRun?: boolean;
}

export interface MinimumEvidence {
  evidenceFingerprint: string;
  contentHash: string;
  timestamp: string;
  agentId: string;
  toolName?: string;
  destination?: string;
  sanitizedParameters: Record<string, any>;
  redactedSnippet: string;
  matchedRules: string[];
  threatIndicators: string[];
  storageBytesSaved: number;
}

/**
 * Builds a 7-step forensic sequence reconstruction adhering to PRD Section 11 & ADR-006.
 */
export function buildForensicTimeline(input: BuildTimelineInput): ForensicTimelineStep[] {
  const baseTime = input.timestamp ? new Date(input.timestamp).getTime() : Date.now();
  const formatTime = (offsetMs: number) => new Date(baseTime + offsetMs).toISOString();

  const tool = input.toolName || 'unknown_tool';
  const dest = input.destination || 'unknown_destination';
  const action = input.actionType || tool;

  const steps: ForensicTimelineStep[] = [
    // Step 1: TRIGGER
    {
      id: `${input.incidentId}-step-1`,
      phase: 'TRIGGER',
      label: '1. Ingestion Trigger Event',
      timestamp: formatTime(0),
      description: input.triggerInput
        ? `Inbound prompt or operational event received by agent '${input.agentName}'.`
        : `Agent triggered autonomous workflow execution.`,
      payloadSnippet: input.triggerInput
        ? redactSensitiveText(input.triggerInput).substring(0, 200)
        : `System prompt / autonomous cron event received.`
    },

    // Step 2: AGENT_RESPONSE
    {
      id: `${input.incidentId}-step-2`,
      phase: 'AGENT_RESPONSE',
      label: '2. Agent Decision & Planning',
      timestamp: formatTime(120),
      description: input.agentResponseText
        ? `Agent evaluated context and generated tool invocation plan.`
        : `Autonomous LLM decision formulated tool dispatch for '${tool}'.`,
      payloadSnippet: input.agentResponseText
        ? redactSensitiveText(input.agentResponseText).substring(0, 200)
        : `Formulated call to '${tool}' targeting '${dest}'.`
    },

    // Step 3: TOOL_CALL
    {
      id: `${input.incidentId}-step-3`,
      phase: 'TOOL_CALL',
      label: '3. In-Line Tool Call Intercepted',
      timestamp: formatTime(240),
      description: `@agentshield/sdk intercepted tool '${tool}' before on-chain dispatch.`,
      payloadSnippet: `Target Contract: ${dest} | Method: ${tool}`,
      enforcementBadge: 'INTERCEPTED'
    },

    // Step 4: ATTEMPTED_ACTION
    {
      id: `${input.incidentId}-step-4`,
      phase: 'ATTEMPTED_ACTION',
      label: '4. Attempted Action Parameters',
      timestamp: formatTime(310),
      description: `Targeting '${dest}' with action type '${action}'${input.attachedNear ? ` attaching ${input.attachedNear} NEAR` : ''}.`,
      payloadSnippet: input.parameters
        ? JSON.stringify(redactSensitiveObject(input.parameters)).substring(0, 250)
        : `Action: ${action} | Destination: ${dest}`
    },

    // Step 5: POLICY_DECISION
    {
      id: `${input.incidentId}-step-5`,
      phase: 'POLICY_DECISION',
      label: '5. Guardrail & Detection Policy Decision',
      timestamp: formatTime(420),
      description: input.isDryRun
        ? `[DRY-RUN SIMULATION] Would have evaluated to ${input.policyOutcome}: ${input.policyReason}`
        : `Policy Engine evaluated rules: ${input.policyReason}`,
      payloadSnippet: `Matched Rules: ${(input.matchedRules || ['SECURITY_GUARDRAIL_POLICY']).join(', ')}`,
      enforcementBadge: input.isDryRun ? 'DRY_RUN' : input.policyOutcome
    },

    // Step 6: OUTCOME
    {
      id: `${input.incidentId}-step-6`,
      phase: 'OUTCOME',
      label: '6. Enforcement Outcome Imposed',
      timestamp: formatTime(550),
      description: input.policyOutcome === 'BLOCKED'
        ? `Execution halted. Transaction prevented from reaching NEAR network RPC.`
        : input.policyOutcome === 'PAUSED'
        ? `Held in human approvals queue requiring 1 yoctoNEAR cryptographic authorization.`
        : input.policyOutcome === 'FLAGGED'
        ? `Telemetry alert dispatched; execution proceeded under observe-only logging.`
        : `Transaction permitted within policy boundary.`,
      payloadSnippet: `Final Status: ${input.policyOutcome}${input.executionDurationMs ? ` (${input.executionDurationMs}ms)` : ''}`,
      enforcementBadge: input.policyOutcome
    },

    // Step 7: INDICATOR
    {
      id: `${input.incidentId}-step-7`,
      phase: 'INDICATOR',
      label: '7. Threat Intelligence Indicators',
      timestamp: formatTime(620),
      description: `Security heuristics tagged ${(input.threatIndicators || ['ANOMALOUS_BEHAVIOR']).length} threat indicator(s).`,
      payloadSnippet: (input.threatIndicators || ['ANOMALOUS_BEHAVIOR']).join(' • ')
    }
  ];

  return steps;
}

/**
 * Creates minimum-evidence storage record without persisting raw unbounded payloads.
 */
export function createMinimumEvidence(
  rawInput: any,
  context: {
    agentId: string;
    toolName?: string;
    destination?: string;
    parameters?: Record<string, any>;
    matchedRules?: string[];
    threatIndicators?: string[];
  }
): MinimumEvidence {
  const rawString = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput || {});
  const originalBytes = Buffer.byteLength(rawString, 'utf8');

  // Compute content hash of the raw input
  const contentHash = crypto.createHash('sha256').update(rawString).digest('hex');

  // Redact snippet and enforce maximum length of 256 chars
  const redactedSnippet = redactSensitiveText(rawString).substring(0, 256);

  // Sanitize parameter keys and values
  const sanitizedParameters: Record<string, any> = {};
  if (context.parameters) {
    for (const [k, v] of Object.entries(context.parameters)) {
      if (typeof v === 'string') {
        sanitizedParameters[k] = redactSensitiveText(v).substring(0, 100);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        sanitizedParameters[k] = v;
      } else {
        sanitizedParameters[k] = '[STRUCTURED_VALUE]';
      }
    }
  }

  const storedBytes = Buffer.byteLength(redactedSnippet, 'utf8') + Buffer.byteLength(JSON.stringify(sanitizedParameters), 'utf8');
  const storageBytesSaved = Math.max(0, originalBytes - storedBytes);

  // Cryptographic evidence fingerprint linking contentHash, parameters, and indicators
  const evidenceFingerprint = crypto
    .createHash('sha256')
    .update(`${contentHash}:${context.agentId}:${context.toolName}:${JSON.stringify(sanitizedParameters)}`)
    .digest('hex');

  return {
    evidenceFingerprint,
    contentHash,
    timestamp: new Date().toISOString(),
    agentId: context.agentId,
    toolName: context.toolName,
    destination: context.destination,
    sanitizedParameters,
    redactedSnippet,
    matchedRules: context.matchedRules || [],
    threatIndicators: context.threatIndicators || [],
    storageBytesSaved
  };
}
