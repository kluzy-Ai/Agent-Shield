export type EnforcementLevel =
  | 'ENFORCING'          // Active in-line gateway or SDK hook; can halt/block actions
  | 'APPROVAL_REQUIRED'  // Enforceable gate holding actions until human cryptographic approval
  | 'OBSERVE_ONLY'       // Ingests telemetry but CANNOT halt or block actions
  | 'LIMITED_VISIBILITY' // Missing critical tool or egress instrumentation
  | 'DISCONNECTED';      // Offline or heartbeat expired

export type EventActionOutcome =
  | 'ALLOWED'
  | 'FLAGGED'
  | 'PAUSED'
  | 'BLOCKED';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AgentCoverageGap {
  area: string;
  description: string;
  canBlock: boolean;
  recommendation: string;
}

export interface AgentToolDeclaration {
  name: string;
  description: string;
  isMonitored: boolean;
  isEnforceable: boolean;
  requiresApproval: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: 'FINANCE' | 'ECOMMERCE' | 'SUPPORT' | 'CODING' | 'RESEARCH' | 'WORKFLOW';
  enforcementLevel: EnforcementLevel;
  status: 'ACTIVE' | 'PAUSED' | 'DEGRADED' | 'DISCONNECTED';
  nearAccountId?: string;
  targetContractId?: string;
  hasFunctionCallKey: boolean;
  fckAllowanceNear?: string;
  fckReceiverId?: string;
  fckAllowedMethods?: string[];
  riskScore: number; // 0 - 100 (0 = safe, 100 = critical risk)
  lastHeartbeat: string;
  createdAt: string;
  tools: AgentToolDeclaration[];
  coverageGaps: AgentCoverageGap[];
}

export interface CounterpartySignals {
  accountAgeDays?: number;
  isContract: boolean;
  codeHash?: string;
  codeChangedRecently?: boolean;
  priorInteractionsCount: number;
  inSharedBlocklist: boolean;
  blocklistReason?: string;
}

export interface TelemetryEvent {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  eventType: 'TOOL_CALL' | 'CONTRACT_CALL' | 'OUTBOUND_EGRESS' | 'AUTH_CHECK' | 'HEARTBEAT';
  toolName?: string;
  actionType: string;
  destination: string;
  payloadSummary: string;
  enforcementOutcome: EventActionOutcome;
  riskLevel: SeverityLevel;
  signalsTriggered: string[];
  counterpartySignals?: CounterpartySignals;
  rawRedactedPayload?: string;
  isSimulatedVector?: boolean;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  threshold?: string | number;
  action: 'LOG' | 'ALERT' | 'REQUIRE_APPROVAL' | 'PAUSE' | 'BLOCK';
  dryRun?: boolean; // Dry-run simulation mode
}

export interface Policy {
  id: string;
  agentId: string;
  name: string;
  description: string;
  type: 'SPENDING_LIMIT' | 'COUNTERPARTY_CHECK' | 'DESTINATION_ALLOWLIST' | 'PROMPT_INJECTION' | 'YOCTO_NEAR_GATE' | 'TOOL_ALLOWLIST';
  status: 'ACTIVE' | 'DISABLED' | 'TEST_MODE';
  isEnforceable: boolean;
  enforcementUnavailableReason?: string;
  dryRun: boolean; // Dry-run toggle: logs/alerts without halting execution
  allowedTools?: string[];
  approvedDestinations?: string[];
  dataCategories?: string[]; // e.g. "Customer PII", "Financial Vault", "API Secrets"
  maxNearPerTransaction?: number;
  dailyNearLimit?: number;
  requiresApprovalAboveNear?: number;
  rules: PolicyRule[];
  lastTriggered?: string;
}

