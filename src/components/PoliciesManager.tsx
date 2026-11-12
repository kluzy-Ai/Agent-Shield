'use client';

import React, { useState } from 'react';
import { Policy, PolicyRule, Agent } from '@/types';
import {
  FilterIcon,
  PlusIcon,
  CloseIcon,
  CheckCircleIcon
} from './icons';

interface PoliciesManagerProps {
  policies: Policy[];
  agents: Agent[];
  onToggleDryRun: (policyId: string) => void;
  onUpdatePolicyStatus: (policyId: string, newStatus: 'ACTIVE' | 'DISABLED' | 'TEST_MODE') => void;
  onCreatePolicy: (newPolicy: Policy) => void;
}

export function PoliciesManager({
  policies = [],
  agents = [],
  onToggleDryRun,
  onUpdatePolicyStatus,
  onCreatePolicy
}: PoliciesManagerProps) {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'SPENDING' | 'RECEIVER' | 'DESTINATIONS' | 'APPROVAL' | 'TRICK'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form states for Add Guardrail
  const [addName, setAddName] = useState('');
  const [addAgentId, setAddAgentId] = useState(agents[0]?.id || 'agent-shopbot');
  const [addCategory, setAddCategory] = useState<'SPENDING_LIMIT' | 'COUNTERPARTY_CHECK' | 'DESTINATION_ALLOWLIST' | 'YOCTO_NEAR_GATE' | 'PROMPT_INJECTION'>('SPENDING_LIMIT');
  const [addDesc, setAddDesc] = useState('');
  const [addDestinations, setAddDestinations] = useState('');
  const [addTools, setAddTools] = useState('All tools');
  const [addMaxNear, setAddMaxNear] = useState('20');
  const [addRuleName, setAddRuleName] = useState('Transfer exceeds policy limit');
  const [addRuleCondition, setAddRuleCondition] = useState('args.amount > 20 NEAR');
  const [addRuleAction, setAddRuleAction] = useState<'BLOCK' | 'REQUIRE_APPROVAL' | 'ALERT'>('BLOCK');

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleTestMode = (policy: Policy) => {
    onToggleDryRun(policy.id);
    const willBeTestMode = !policy.dryRun;
    showToast(
      willBeTestMode
        ? `"${policy.name}" switched to Test mode. Actions will not be blocked.`
        : `"${policy.name}" switched to Active enforcement mode.`
    );
  };

  // Helper to map category tag & label
  const getPolicyCategoryMeta = (p: Policy) => {
    switch (p.type) {
      case 'YOCTO_NEAR_GATE':
        return { key: 'APPROVAL', label: 'Extra approval' };
      case 'SPENDING_LIMIT':
        return { key: 'SPENDING', label: 'Spending limit' };
      case 'COUNTERPARTY_CHECK':
        return { key: 'RECEIVER', label: 'Receiver check' };
      case 'DESTINATION_ALLOWLIST':
        return { key: 'DESTINATIONS', label: 'Approved destinations' };
      case 'PROMPT_INJECTION':
        return { key: 'TRICK', label: 'Trick instructions' };
      default:
        return { key: 'ALL', label: 'Custom guardrail' };
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (filterCategory === 'ALL') return true;
    const meta = getPolicyCategoryMeta(p);
    return meta.key === filterCategory;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAgent = agents.find((a) => a.id === addAgentId);
    const isEnforceable = targetAgent ? targetAgent.enforcementLevel !== 'OBSERVE_ONLY' && targetAgent.enforcementLevel !== 'LIMITED_VISIBILITY' : true;

    const newPolicy: Policy = {
      id: `pol-${Date.now().toString().slice(-4)}`,
      agentId: addAgentId,
      name: addName || 'Custom Guardrail',
      description: addDesc || 'Enforces designated policy constraints.',
      type: addCategory,
      status: 'ACTIVE',
      isEnforceable,
      enforcementUnavailableReason: !isEnforceable
        ? `We cannot stop this one. ${targetAgent?.name || 'Agent'} is connected through logs only, so we can alert you but not block its actions.`
        : undefined,
      dryRun: false,
      allowedTools: addTools ? addTools.split(',').map((s) => s.trim()) : ['All tools'],
      approvedDestinations: addDestinations ? addDestinations.split(',').map((s) => s.trim()) : ['Approved list only'],
      dataCategories: ['Customer orders', 'User prompts'],
      maxNearPerTransaction: parseFloat(addMaxNear) || 20,
      dailyNearLimit: (parseFloat(addMaxNear) || 20) * 5,
      requiresApprovalAboveNear: (parseFloat(addMaxNear) || 20) * 0.8,
      rules: [
        {
          id: `r-${Date.now().toString().slice(-4)}`,
          name: addRuleName || 'Custom rule condition',
          condition: addRuleCondition || 'args.amount > 20 NEAR',
          action: addRuleAction,
          dryRun: false
        }
      ]
    };

    onCreatePolicy(newPolicy);
    setIsAddModalOpen(false);
    showToast(`Guardrail "${newPolicy.name}" created and active.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    showToast(`Guardrail "${editingPolicy.name}" updated successfully.`);
    setEditingPolicy(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Title, Filter Icon and + Add Guardrail Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Policy Guardrails
            </h1>
            <FilterIcon size={16} color="#64748b" style={{ marginTop: '2px' }} />
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            The rules that decide what each agent may do. And what happens when it breaks one.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            padding: '8px 16px',
            background: '#065f46',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <PlusIcon size={15} color="#ffffff" strokeWidth={2.2} />
          <span>Add Guardrail</span>
        </button>
      </div>

      {/* Action Toast Feedback */}
      {actionNotice && (
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
          {actionNotice}
        </div>
      )}

      {/* 2. Category Filter Pills Row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px'
      }}>
        <button
          type="button"
          onClick={() => setFilterCategory('ALL')}
          style={{
            padding: '6px 14px',
            border: 'none',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'ALL' ? '#065f46' : '#ffffff',
            color: filterCategory === 'ALL' ? '#ffffff' : '#64748b',
            borderWidth: filterCategory === 'ALL' ? '0' : '1px',
            borderStyle: 'solid',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          All ({policies.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('SPENDING')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'SPENDING' ? '#065f46' : '#ffffff',
            color: filterCategory === 'SPENDING' ? '#ffffff' : '#64748b',
            border: filterCategory === 'SPENDING' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Spending limits
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('RECEIVER')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'RECEIVER' ? '#065f46' : '#ffffff',
            color: filterCategory === 'RECEIVER' ? '#ffffff' : '#64748b',
            border: filterCategory === 'RECEIVER' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Receiver checks
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('DESTINATIONS')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'DESTINATIONS' ? '#065f46' : '#ffffff',
            color: filterCategory === 'DESTINATIONS' ? '#ffffff' : '#64748b',
            border: filterCategory === 'DESTINATIONS' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Approved destinations
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('APPROVAL')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'APPROVAL' ? '#065f46' : '#ffffff',
            color: filterCategory === 'APPROVAL' ? '#ffffff' : '#64748b',
            border: filterCategory === 'APPROVAL' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Extra approval
        </button>

        <button
          type="button"
          onClick={() => setFilterCategory('TRICK')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: filterCategory === 'TRICK' ? '#065f46' : '#ffffff',
            color: filterCategory === 'TRICK' ? '#ffffff' : '#64748b',
            border: filterCategory === 'TRICK' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Trick instructions
        </button>
      </div>

      {/* 3. Guardrails Cards Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredPolicies.map((policy) => {
          const targetAgent = agents.find((a) => a.id === policy.agentId);
          const meta = getPolicyCategoryMeta(policy);
          const isObserveOnly = policy.isEnforceable === false || targetAgent?.enforcementLevel === 'OBSERVE_ONLY';
          const isTestMode = policy.dryRun || policy.status === 'TEST_MODE';

          return (
            <div
              key={policy.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Card Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                    {policy.name}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ color: '#64748b' }}>
                      Agent <strong style={{ color: '#0f172a', fontWeight: 600 }}>{targetAgent?.name || policy.agentId}</strong>
                    </span>
                  </div>
                </div>

                {/* Right Status Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Status Badge */}
                  {isTestMode ? (
                    <span style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '4px'
                    }}>
                      Test mode on
                    </span>
                  ) : isObserveOnly ? (
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '4px'
                    }}>
                      Active &bull; Watch only
                    </span>
                  ) : (
                    <span style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '4px'
                    }}>
                      Active &bull; Can stop actions
                    </span>
                  )}

                  {/* Test mode Switch */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                      Test mode
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isTestMode}
                      onClick={() => handleToggleTestMode(policy)}
                      style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '9999px',
                        background: isTestMode ? '#059669' : '#cbd5e1',
                        border: 'none',
                        position: 'relative',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: isTestMode ? '18px' : '2px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </label>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingPolicy(policy)}
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
                    Edit
                  </button>
                </div>
              </div>

              {/* Observe-Only Limitation Callout Banner */}
              {isObserveOnly && (
                <div style={{
                  background: '#fffbeb',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#92400e',
                  lineHeight: 1.45,
                  margin: '8px 0 12px'
                }}>
                  {policy.enforcementUnavailableReason || 'We cannot stop this one. SupportGenie AI is connected through logs only, so we can alert you but not block its actions.'}
                </div>
              )}

              {/* Description */}
              <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 14px', lineHeight: 1.45 }}>
                {policy.description}
              </p>

              {/* Summary 4-Column Box */}
              <div className="policies-summary-grid" style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                fontSize: '12px'
              }}>
                {/* Specific 4-column layouts tailored to each card */}
                {policy.id === 'pol-spend-cap' ? (
                  <>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Per refund</div>
                      <div style={{ color: '#0f172a', fontWeight: 600 }}>20 NEAR (above this needs your OK)</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Per hour</div>
                      <div className="font-mono" style={{ color: '#0f172a', fontWeight: 600 }}>50 NEAR</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Per day</div>
                      <div className="font-mono" style={{ color: '#0f172a', fontWeight: 600 }}>100 NEAR</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Approved destinations</div>
                      <div style={{ color: '#0f172a' }}>Approved list only</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Allowed tools</div>
                      <div style={{ color: '#0f172a' }}>
                        {policy.allowedTools && policy.allowedTools.length > 0 && !policy.allowedTools.includes('All tools') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {policy.allowedTools.map((t) => (
                              <span key={t} className="font-mono" style={{ fontSize: '11.5px' }}>{t}</span>
                            ))}
                          </div>
                        ) : (
                          <span>All tools</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Approved destinations</div>
                      <div style={{ color: '#0f172a' }}>
                        {policy.approvedDestinations && policy.approvedDestinations.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {policy.approvedDestinations.map((d) => (
                              <span key={d} className="font-mono" style={{ fontSize: '11.5px' }}>{d}</span>
                            ))}
                          </div>
                        ) : (
                          <span>Approved list only</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Limits and approvals</div>
                      <div style={{ color: '#0f172a' }}>
                        {policy.type === 'YOCTO_NEAR_GATE' ? '1 YoctoNEAR rule on' : 'None set'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>Data it may touch</div>
                      <div style={{ color: '#0f172a' }}>
                        {policy.dataCategories && policy.dataCategories.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {policy.dataCategories.map((c) => (
                              <span key={c}>{c}</span>
                            ))}
                          </div>
                        ) : (
                          <span>None set</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Rules Sub-Table */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '6px 0', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '38%' }}>
                        Rule
                      </th>
                      <th style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '44%' }}>
                        Applies when
                      </th>
                      <th style={{ padding: '6px 0', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '18%', textAlign: 'right' }}>
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {policy.rules.map((rule) => {
                      // Result badge logic matching screenshot
                      let resultBadgeText = 'Stop';
                      let resultBg = '#fee2e2';
                      let resultColor = '#b91c1c';
                      let isBordered = false;

                      if (isTestMode) {
                        resultBadgeText = 'Test: would alert';
                        resultBg = '#f1f5f9';
                        resultColor = '#475569';
                        isBordered = true;
                      } else if (isObserveOnly) {
                        resultBadgeText = 'Alert only';
                        resultBg = '#f1f5f9';
                        resultColor = '#475569';
                      } else if (rule.action === 'REQUIRE_APPROVAL') {
                        resultBadgeText = 'Needs your OK';
                        resultBg = '#fef3c7';
                        resultColor = '#b45309';
                      } else if (rule.action === 'BLOCK') {
                        resultBadgeText = 'Stop';
                        resultBg = '#fee2e2';
                        resultColor = '#b91c1c';
                      }

                      // Applies when plain text mapping
                      let appliesWhenText = 'Condition triggered';
                      if (rule.condition.includes('deposit > 0')) {
                        appliesWhenText = 'A deposit is attached or all funds are withdrawn';
                      } else if (rule.condition.includes('amount > 20')) {
                        appliesWhenText = 'One refund is above 20 NEAR';
                      } else if (rule.condition.includes('rolling_1h_sum')) {
                        appliesWhenText = 'Refunds total over 50 NEAR in an hour';
                      } else if (rule.condition.includes('inBlocklist') || rule.condition.includes('inSharedBlocklist')) {
                        appliesWhenText = 'The receiver is on the platform blocked list';
                      } else if (rule.condition.includes('codeChangedRecently')) {
                        appliesWhenText = 'Contract code changed in the last 24 hours';
                      } else if (rule.condition.includes('accountAgeDays')) {
                        appliesWhenText = 'The account is under 1 day old';
                      } else if (rule.condition.includes('destination.domain')) {
                        appliesWhenText = 'The address is not on the approved list';
                      } else if (rule.condition.includes('SYSTEM OVERRIDE')) {
                        appliesWhenText = 'A message contains known override phrases';
                      }

                      return (
                        <tr key={rule.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 0', verticalAlign: 'top' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                              {rule.name}
                            </div>
                            <div className="font-mono" style={{ fontSize: '11px', color: '#64748b' }}>
                              {rule.condition}
                            </div>
                          </td>

                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', verticalAlign: 'top' }}>
                            {appliesWhenText}
                          </td>

                          <td style={{ padding: '10px 0', verticalAlign: 'top', textAlign: 'right' }}>
                            <span style={{
                              background: resultBg,
                              color: resultColor,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: isBordered ? '1px solid #e2e8f0' : 'none',
                              display: 'inline-block'
                            }}>
                              {resultBadgeText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Add Guardrail Modal */}
      {isAddModalOpen && (
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
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Add New Policy Guardrail
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <CloseIcon size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  Guardrail Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Treasury Spending Ceiling"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    Target Agent
                  </label>
                  <select
                    value={addAgentId}
                    onChange={(e) => setAddAgentId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                  >
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>{ag.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                  >
                    <option value="SPENDING_LIMIT">Spending limit</option>
                    <option value="COUNTERPARTY_CHECK">Receiver check</option>
                    <option value="DESTINATION_ALLOWLIST">Approved destinations</option>
                    <option value="YOCTO_NEAR_GATE">Extra approval</option>
                    <option value="PROMPT_INJECTION">Trick instructions</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  Plain English Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Keeps disbursements small. Larger ones need your OK."
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    Approved Destinations (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. store-vault.testnet, dex-router.testnet"
                    value={addDestinations}
                    onChange={(e) => setAddDestinations(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    Threshold Amount (NEAR)
                  </label>
                  <input
                    type="number"
                    value={addMaxNear}
                    onChange={(e) => setAddMaxNear(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Primary Rule Enforcement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Rule Name</label>
                    <input
                      type="text"
                      value={addRuleName}
                      onChange={(e) => setAddRuleName(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', color: '#0f172a' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>Result Outcome</label>
                    <select
                      value={addRuleAction}
                      onChange={(e) => setAddRuleAction(e.target.value as any)}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', color: '#0f172a' }}
                    >
                      <option value="BLOCK">Stop</option>
                      <option value="REQUIRE_APPROVAL">Needs your OK</option>
                      <option value="ALERT">Alert only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#065f46', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Create Guardrail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Guardrail Modal */}
      {editingPolicy && (
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
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Edit Guardrail: {editingPolicy.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <CloseIcon size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  Approved Destinations (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingPolicy.approvedDestinations?.join(', ') || ''}
                  onChange={(e) => setEditingPolicy({
                    ...editingPolicy,
                    approvedDestinations: e.target.value.split(',').map((s) => s.trim())
                  })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', background: '#065f46', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
