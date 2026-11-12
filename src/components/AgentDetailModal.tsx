'use client';

import React, { useState } from 'react';
import { Agent, AgentDetailTab, TelemetryEvent, AssessmentFinding } from '@/types';
import { MOCK_ASSESSMENTS, MOCK_TELEMETRY, MOCK_POLICIES } from '@/mocks';
import {
  ShieldAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  UnlinkIcon,
  XIcon
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

  const findings: AssessmentFinding[] =
    realAssessment?.findings || MOCK_ASSESSMENTS[agent.id] || [];

  const allEvents = events && events.length > 0 ? events : MOCK_TELEMETRY;
  const agentEvents = allEvents.filter((e) => e.agentId === agent.id);
  const filteredEvents = agentEvents.filter((ev) => {
    if (activityFilter === 'ALL') return true;
    return ev.enforcementOutcome === activityFilter;
  });

  const agentPolicies = MOCK_POLICIES.filter((p) => p.agentId === agent.id || p.agentId === 'all');
  const isHeartbeatLost = agent.status === 'DISCONNECTED' || agent.id === 'agent-research-lost';

  // Badge styles
  const isEnforcing = agent.enforcementLevel === 'ENFORCING';
  const isApproval = agent.enforcementLevel === 'APPROVAL_REQUIRED';
  const isObserve = agent.enforcementLevel === 'OBSERVE_ONLY';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '860px',
        width: '100%',
        padding: '28px 32px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          title="Close dialog"
        >
          <XIcon size={16} color="#64748b" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', paddingRight: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {agent.name}
              </h2>
              <span style={{
                background: isEnforcing ? '#dcfce7' : isApproval ? '#fef3c7' : isObserve ? '#f1f5f9' : '#fee2e2',
                color: isEnforcing ? '#166534' : isApproval ? '#92400e' : isObserve ? '#475569' : '#b91c1c',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px'
              }}>
                {agent.enforcementLevel}
              </span>
              <span style={{
                background: agent.status === 'ACTIVE' ? '#dcfce7' : agent.status === 'PAUSED' ? '#fef3c7' : '#fee2e2',
                color: agent.status === 'ACTIVE' ? '#166534' : agent.status === 'PAUSED' ? '#92400e' : '#b91c1c',
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px'
              }}>
                Status: {agent.status}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              ID: <span className="font-mono" style={{ color: '#0f172a', fontWeight: 600 }}>{agent.id}</span> &bull; Category: <strong style={{ color: '#0f172a' }}>{agent.category}</strong> &bull; Registered: {agent.createdAt.split('T')[0]}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => onPauseToggle(agent.id)}
              style={{
                padding: '6px 14px',
                background: agent.status === 'PAUSED' ? '#065f46' : '#ffffff',
                border: agent.status === 'PAUSED' ? 'none' : '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: agent.status === 'PAUSED' ? '#ffffff' : '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              title={agent.status === 'PAUSED' ? 'Resume Agent Execution' : 'Pause Agent Execution'}
            >
              {agent.status === 'PAUSED' ? (
                <>
                  <PlayIcon size={13} color="#ffffff" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <PauseIcon size={13} color="#b45309" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmDisconnect(true)}
              style={{
                padding: '6px 14px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              title="Disconnect Agent Connection Token"
            >
              <UnlinkIcon size={13} color="#64748b" />
              <span>Disconnect</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              style={{
                padding: '6px 14px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#b91c1c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="De-register Agent from Workspace"
            >
              <TrashIcon size={13} color="#b91c1c" />
              <span>Remove</span>
            </button>
          </div>
        </div>

        {/* Confirmation Banner for Disconnect */}
        {confirmDisconnect && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ color: '#92400e' }}>
              <strong>Confirm Disconnect:</strong> Active telemetry session will be terminated and gateway proxy routing suspended.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmDisconnect(false)}
                style={{
                  padding: '5px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDisconnect(false);
                  onDisconnect(agent.id);
                }}
                style={{
                  padding: '5px 12px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
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
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px'
          }}>
            <div style={{ color: '#b91c1c' }}>
              <strong>Confirm Removal:</strong> This agent will be de-registered from this workspace and its policies deleted.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                style={{
                  padding: '5px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
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
                style={{
                  padding: '5px 12px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        )}

        {/* Heartbeat Lost Alert */}
        {isHeartbeatLost && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldAlertIcon size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '13px' }}>
                  EDGE STATE ALERT: HEARTBEAT LOST &mdash; TELEMETRY OFFLINE
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>
                  OVERDUE &gt; 120 MIN
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#b91c1c', margin: '4px 0 6px', lineHeight: 1.4 }}>
                Last telemetry ping was received at {formatUtcTime(agent.lastHeartbeat)}. Per PRD Section 10/15, Agent Shield has transitioned this agent to DISCONNECTED to prevent false impressions of continuous protection.
              </p>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Diagnostic Suggestion: Verify container daemon status, check network egress on port 443, or re-generate session token in Settings.
              </div>
            </div>
          </div>
        )}

        {/* 6 Tabs Navigation (Segmented Pill Pattern) */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          gap: '3px',
          marginBottom: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'overview' as AgentDetailTab, label: 'Overview' },
            { id: 'permissions' as AgentDetailTab, label: 'Permissions & Keys' },
            { id: 'coverage' as AgentDetailTab, label: `Coverage (${(agent.coverageGaps || []).length} Gaps)` },
            { id: 'assessment' as AgentDetailTab, label: `Assessment (${findings.length})` },
            { id: 'policies' as AgentDetailTab, label: `Policies (${agentPolicies.length})` },
            { id: 'activity' as AgentDetailTab, label: `Activity (${agentEvents.length})` }
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: isActive ? '#ffffff' : 'transparent',
                  border: isActive ? '1px solid #e2e8f0' : 'none',
                  borderRadius: '6px',
                  color: isActive ? '#065f46' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ============================================================
            TAB 1: OVERVIEW
           ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* Overview Posture Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RISK SCORE POSTURE</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: agent.riskScore < 30 ? '#059669' : agent.riskScore < 60 ? '#d97706' : '#dc2626', margin: '4px 0' }}>
                  {agent.riskScore} <span style={{ fontSize: '13px', fontWeight: 400, color: '#64748b' }}>/ 100</span>
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  {agent.riskScore < 30 ? 'Low Exposure' : agent.riskScore < 60 ? 'Moderate Risk' : 'High Threat Surface'}
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ENFORCEMENT DEPTH</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '6px 0 4px' }}>
                  {agent.enforcementLevel === 'ENFORCING' ? 'Active In-Line Halting' :
                    agent.enforcementLevel === 'APPROVAL_REQUIRED' ? '1 YoctoNEAR Approval' :
                      agent.enforcementLevel === 'OBSERVE_ONLY' ? 'Observe-Only (Passive)' : 'Limited Visibility'}
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  {(agent.tools || []).filter(t => t.isEnforceable).length} of {(agent.tools || []).length} declared tools enforceable
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>HEARTBEAT TELEMETRY</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isHeartbeatLost ? '#dc2626' : '#059669', margin: '6px 0 4px' }}>
                  {isHeartbeatLost ? 'Heartbeat Expired' : 'Healthy Pulse Active'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {formatUtcTime(agent.lastHeartbeat)}
                </div>
              </div>
            </div>

            {/* Declared Scope */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Declared Purpose</label>
              <p style={{ fontSize: '13px', color: '#334155', marginTop: '4px', lineHeight: 1.5 }}>
                {agent.description}
              </p>
            </div>

            {/* Connected Tools List */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Declared Tool Capabilities ({(agent.tools || []).length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {(agent.tools || []).map((tool, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono" style={{ color: '#0f172a', fontWeight: 600, fontSize: '13px' }}>
                          {tool.name}
                        </span>
                        {tool.requiresApproval && (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>
                            1 YOCTO APPROVAL
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {tool.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span style={{
                        background: tool.isMonitored ? '#f1f5f9' : '#fffbeb',
                        color: tool.isMonitored ? '#475569' : '#b45309',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {tool.isMonitored ? 'Monitored' : 'Unmonitored'}
                      </span>
                      <span style={{
                        background: tool.isEnforceable ? '#dcfce7' : '#fef3c7',
                        color: tool.isEnforceable ? '#166534' : '#92400e',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                On-Chain Access Key Scoping &amp; 1 YoctoNEAR Gate
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                Near Protocol Function Call Key restrictions audited for this agent.
              </p>
            </div>

            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>NEAR Account:</span>{' '}
                  <span className="font-mono" style={{ color: '#0f172a', fontWeight: 600 }}>{agent.nearAccountId || 'N/A (Off-chain runner)'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Target Contract:</span>{' '}
                  <span className="font-mono" style={{ color: '#065f46', fontWeight: 600 }}>{agent.targetContractId || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Key Type:</span>{' '}
                  <span style={{ color: '#059669', fontWeight: 600 }}>{agent.hasFunctionCallKey ? 'Scoped Function Call Key' : 'No Key'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Gas &amp; Spending Cap:</span>{' '}
                  <span className="font-mono" style={{ color: '#059669', fontWeight: 700 }}>{agent.fckAllowanceNear || '0'} NEAR</span>
                </div>
              </div>
            </div>

            {/* Allowed Methods on FCK */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>FCK Allowed Methods Whitelist</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {agent.fckAllowedMethods && agent.fckAllowedMethods.length > 0 ? (
                  agent.fckAllowedMethods.map((m, i) => (
                    <span key={i} className="font-mono" style={{ padding: '4px 10px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {m}()
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>No on-chain contract methods declared.</span>
                )}
              </div>
            </div>

            {/* 1 YoctoNEAR Rule Callout */}
            <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>
                <KeyIcon size={16} color="#166534" />
                <span>THE 1 YOCTONEAR HUMAN WALLET APPROVAL GATE</span>
              </div>
              <p style={{ color: '#15803d', margin: 0, lineHeight: 1.5 }}>
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Honest Coverage Transparency &amp; Unmonitored Boundaries
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                Per PRD Section 21 &amp; Section 15: We explicitly enumerate what cannot be protected.
              </p>
            </div>

            {(agent.coverageGaps || []).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <CheckCircleIcon size={28} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ fontSize: '14px', color: '#166534', margin: 0, fontWeight: 700 }}>Full Instrument Coverage Verified</h4>
                <p style={{ fontSize: '12px', color: '#15803d', margin: '4px 0 0' }}>
                  All declared tools and egress routes are monitored and enforceable in-line.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(agent.coverageGaps || []).map((gap, i) => (
                  <div key={i} style={{ padding: '16px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: '#92400e', fontSize: '13px' }}>Unmonitored Area: {gap.area}</strong>
                      <span style={{ background: gap.canBlock ? '#dcfce7' : '#fee2e2', color: gap.canBlock ? '#166534' : '#b91c1c', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                        {gap.canBlock ? 'Can Intercept' : 'CANNOT BLOCK'}
                      </span>
                    </div>
                    <p style={{ color: '#78350f', margin: '4px 0 8px', lineHeight: 1.4 }}>
                      {gap.description}
                    </p>
                    <div style={{ color: '#166534', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
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
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Security Assessment Findings &amp; Risk Audit
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  Categorized vulnerabilities, confidence levels (Verified, Inferred, Untested), and evidence.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunAssessment}
                disabled={isRunningAssessment}
                style={{
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: isRunningAssessment ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isRunningAssessment ? 'Running Safe Probes...' : 'Re-Run Assessment'}
              </button>
            </div>

            {findings.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  No high-risk assessment findings recorded for this agent.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {findings.map((f) => (
                  <div key={f.id} style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: f.severity === 'CRITICAL' ? '4px solid #dc2626' :
                      f.severity === 'HIGH' ? '4px solid #ea580c' :
                        f.severity === 'MEDIUM' ? '4px solid #d97706' : '4px solid #059669',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                          {f.category}
                        </span>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0' }}>
                          {f.title}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          background: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? '#fee2e2' : f.severity === 'MEDIUM' ? '#fef3c7' : '#dcfce7',
                          color: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? '#b91c1c' : f.severity === 'MEDIUM' ? '#92400e' : '#166534',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {f.severity}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                          {f.confidence}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', margin: '8px 0' }}>
                      <strong style={{ color: '#0f172a' }}>Evidence:</strong> {f.evidence}
                    </div>

                    <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 500 }}>
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Active Policy Guardrails &amp; Rule Thresholds
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                Enforceable limits governing spend caps, counterparty signals, and prompt injection filters.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agentPolicies.map((p) => (
                <div key={p.id} style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {p.name}
                      </span>
                      <span style={{
                        background: p.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
                        color: p.status === 'ACTIVE' ? '#166534' : '#92400e',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {p.description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                      Rules ({(p.rules || []).length}): {(p.rules || []).map(r => `${r.name} \u2192 ${r.action}`).join(' | ')}
                    </div>
                  </div>

                  <span style={{
                    background: p.isEnforceable ? '#dcfce7' : '#f1f5f9',
                    color: p.isEnforceable ? '#166534' : '#475569',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px'
                  }}>
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
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Agent Telemetry &amp; Execution Trail
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
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
                      background: activityFilter === outcome ? '#065f46' : '#ffffff',
                      color: activityFilter === outcome ? '#ffffff' : '#64748b',
                      border: '1px solid #e2e8f0',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
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
              <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  No events found matching &ldquo;{activityFilter}&rdquo;.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEvents.map((ev) => (
                  <div key={ev.id} style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: ev.enforcementOutcome === 'BLOCKED' ? '#fee2e2' :
                            ev.enforcementOutcome === 'PAUSED' ? '#fef3c7' :
                              ev.enforcementOutcome === 'FLAGGED' ? '#fffbeb' : '#dcfce7',
                          color: ev.enforcementOutcome === 'BLOCKED' ? '#b91c1c' :
                            ev.enforcementOutcome === 'PAUSED' ? '#92400e' :
                              ev.enforcementOutcome === 'FLAGGED' ? '#b45309' : '#166534',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {ev.enforcementOutcome}
                        </span>
                        <span className="font-mono" style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                          {ev.toolName || ev.actionType}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {ev.payloadSummary}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatUtcTime(ev.timestamp).split(' ')[0]}
                      </div>
                      {onSelectEventForInspect && (
                        <button
                          type="button"
                          onClick={() => onSelectEventForInspect(ev)}
                          style={{
                            marginTop: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            color: '#0f172a',
                            cursor: 'pointer'
                          }}
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
