'use client';

import React, { useState } from 'react';
import { Agent, AgentDetailTab, TelemetryEvent, AssessmentFinding } from '@/types';
import { MOCK_ASSESSMENTS, MOCK_TELEMETRY, MOCK_POLICIES } from '@/mocks';
import {
  ShieldIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuIcon,
  LockIcon,
  KeyIcon,
  ActivityIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  UnlinkIcon,
  XIcon,
  RefreshCwIcon,
  CheckIcon,
  ServerIcon,
  InfoIcon,
  FileTextIcon
} from './icons';

interface AgentDetailModalProps {
  isOpen: boolean;
  agent: Agent | null;
  onClose: () => void;
  onPauseToggle: (agentId: string) => void;
  onDisconnect: (agentId: string) => void;
  onRemove: (agentId: string) => void;
  onSelectEventForInspect?: (event: TelemetryEvent) => void;
  events?: TelemetryEvent[];
}

function formatUtcTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')} UTC (${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')})`;
  } catch {
    return isoString;
  }
}

export function AgentDetailModal({
  isOpen,
  agent,
  onClose,
  onPauseToggle,
  onDisconnect,
  onRemove,
  onSelectEventForInspect,
  events
}: AgentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<AgentDetailTab>('overview');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [realAssessment, setRealAssessment] = useState<any>(null);
  const [isRunningAssessment, setIsRunningAssessment] = useState(false);

  React.useEffect(() => {
    if (!agent) return;
    let isMounted = true;
    fetch(`/api/assessments?agentId=${agent.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.assessments && data.assessments.length > 0) {
          setRealAssessment(data.assessments[0]);
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [agent?.id]);

  const handleRunAssessment = async () => {
    if (!agent || isRunningAssessment) return;
    setIsRunningAssessment(true);
    try {
      const res = await fetch('/api/assessments/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setRealAssessment(data.report);
        }
      }
    } catch { } finally {
      setIsRunningAssessment(false);
    }
  };

  if (!isOpen || !agent) return null;

  // Retrieve assessment findings for this specific agent (live or mock fallback)
  const findings: AssessmentFinding[] =
    realAssessment?.findings || MOCK_ASSESSMENTS[agent.id] || [];

  // Filter agent-specific activity
  const allEvents = events && events.length > 0 ? events : MOCK_TELEMETRY;
  const agentEvents = allEvents.filter((e) => e.agentId === agent.id);
  const filteredEvents = agentEvents.filter((ev) => {
    if (activityFilter === 'ALL') return true;
    return ev.enforcementOutcome === activityFilter;
  });

  // Filter agent-specific policies
  const agentPolicies = MOCK_POLICIES.filter((p) => p.agentId === agent.id || p.agentId === 'all');

  // Check if heartbeat is lost (> 60 mins)
  const isHeartbeatLost = agent.status === 'DISCONNECTED' || agent.id === 'agent-research-lost';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '860px',
        width: '100%',
        padding: '32px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <XIcon size={20} color="var(--text-muted)" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {agent.name}
              </h2>
              <span className={`badge ${agent.enforcementLevel === 'ENFORCING' ? 'badge-enforcing' :
                agent.enforcementLevel === 'APPROVAL_REQUIRED' ? 'badge-approval' :
                  agent.enforcementLevel === 'OBSERVE_ONLY' ? 'badge-observe' :
                    agent.enforcementLevel === 'LIMITED_VISIBILITY' ? 'badge-limited' : 'badge-blocked'
                }`}>
                {agent.enforcementLevel}
              </span>
              <span className={`badge ${agent.status === 'ACTIVE' ? 'badge-enforcing' :
                agent.status === 'PAUSED' ? 'badge-paused' :
                  agent.status === 'DEGRADED' ? 'badge-limited' : 'badge-blocked'
                }`}>
                Status: {agent.status}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              ID: <span className="font-mono">{agent.id}</span> &bull; Category: <strong>{agent.category}</strong> &bull; Registered: {agent.createdAt.split('T')[0]}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onPauseToggle(agent.id)}
              className={`btn btn-sm ${agent.status === 'PAUSED' ? 'btn-primary' : 'btn-secondary'}`}
              title={agent.status === 'PAUSED' ? 'Resume Agent Execution' : 'Pause Agent Execution'}
            >
              {agent.status === 'PAUSED' ? (
                <>
                  <PlayIcon size={14} color="#ffffff" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <PauseIcon size={14} color="var(--alert-amber)" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              className="btn btn-secondary btn-sm"
              title="Disconnect Agent Connection Token"
            >
              <UnlinkIcon size={14} color="var(--text-muted)" />
              <span>Disconnect</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="btn btn-danger btn-sm"
              title="De-register Agent from Workspace"
            >
              <TrashIcon size={14} color="var(--critical-rose)" />
              <span>Remove</span>
            </button>
          </div>
        </div>

        {/* Confirmation Banner for Disconnect */}
        {confirmDisconnect && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid var(--alert-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ color: '#fbbf24' }}>
              <strong>Confirm Disconnect:</strong> Active telemetry session will be terminated and gateway proxy routing suspended.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmDisconnect(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDisconnect(false);
                  onDisconnect(agent.id);
                }}
                className="btn btn-primary btn-sm"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Banner for Remove */}
        {confirmRemove && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid var(--critical-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ color: '#fb7185' }}>
              <strong>Confirm Removal:</strong> This agent will be de-registered from this workspace and its policies deleted.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmRemove(false);
                  onRemove(agent.id);
                  onClose();
                }}
                className="btn btn-danger btn-sm"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        )}

        {/* PROMINENT EDGE STATE: HEARTBEAT LOST ALERT */}
        {isHeartbeatLost && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid var(--critical-rose)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldAlertIcon size={22} color="var(--critical-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '13px' }}>
                  EDGE STATE ALERT: HEARTBEAT LOST &mdash; TELEMETRY OFFLINE
                </span>
                <span className="badge badge-blocked" style={{ fontSize: '9px' }}>OVERDUE &gt; 120 MIN</span>
              </div>
              <p style={{ fontSize: '12px', color: '#fb7185', margin: '4px 0 6px', lineHeight: 1.4 }}>
                Last telemetry ping was received at {formatUtcTime(agent.lastHeartbeat)}. Per PRD Section 10/15, Agent Shield has transitioned this agent to DISCONNECTED to prevent false impressions of continuous protection.
              </p>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Diagnostic Suggestion: Verify container daemon status, check network egress on port 443, or re-generate session token in Settings.
              </div>
            </div>
          </div>
        )}

        {/* 6 Tabs Navigation */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { id: 'overview' as AgentDetailTab, label: 'Overview' },
            { id: 'permissions' as AgentDetailTab, label: 'Permissions & Keys' },
            { id: 'coverage' as AgentDetailTab, label: `Coverage (${(agent.coverageGaps || []).length} Gaps)` },
            { id: 'assessment' as AgentDetailTab, label: `Assessment (${findings.length})` },
            { id: 'policies' as AgentDetailTab, label: `Policies (${agentPolicies.length})` },
            { id: 'activity' as AgentDetailTab, label: `Activity (${agentEvents.length})` }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid var(--shield-cyan)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--shield-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB 1: OVERVIEW
           ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* Overview Posture Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>RISK SCORE POSTURE</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: agent.riskScore < 30 ? '#34d399' : agent.riskScore < 60 ? '#fbbf24' : '#fb7185', margin: '4px 0' }}>
                  {agent.riskScore} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {agent.riskScore < 30 ? 'Low Exposure' : agent.riskScore < 60 ? 'Moderate Risk' : 'High Threat Surface'}
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ENFORCEMENT DEPTH</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: '6px 0 4px' }}>
                  {agent.enforcementLevel === 'ENFORCING' ? 'Active In-Line Halting' :
                    agent.enforcementLevel === 'APPROVAL_REQUIRED' ? '1 YoctoNEAR Approval' :
                      agent.enforcementLevel === 'OBSERVE_ONLY' ? 'Observe-Only (Passive)' : 'Limited Visibility'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {(agent.tools || []).filter(t => t.isEnforceable).length} of {(agent.tools || []).length} declared tools enforceable
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>HEARTBEAT TELEMETRY</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isHeartbeatLost ? '#fb7185' : '#34d399', margin: '6px 0 4px' }}>
                  {isHeartbeatLost ? 'Heartbeat Expired' : 'Healthy Pulse Active'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatUtcTime(agent.lastHeartbeat)}
                </div>
              </div>
            </div>

            {/* Declared Scope */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Declared Purpose</label>
              <p style={{ fontSize: '13px', color: '#f8fafc', marginTop: '4px', lineHeight: 1.5 }}>
                {agent.description}
              </p>
            </div>

            {/* Connected Tools List */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Declared Tool Capabilities ({(agent.tools || []).length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(agent.tools || []).map((tool, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ color: 'var(--shield-cyan)', fontWeight: 600, fontSize: '13px' }}>
                          {tool.name}
                        </span>
                        {tool.requiresApproval && (
                          <span className="badge badge-approval" style={{ fontSize: '9px' }}>1 YOCTO APPROVAL</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {tool.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${tool.isMonitored ? 'badge-observe' : 'badge-limited'}`} style={{ fontSize: '9px' }}>
                        {tool.isMonitored ? 'Monitored' : 'Unmonitored'}
                      </span>
                      <span className={`badge ${tool.isEnforceable ? 'badge-enforcing' : 'badge-approval'}`} style={{ fontSize: '9px' }}>
                        {tool.isEnforceable ? 'Enforceable' : 'Passive Only'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: PERMISSIONS & ACCESS KEYS
           ============================================================ */}
        {activeTab === 'permissions' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                On-Chain Access Key Scoping &amp; 1 YoctoNEAR Gate
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Near Protocol Function Call Key restrictions audited for this agent.
              </p>
            </div>

            <div style={{ padding: '16px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '20px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>NEAR Account:</span>{' '}
                  <span className="font-mono" style={{ color: '#f8fafc' }}>{agent.nearAccountId || 'N/A (Off-chain runner)'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Contract:</span>{' '}
                  <span className="font-mono" style={{ color: 'var(--shield-cyan)' }}>{agent.targetContractId || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Key Type:</span>{' '}
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{agent.hasFunctionCallKey ? 'Scoped Function Call Key' : 'No Key'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Gas &amp; Spending Cap:</span>{' '}
                  <span className="font-mono" style={{ color: '#34d399' }}>{agent.fckAllowanceNear || '0'} NEAR</span>
                </div>
              </div>
            </div>

            {/* Allowed Methods on FCK */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FCK Allowed Methods Whitelist</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {agent.fckAllowedMethods && agent.fckAllowedMethods.length > 0 ? (
                  agent.fckAllowedMethods.map((m, i) => (
                    <span key={i} className="font-mono" style={{ padding: '4px 10px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--shield-cyan)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                      {m}()
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No on-chain contract methods declared.</span>
                )}
              </div>
            </div>

            {/* 1 YoctoNEAR Rule Callout */}
            <div style={{ padding: '14px 16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.25)', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--shield-cyan)', fontWeight: 700, marginBottom: '4px' }}>
                <KeyIcon size={16} color="var(--shield-cyan)" />
                <span>THE 1 YOCTONEAR HUMAN WALLET APPROVAL GATE</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Under NEAR Protocol consensus, a Function Call Key is cryptographically prohibited from attaching deposits (&gt; 0 yoctoNEAR). When Agent Shield attaches exactly <strong>1 yoctoNEAR (10^-24 NEAR)</strong> to sensitive operations, it physically forces the transaction out of autonomous signing into a required human wallet sign-off.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: COVERAGE & GAPS
           ============================================================ */}
        {activeTab === 'coverage' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Honest Coverage Transparency &amp; Unmonitored Boundaries
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Per PRD Section 21 &amp; Section 15: We explicitly enumerate what cannot be protected.
              </p>
            </div>

            {(agent.coverageGaps || []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <CheckCircleIcon size={28} color="#34d399" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ fontSize: '14px', color: '#f8fafc', margin: 0 }}>Full Instrument Coverage Verified</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  All declared tools and egress routes are monitored and enforceable in-line.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(agent.coverageGaps || []).map((gap, i) => (
                  <div key={i} style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: '#fbbf24', fontSize: '13px' }}>Unmonitored Area: {gap.area}</strong>
                      <span className="badge badge-approval" style={{ fontSize: '9px' }}>
                        {gap.canBlock ? 'Can Intercept' : 'CANNOT BLOCK'}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.4 }}>
                      {gap.description}
                    </p>
                    <div style={{ color: 'var(--shield-cyan)', background: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Remediation:</strong> {gap.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 4: ASSESSMENT FINDINGS
           ============================================================ */}
        {activeTab === 'assessment' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Security Assessment Findings &amp; Risk Audit
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Categorized vulnerabilities, confidence levels (Verified, Inferred, Untested), and evidence.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRunAssessment}
                disabled={isRunningAssessment}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isRunningAssessment ? 'Running Safe Probes...' : 'Re-Run Assessment'}
              </button>
            </div>

            {findings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  No high-risk assessment findings recorded for this agent.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {findings.map((f) => (
                  <div key={f.id} style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: f.severity === 'CRITICAL' ? '3px solid var(--critical-rose)' :
                      f.severity === 'HIGH' ? '3px solid #fb7185' :
                        f.severity === 'MEDIUM' ? '3px solid #fbbf24' : '3px solid #34d399'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {f.category}
                        </span>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', margin: '2px 0 0' }}>
                          {f.title}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className={`badge ${f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'badge-blocked' : f.severity === 'MEDIUM' ? 'badge-approval' : 'badge-enforcing'}`} style={{ fontSize: '9px' }}>
                          {f.severity}
                        </span>
                        <span className="badge badge-observe" style={{ fontSize: '9px' }}>
                          {f.confidence}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '8px 10px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)', margin: '8px 0' }}>
                      <strong>Evidence:</strong> {f.evidence}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--shield-cyan)' }}>
                      <strong>Recommended Fix:</strong> {f.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 5: POLICIES
           ============================================================ */}
        {activeTab === 'policies' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Active Policy Guardrails &amp; Rule Thresholds
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                Enforceable limits governing spend caps, counterparty signals, and prompt injection filters.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agentPolicies.map((p) => (
                <div key={p.id} style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                        {p.name}
                      </span>
                      <span className={`badge ${p.status === 'ACTIVE' ? 'badge-enforcing' : 'badge-approval'}`} style={{ fontSize: '9px' }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.description}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Rules ({(p.rules || []).length}): {(p.rules || []).map(r => `${r.name} &rarr; ${r.action}`).join(' | ')}
                    </div>
                  </div>

                  <span className={`badge ${p.isEnforceable ? 'badge-enforcing' : 'badge-approval'}`} style={{ fontSize: '9px' }}>
                    {p.isEnforceable ? 'Enforcing' : 'Observe-Only'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 6: ACTIVITY TELEMETRY
           ============================================================ */}
        {activeTab === 'activity' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Agent Telemetry &amp; Execution Trail
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Forensic audit trail of tool calls and contract interactions for {agent.name}.
                </p>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {['ALL', 'BLOCKED', 'PAUSED', 'FLAGGED', 'ALLOWED'].map((outcome) => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setActivityFilter(outcome)}
                    style={{
                      background: activityFilter === outcome ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: activityFilter === outcome ? 'var(--shield-cyan)' : 'var(--text-muted)',
                      border: activityFilter === outcome ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {outcome}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  No events found matching &ldquo;{activityFilter}&rdquo;.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEvents.map((ev) => (
                  <div key={ev.id} style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${ev.enforcementOutcome === 'BLOCKED' ? 'badge-blocked' :
                          ev.enforcementOutcome === 'PAUSED' ? 'badge-approval' :
                            ev.enforcementOutcome === 'FLAGGED' ? 'badge-limited' : 'badge-allowed'
                          }`} style={{ fontSize: '9px' }}>
                          {ev.enforcementOutcome}
                        </span>
                        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--shield-cyan)' }}>
                          {ev.toolName || ev.actionType}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {ev.payloadSummary}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatUtcTime(ev.timestamp).split(' ')[0]}
                      </div>
                      {onSelectEventForInspect && (
                        <button
                          type="button"
                          onClick={() => onSelectEventForInspect(ev)}
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '4px', fontSize: '10px', padding: '2px 8px' }}
                        >
                          Inspect Payload
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
