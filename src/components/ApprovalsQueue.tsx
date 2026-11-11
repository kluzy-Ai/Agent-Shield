'use client';

import React, { useState } from 'react';
import { ApprovalRequest } from '@/types';
import {
  KeyIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  ZapIcon
} from './icons';

interface ApprovalsQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (id: string, note?: string) => void;
  onDeny: (id: string, note?: string) => void;
}

function formatUtcTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')} UTC`;
  } catch {
    return isoString;
  }
}

function getMinutesRemaining(expiresAt: string): number {
  try {
    const diff = new Date(expiresAt).getTime() - new Date('2026-11-02T19:55:00Z').getTime();
    return Math.max(0, Math.round(diff / 60000));
  } catch {
    return 15;
  }
}

export function ApprovalsQueue({
  approvals,
  onApprove,
  onDeny
}: ApprovalsQueueProps) {
  const [tab, setTab] = useState<'PENDING' | 'RESOLVED'>('PENDING');
  const [denyPromptId, setDenyPromptId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('Unverified counterparty receiver.');

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const handleConfirmDeny = (id: string) => {
    onDeny(id, denyReason);
    setDenyPromptId(null);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyIcon size={22} color="var(--alert-amber)" />
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Cryptographic Human Approvals Queue
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            High-impact agent transactions held under the 1 yoctoNEAR consensus rule, awaiting human wallet authorization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTab('PENDING')}
            className={`btn btn-sm ${tab === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span>Pending Authorization ({pendingApprovals.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('RESOLVED')}
            className={`btn btn-sm ${tab === 'RESOLVED' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <span>Resolved History ({resolvedApprovals.length})</span>
          </button>
        </div>
      </div>

      {/* Explanatory 1 YoctoNEAR Rule Banner */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(6, 182, 212, 0.08)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <KeyIcon size={20} color="var(--shield-cyan)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--shield-cyan)' }}>1 YoctoNEAR Protocol Gate:</strong> On NEAR Protocol, a Function Call Key is cryptographically restricted from attaching deposits &gt; 0 yoctoNEAR. When a policy triggers human approval, Agent Shield holds the RPC request and requires attaching 1 yoctoNEAR (10^-24 NEAR), forcing human wallet signature and physically preventing unauthorized autonomous execution.
        </div>
      </div>

      {/* Deny Reason Prompt Banner */}
      {denyPromptId && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid var(--critical-rose)',
          marginBottom: '20px'
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--critical-rose)', margin: '0 0 6px' }}>
            Deny Proposed Transaction &mdash; {denyPromptId}
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
            Provide operator justification for dropping this proposed agent action:
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="e.g. Unverified destination, excessive slippage..."
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#040816',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#f8fafc',
                fontSize: '12px'
              }}
            />
            <button
              type="button"
              onClick={() => handleConfirmDeny(denyPromptId)}
              className="btn btn-danger btn-sm"
            >
              Drop Action
            </button>
            <button
              type="button"
              onClick={() => setDenyPromptId(null)}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Items List */}
      {tab === 'PENDING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingApprovals.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircleIcon size={32} color="#34d399" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Approvals Queue Clean
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                No agent operations currently held for human authorization.
              </p>
            </div>
          ) : (
            pendingApprovals.map((appr) => {
              const minutesLeft = getMinutesRemaining(appr.expiresAt);
              return (
                <div
                  key={appr.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: appr.riskSeverity === 'CRITICAL' ? '4px solid var(--critical-rose)' :
                                appr.riskSeverity === 'HIGH' ? '4px solid #fb7185' : '4px solid var(--alert-amber)'
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span className="badge badge-approval" style={{ fontSize: '10px' }}>
                          HOLD: AWAITING APPROVAL
                        </span>

                        <span className={`badge ${
                          appr.riskSeverity === 'CRITICAL' || appr.riskSeverity === 'HIGH' ? 'badge-blocked' : 'badge-approval'
                        }`} style={{ fontSize: '9px' }}>
                          {appr.riskSeverity} RISK
                        </span>

                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Origin Agent: <strong style={{ color: '#f8fafc' }}>{appr.agentName}</strong>
                        </span>
                      </div>

                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        <span className="font-mono" style={{ color: 'var(--shield-cyan)' }}>{appr.methodName}</span> on <span className="font-mono">{appr.targetContract}</span>
                      </h3>
                    </div>

                    {/* Expiry Timer Pill */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: minutesLeft < 15 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                      border: minutesLeft < 15 ? '1px solid var(--critical-rose)' : '1px solid rgba(245, 158, 11, 0.3)',
                      color: minutesLeft < 15 ? '#fb7185' : '#fbbf24',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      <ClockIcon size={14} color={minutesLeft < 15 ? '#fb7185' : '#fbbf24'} />
                      <span>Expires in {minutesLeft} minutes</span>
                    </div>
                  </div>

                  {/* Reason & Trigger details */}
                  <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--alert-amber)', fontWeight: 700, marginBottom: '2px' }}>
                      Trigger Reason: {appr.policyTriggered}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {appr.reason}
                    </p>
                  </div>

                  {/* Action Parameters Table */}
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Proposed Action Parameters
                    </span>
                    <pre style={{
                      padding: '10px 12px',
                      background: '#040816',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--shield-cyan)',
                      margin: 0,
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(appr.parameters, null, 2)}
                    </pre>
                  </div>

                  {/* Action Buttons: Sign with 1 yoctoNEAR or Deny */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Requested: {formatUtcTime(appr.requestedAt)}
                    </span>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setDenyPromptId(appr.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        <XIcon size={14} color="var(--critical-rose)" />
                        <span>Deny &amp; Drop Action</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApprove(appr.id)}
                        className="btn btn-primary btn-sm"
                        style={{ boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
                      >
                        <CheckIcon size={14} color="#ffffff" />
                        <span>Sign &amp; Approve (Attach 1 yoctoNEAR)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Resolved History Tab */}
      {tab === 'RESOLVED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {resolvedApprovals.map((appr) => (
            <div
              key={appr.id}
              className="glass-panel"
              style={{
                padding: '18px 20px',
                borderRadius: 'var(--radius-md)',
                borderLeft: appr.status === 'APPROVED' ? '4px solid #10b981' : '4px solid var(--critical-rose)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge ${appr.status === 'APPROVED' ? 'badge-enforcing' : 'badge-blocked'}`}>
                    {appr.status}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    {appr.methodName} on {appr.targetContract}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Decided: {formatUtcTime(appr.decidedAt || appr.requestedAt)}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {appr.decisionNote || 'No decision note recorded.'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