export interface IncidentTimelineStep {
  id: string;
  phase:
  | 'TRIGGER'
  | 'AGENT_RESPONSE'
  | 'TOOL_CALL'
  | 'ATTEMPTED_ACTION'
  | 'POLICY_DECISION'
  | 'OUTCOME'
  | 'INDICATOR';
  label: string;
  timestamp: string;
  description: string;
  payloadSnippet?: string;
  enforcementBadge?: string;
}

export interface IncidentOperatorNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
}

export interface IncidentAlert {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  severity: SeverityLevel;
  status: 'OPEN' | 'INVESTIGATING' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  summary: string;
  attackCategory:
  | 'PROMPT_INJECTION'
  | 'UNAUTHORIZED_SPEND'
  | 'SUSPICIOUS_COUNTERPARTY'
  | 'DATA_EXFILTRATION'
  | 'UNENFORCEABLE_ANOMALY';
  enforcementAction: EventActionOutcome;
  evidence: {
    eventIds: string[];
    destination?: string;
    triggerInput?: string;
    observedBehavior: string;
    actualIntervention: string;
    ruleMatched?: string;
    counterpartyIndicators?: string[];
    llmAssessment?: any;
    [key: string]: any;
  };
  remediationRecommendation: string;
  timeline?: IncidentTimelineStep[];
  operatorNotes?: IncidentOperatorNote[];
  redactedPayload?: string;
  isFalsePositive?: boolean;
  falsePositiveReason?: string;
  isSimulatedVector?: boolean;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  targetContract: string;
  methodName: string;
  amountNear?: string;
  parameters: Record<string, any>;
  riskSeverity: SeverityLevel;
  reason: string;
  policyTriggered: string;
  requiresYoctoDeposit: boolean; // Enforces 1 yoctoNEAR cryptographic human sign-off
  requestedAt: string;
  expiresAt: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  decisionNote?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface AuditLogEntry {
  sequenceNumber: number;
  id: string;
  timestamp: string;
  actor: string;
  actionType:
  | 'POLICY_EVALUATION'
  | 'TRANSACTION_BLOCKED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'ALERT_ACKNOWLEDGED'
  | 'FALSE_POSITIVE_FLAGGED'
  | 'NOTE_ADDED'
  | 'POLICY_UPDATED'
  | 'KEY_ROTATION';
  resourceId: string;
  summary: string;
  details: Record<string, any>;
  prevHash: string;
  entryHash: string; // SHA-256 hash linking to prevHash
  isVerified?: boolean;
}

export type ThreatReportCategory =
  | 'PROMPT_INJECTION'
  | 'AGENT_TOOL_HIJACKING'
  | 'UNAUTHORIZED_TOOL_USE'
  | 'DATA_LEAKAGE'
  | 'CREDENTIAL_EXPOSURE'
  | 'PRIVILEGE_ESCALATION'
  | 'MALICIOUS_TOOL_PLUGIN'
  | 'UNSAFE_TRANSACTION'
  | 'IDENTITY_IMPERSONATION'
  | 'DENIAL_OF_SERVICE'
  | 'SUPPLY_CHAIN_COMPROMISE'
  | 'UNEXPECTED_AUTONOMOUS_BEHAVIOR';

export interface ThreatReport {
  id: string;
  title: string;
  reporterType: 'SECURITY_RESEARCHER' | 'DEVELOPER' | 'OPERATOR' | 'AGENT_SHIELD_AUTOMATED';
  reporterName?: string;
  reporterEmail?: string;
  agentPlatform: string;
  threatCategory: ThreatReportCategory | string;
  severity: SeverityLevel;
  description: string;
  impactSummary?: string;
  incidentTimestamp?: string;
  defensiveEvidence?: string;
  evidenceSnippet?: string;
  targetAddressOrDomain?: string;
  mitigationApplied: string;
  isPublicConsented: boolean; // Consent choice: private vs published community report
  moderationStatus: 'PENDING_REVIEW' | 'VERIFIED_PUBLISHED' | 'REJECTED';
  isConfirmed?: boolean; // Platform owner confirmed badge
  isHidden?: boolean; // Auto-hidden after 3 flags or taken down
  flagCount?: number;
  takedownReason?: string;
  takedownAt?: string;
  createdAt: string;
  triageSeverity?: SeverityLevel;
  triageConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  moderationNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedAt?: string;
  duplicateOfId?: string;
  helpfulCount?: number;
  tags?: string[];
  yaraOrSigmaRule?: string;
}

export interface DetectionRule {
  id: string;
  title: string;
  category: string;
  format: 'AGENT_SHIELD_DSL' | 'SIGMA' | 'YARA';
  description: string;
  severity: SeverityLevel;
  targetPlatform: string;
  ruleContent: string;
  author: string;
  downloadsCount: number;
  updatedAt: string;
}

export interface DefensivePlaybookStep {
  id: string;
  phase: 'IDENTIFY' | 'CONTAIN' | 'ERADICATE' | 'RECOVER' | 'POST_INCIDENT';
  title: string;
  instruction: string;
  actionSnippet?: string;
  requiresConsensus?: boolean;
  toolRecommendation?: string;
}

export interface DefensivePlaybook {
  id: string;
  title: string;
  threatVector: string;
  estimatedSla: string;
  severity: SeverityLevel;
  summary: string;
  targetAgentTypes: string[];
  steps: DefensivePlaybookStep[];
}

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER' | 'SECURITY_ADMIN' | 'OPERATOR' | 'AUDITOR';
  joinedAt: string;
  status: 'ACTIVE' | 'INVITED';
}

