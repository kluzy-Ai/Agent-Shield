'use client';

import React, { useState } from 'react';
import { ApprovalRequest } from '@/types';
import {
  CheckCircleIcon,
  CloseIcon
} from './icons';

interface ApprovalsQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (id: string, note?: string) => void;
  onDeny: (id: string, note?: string) => void;
}

export function ApprovalsQueue({
  approvals = [],
  onApprove,
  onDeny
}: ApprovalsQueueProps) {
  const [activeTab, setActiveTab] = useState<'WAITING' | 'HISTORY'>('WAITING');
  const [inspectRawAppr, setInspectRawAppr] = useState<ApprovalRequest | null>(null);
  const [denyTargetAppr, setDenyTargetAppr] = useState<ApprovalRequest | null>(null);
  const [denyReason, setDenyReason] = useState('Unverified counterparty receiver.');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');
  const resolvedApprovals = approvals.filter((a) => a.status !== 'PENDING');

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleApprove = (appr: ApprovalRequest) => {
    onApprove(appr.id);
    showToast(`Approved ${appr.methodName} on ${appr.targetContract}. Attached 1 YoctoNEAR deposit.`);
  };

  const handleConfirmDeny = () => {
    if (!denyTargetAppr) return;
    onDeny(denyTargetAppr.id, denyReason);
    showToast(`Dropped transaction ${denyTargetAppr.methodName}. Reason: ${denyReason}`);
    setDenyTargetAppr(null);
  };

  // Helper for parameters display
  const getCardDetails = (appr: ApprovalRequest) => {
    if (appr.id === 'appr-001' || appr.methodName.includes('rebalance')) {
      return {
        targetPool: appr.parameters?.target_pool_id || 'pool-beta.testnet',
        amount: appr.amountNear ? `${appr.amountNear} NEAR` : '1.5 NEAR',
        slippage: appr.parameters?.slippage_tolerance || '0.50%',
        requestedDisplay: '13:21 UTC · 23 min ago',
        timeRemainingText: '27 of 50 min',
        expiresBadge: 'Expires in 27 min',
        progressPct: 54,
        ruleTag: 'Rule r-cp-2'
      };
    }
    return {
      order: appr.parameters?.order_id || 'ORD-2026-9912',
      receiver: appr.parameters?.receiver_id || 'vip-client.testnet',
      amount: appr.amountNear ? `${appr.amountNear} NEAR` : '28.50 NEAR',
      requestedDisplay: '13:18 UTC · 26 min ago',
      timeRemainingText: '23 of 50 min',
      expiresBadge: 'Expires in 23 min',
      progressPct: 46,
      ruleTag: 'Rule r-spend-1'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Top Header Row: Title & Subtitle + View Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Approvals Queue
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Risky actions are held here until a person decides. Nothing runs without your OK.
          </p>
        </div>

        {/* Top Right Tabs */}
        <div style={{
          display: 'inline-flex',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '9999px',
          padding: '3px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('WAITING')}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'WAITING' ? '#065f46' : 'transparent',
              color: activeTab === 'WAITING' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Waiting for you ({pendingApprovals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'HISTORY' ? '#065f46' : 'transparent',
              color: activeTab === 'HISTORY' ? '#ffffff' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            History ({resolvedApprovals.length})
          </button>
        </div>
      </div>

      {/* Action Toast Notification */}
      {toastNotice && (
        <div style={{
          padding: '12px 18px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {toastNotice}
        </div>
      )}

      {/* 2. Educational Callout Banner ("How approval works ?") */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #dcfce7',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#dcfce7',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px'
        }}>
          <CheckCircleIcon size={16} color="#16a34a" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              How approval works
            </span>
            <span style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              background: '#e2e8f0',
              color: '#64748b',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ?
            </span>
          </div>
          <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: 1.5 }}>
            An agent's limited-access key (Function Call Key) cannot attach a deposit. When a rule needs a person, the action is sent with a 1 YoctoNEAR deposit, which only your own full-access wallet key can sign. So the agent cannot approve its own action.
          </p>
        </div>
      </div>

      {/* 3. Pending Approvals Cards Grid */}
      {(activeTab === 'WAITING' || pendingApprovals.length > 0) && (
        <div>
          {pendingApprovals.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <CheckCircleIcon size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                All caught up!
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                No pending actions held for human approval right now.
              </p>
            </div>
          ) : (
            <div className="approvals-cards-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '20px'
            }}>
              {pendingApprovals.map((appr) => {
                const details = getCardDetails(appr);
                const isHighRisk = appr.riskSeverity === 'HIGH' || appr.riskSeverity === 'CRITICAL';

                return (
                  <div
                    key={appr.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '22px 24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: '#fef3c7',
                            color: '#b45309',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '9999px'
                          }}>
                            Waiting for your OK
                          </span>
                          <span style={{
                            background: isHighRisk ? '#b91c1c' : '#fef3c7',
                            color: isHighRisk ? '#ffffff' : '#b45309',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '9999px'
                          }}>
                            {isHighRisk ? 'High risk' : 'Medium risk'}
                          </span>
                        </div>

                        <span style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '3px 10px',
                          borderRadius: '9999px'
                        }}>
                          {details.expiresBadge}
                        </span>
                      </div>

                      {/* Method on Contract Heading */}
                      <h3 style={{ fontSize: '15px', margin: '0 0 4px', lineHeight: 1.35 }}>
                        <span className="font-mono" style={{ color: '#065f46', fontWeight: 700 }}>
                          {appr.methodName}
                        </span>
                        <span style={{ color: '#0f172a', fontWeight: 600 }}> on </span>
                        <span className="font-mono" style={{ color: '#0f172a', fontWeight: 600 }}>
                          {appr.targetContract}
                        </span>
                      </h3>

                      {/* Agent attribution */}
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                        Requested by <strong style={{ color: '#0f172a', fontWeight: 600 }}>{appr.agentName}</strong>
                      </div>

                      {/* Why it was held callout box */}
                      <div style={{
                        background: '#fffbeb',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.45 }}>
                          <strong>Why it was held:</strong> {appr.reason}
                        </div>
                        <div className="font-mono" style={{ color: '#a16207', fontSize: '11px', marginTop: '4px' }}>
                          Rule {appr.policyTriggered || details.ruleTag}
                        </div>
                      </div>

                      {/* Key-Value Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                        {details.targetPool && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ color: '#64748b' }}>Target pool</span>
                            <span className="font-mono" style={{ color: '#0f172a', fontWeight: 500 }}>{details.targetPool}</span>
                          </div>
                        )}

                        {details.order && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ color: '#64748b' }}>Order</span>
                            <span className="font-mono" style={{ color: '#0f172a', fontWeight: 500 }}>{details.order}</span>
                          </div>
                        )}

                        {details.receiver && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ color: '#64748b' }}>Receiver</span>
                            <span className="font-mono" style={{ color: '#0f172a', fontWeight: 500 }}>{details.receiver}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ color: '#64748b' }}>Amount</span>
                          <span className="font-mono" style={{ color: '#0f172a', fontWeight: 700 }}>{details.amount}</span>
                        </div>

                        {details.slippage && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f8fafc' }}>
                            <span style={{ color: '#64748b' }}>Slippage allowed</span>
                            <span className="font-mono" style={{ color: '#0f172a', fontWeight: 500 }}>{details.slippage}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ color: '#64748b' }}>Requested</span>
                          <span style={{ color: '#0f172a' }}>{details.requestedDisplay}</span>
                        </div>
                      </div>

                      {/* Time left bar */}
                      <div style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '6px' }}>
                          <span style={{ color: '#64748b' }}>Time left</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{details.timeRemainingText}</span>
                        </div>
                        <div style={{ background: '#f1f5f9', height: '4px', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${details.progressPct}%`,
                            height: '100%',
                            background: '#f59e0b',
                            borderRadius: '9999px'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setDenyTargetAppr(appr)}
                          style={{
                            flex: 1,
                            padding: '9px 16px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#0f172a',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          Deny
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(appr)}
                          style={{
                            flex: 1,
                            padding: '9px 16px',
                            background: '#065f46',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            boxShadow: '0 1px 2px rgba(6,95,70,0.1)'
                          }}
                        >
                          Approve and sign
                        </button>
                      </div>

                      <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                        Signing attaches 1 YoctoNEAR &bull;{' '}
                        <button
                          type="button"
                          onClick={() => setInspectRawAppr(appr)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#0f172a',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          View raw request
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. History Section (Bottom Card) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '22px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
          History
        </h2>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px' }}>
          Decisions you have already made.
        </p>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '32%' }}>
                  Action
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '22%' }}>
                  Agent
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '15%' }}>
                  Amount
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '18%' }}>
                  Decided
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '13%' }}>
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {resolvedApprovals.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    No decisions recorded in this session yet.
                  </td>
                </tr>
              ) : (
                resolvedApprovals.map((appr) => {
                  const isApproved = appr.status === 'APPROVED';
                  return (
                    <tr key={appr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="font-mono" style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                          {appr.methodName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {appr.parameters?.note || appr.reason || 'Above your limit: needed your OK'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#0f172a', fontWeight: 500 }}>
                        {appr.agentName}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                          {appr.amountNear ? `${appr.amountNear} NEAR` : '3.10 NEAR'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#0f172a' }}>
                        {appr.decisionNote || (isApproved ? 'Approved by you · 10:14 AM' : 'Denied by operator')}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isApproved ? '#10b981' : '#ef4444'
                          }} />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: isApproved ? '#0f172a' : '#ef4444'
                          }}>
                            {isApproved ? 'Allowed after approval' : 'Denied by operator'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Raw Request Inspector Modal */}
      {inspectRawAppr && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                  RAW JSON-RPC REQUEST
                </span>
                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
                  {inspectRawAppr.id.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectRawAppr(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <CloseIcon size={18} color="#64748b" />
              </button>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
              {inspectRawAppr.methodName} on {inspectRawAppr.targetContract}
            </h3>

            <pre className="font-mono" style={{
              background: '#0f172a',
              color: '#f8fafc',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '11px',
              lineHeight: 1.5,
              maxHeight: '260px',
              overflowY: 'auto',
              margin: '0 0 16px'
            }}>
              {JSON.stringify({
                jsonrpc: '2.0',
                id: inspectRawAppr.id,
                method: 'broadcast_tx_commit',
                params: {
                  receiver_id: inspectRawAppr.targetContract,
                  actions: [
                    {
                      FunctionCall: {
                        method_name: inspectRawAppr.methodName,
                        args: Buffer.from(JSON.stringify(inspectRawAppr.parameters)).toString('base64'),
                        gas: 30000000000000,
                        deposit: '1000000000000000000000000' // 1 NEAR in yocto / 1 yocto deposit
                      }
                    }
                  ]
                },
                meta: {
                  agent_id: inspectRawAppr.agentId,
                  agent_name: inspectRawAppr.agentName,
                  policy_gate: '1 YoctoNEAR Human Sign-off Gate',
                  requires_human_signature: true
                }
              }, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setInspectRawAppr(null)}
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectRawAppr;
                  setInspectRawAppr(null);
                  handleApprove(target);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Approve and sign (1 YoctoNEAR)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Deny Confirmation Modal */}
      {denyTargetAppr && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Deny and Drop Transaction
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.45 }}>
              Are you sure you want to drop <strong>{denyTargetAppr.methodName}</strong> requested by <strong>{denyTargetAppr.agentName}</strong>? No tokens or messages will be dispatched.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                Reason for denial (recorded in audit log)
              </label>
              <input
                type="text"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="e.g. Unverified counterparty receiver"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDenyTargetAppr(null)}
                style={{
                  padding: '8px 14px',
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
                onClick={handleConfirmDeny}
                style={{
                  padding: '8px 14px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Confirm Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
