/**
 * Agent Shield Database Schema (Drizzle ORM + SQLite)
 * Zero-setup local persistence for reproducible evaluation.
 */

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
}

export interface AgentRecord {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  category: string;
  enforcementLevel: 'ENFORCING' | 'APPROVAL_REQUIRED' | 'OBSERVE_ONLY' | 'LIMITED_VISIBILITY' | 'DISCONNECTED';
  status: 'ACTIVE' | 'PAUSED' | 'DEGRADED' | 'DISCONNECTED';
  nearAccountId?: string;
  targetContractId?: string;
  hasFunctionCallKey: boolean;
  fckAllowanceNear?: string;
  fckReceiverId?: string;
  fckAllowedMethods?: string; // JSON array of string methods
  riskScore: number;
  lastHeartbeat: string;
  createdAt: string;
}

export interface TelemetryRecord {
  id: string;
  agentId: string;
  timestamp: string;
  eventType: string;
  toolName?: string;
  actionType: string;
  destination: string;
  payloadSummary: string;
  enforcementOutcome: 'ALLOWED' | 'FLAGGED' | 'PAUSED' | 'BLOCKED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  signalsTriggered: string; // JSON array
  counterpartySignals?: string; // JSON object
  rawRedactedPayload?: string;
}

export interface PolicyRecord {
  id: string;
  agentId: string;
  name: string;
  description: string;
  type: string;
  status: 'ACTIVE' | 'DISABLED' | 'TEST_MODE';
  isEnforceable: boolean;
  rules: string; // JSON array
}

export interface IncidentRecord {
  id: string;
  agentId: string;
  title: string;
  severity: string;
  status: 'OPEN' | 'INVESTIGATING' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  summary: string;
  attackCategory: string;
  enforcementAction: string;
  evidence: string; // JSON object
  remediationRecommendation: string;
}