export interface ApiCredential {
  id: string;
  name: string;
  maskedKey: string;
  scope: 'READ_ONLY' | 'TELEMETRY_WRITE' | 'FULL_ENFORCEMENT';
  createdAt: string;
  lastUsedAt: string;
}

export interface WorkspaceSettings {
  users: WorkspaceUser[];
  notifications: {
    slackEnabled: boolean;
    slackWebhookUrl: string;
    discordEnabled: boolean;
    discordWebhookUrl: string;
    pagerDutyEnabled: boolean;
    pagerDutyIntegrationKey: string;
    telegramEnabled: boolean;
    telegramChatId: string;
    emailAlerts: 'ALL_SEVERITIES' | 'HIGH_AND_CRITICAL' | 'CRITICAL_ONLY' | 'MUTED';
  };
  retentionDays: 30 | 90 | 180 | 365 | -1; // -1 = Perpetual
  privacy: {
    autoScrubPii: boolean;
    stripPromptTokens: boolean;
    redactFinancialValues: boolean;
    telemetryExportFormat: 'JSON' | 'CSV';
  };
  apiCredentials: ApiCredential[];
  billingTier: {
    currentTier: 'COMMUNITY_HACKATHON' | 'PRO' | 'ENTERPRISE';
    nearBalanceAttached?: string;
    quotaMonthlyEvents: number;
    usedEventsThisMonth: number;
  };
}

export interface Workspace {
  id: string;
  name: string;
  environment: 'PRODUCTION' | 'STAGING' | 'SANDBOX';
  createdAt: string;
}

export type UserPersona =
  | 'INDIVIDUAL'
  | 'ECOMMERCE_OPERATOR'
  | 'AGENT_DEVELOPER'
  | 'SECURITY_TEAM'
  | 'RESEARCHER';

export interface AssessmentFinding {
  id: string;
  category: string;
  title: string;
  severity: SeverityLevel;
  confidence: 'VERIFIED' | 'INFERRED' | 'UNTESTED';
  evidence: string;
  recommendation: string;
}

export type AgentDetailTab =
  | 'overview'
  | 'permissions'
  | 'coverage'
  | 'assessment'
  | 'policies'
  | 'activity';

export interface AgentFilterState {
  workspace: string;
  search: string;
  environment: string;
  severity: string;
  dateRange: string;
}


