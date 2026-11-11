'use client';

import React, { useState } from 'react';
import { Policy, PolicyRule, Agent } from '@/types';
import {
  LockIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  AlertTriangleIcon,
  SlidersIcon,
  PlusIcon,
  CheckCircleIcon,
  XIcon,
  ZapIcon,
  KeyIcon,
  ServerIcon
} from './icons';

interface PoliciesManagerProps {
  policies: Policy[];
  agents: Agent[];
  onToggleDryRun: (policyId: string) => void;
  onUpdatePolicyStatus: (policyId: string, newStatus: 'ACTIVE' | 'DISABLED' | 'TEST_MODE') => void;
  onCreatePolicy: (newPolicy: Policy) => void;
}

export function PoliciesManager({
  policies,
  agents,
  onToggleDryRun,
  onUpdatePolicyStatus,
  onCreatePolicy
}: PoliciesManagerProps) {
  const [filterType, setFilterType] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New policy state
  const [newPolicyName, setNewPolicyName] = useState('Custom Tool & Spend Gate');
  const [newPolicyDesc, setNewPolicyDesc] = useState('Strict transaction ceiling and approved destination whitelist.');
  const [newPolicyAgentId, setNewPolicyAgentId] = useState(agents[0]?.id || 'agent-shopbot');
  const [newPolicyOutcome, setNewPolicyOutcome] = useState<'BLOCK' | 'PAUSE' | 'REQUIRE_APPROVAL' | 'ALERT' | 'LOG'>('BLOCK');
  const [newPolicyMaxNear, setNewPolicyMaxNear] = useState('25.00');
  const [newPolicyDryRun, setNewPolicyDryRun] = useState(false);
  const [newAllowedTools, setNewAllowedTools] = useState('issue_refund, query_inventory');
  const [newApprovedDests, setNewApprovedDests] = useState('store-vault.nearhack.testnet');

  const filteredPolicies = policies.filter((p) => {
    if (filterType !== 'ALL' && p.type !== filterType) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAgent = agents.find((a) => a.id === newPolicyAgentId);
    const isEnforceable = targetAgent ? targetAgent.enforcementLevel !== 'OBSERVE_ONLY' && targetAgent.enforcementLevel !== 'LIMITED_VISIBILITY' : true;

    const newPolicy: Policy = {
      id: `pol-${Date.now().toString().slice(-4)}`,
      agentId: newPolicyAgentId,
      name: newPolicyName,
      description: newPolicyDesc,
      type: 'SPENDING_LIMIT',
      status: 'ACTIVE',
      isEnforceable,
      enforcementUnavailableReason: !isEnforceable
        ? `ENFORCEMENT UNAVAILABLE: ${targetAgent?.name || 'Agent'} is connected via observe-only webhooks. Policy outcomes default to ALERT only.`
        : undefined,
      dryRun: newPolicyDryRun,
      allowedTools: newAllowedTools.split(',').map((s) => s.trim()).filter(Boolean),
      approvedDestinations: newApprovedDests.split(',').map((s) => s.trim()).filter(Boolean),
      dataCategories: ['Customer Balances', 'Contract Invocations'],
      maxNearPerTransaction: parseFloat(newPolicyMaxNear) || 25,
      dailyNearLimit: (parseFloat(newPolicyMaxNear) || 25) * 5,
      requiresApprovalAboveNear: (parseFloat(newPolicyMaxNear) || 25) * 0.8,
      rules: [
        {
          id: `r-${Date.now().toString().slice(-4)}`,
          name: `Enforce ${newPolicyOutcome} on violations`,
          condition: `args.amount > ${newPolicyMaxNear} NEAR || destination NOT_IN allowlist`,
          action: newPolicyOutcome,
          dryRun: newPolicyDryRun
        }
      ]
    };

    onCreatePolicy(newPolicy);
    setIsCreateModalOpen(false);
  };

  return (
    <div>
      {/* Header with Title and Create Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockIcon size={22} color="var(--shield-cyan)" />
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Policy Guardrails
              <span title="Real-time evaluation rules enforcing spending ceilings and destination allowlists" style={{ cursor: 'help', fontSize: '11px', color: 'var(--shield-cyan)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>?</span>
              &amp; Enforcement Rules
            </h1>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Configure allowed tools, destination allowlists, transaction caps, 1 yoctoNEAR approval gates, and dry-run simulation toggles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <PlusIcon size={16} color="#ffffff" />
          <span>Add Policy Guardrail</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' }}>
        {['ALL', 'SPENDING_LIMIT', 'COUNTERPARTY_CHECK', 'DESTINATION_ALLOWLIST', 'YOCTO_NEAR_GATE', 'PROMPT_INJECTION'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: filterType === t ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: filterType === t ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
              color: filterType === t ? 'var(--shield-cyan)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Policies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPolicies.map((policy) => {
          const targetAgent = agents.find((a) => a.id === policy.agentId);
          return (
            <div
              key={policy.id}
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                borderLeft: !policy.isEnforceable ? '4px solid var(--alert-amber)' :
                  policy.dryRun ? '4px solid #8b5cf6' : '4px solid #10b981'
              }}
            >
              {/* Top Row: Title, Badges, Dry-Run Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span className="badge badge-observe">{policy.type.replace(/_/g, ' ')}</span>

                    <span className={`badge ${policy.status === 'ACTIVE' ? 'badge-enforcing' :
                        policy.status === 'TEST_MODE' ? 'badge-approval' : 'badge-limited'
                      }`}>
                      {policy.status}
                    </span>

                    {/* Dry Run Badge */}
                    {policy.dryRun ? (
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        DRY-RUN (SIMULATION)
                      </span>
                    ) : (
                      <span className="badge badge-enforcing">
                        ACTIVE ENFORCEMENT
                      </span>
                    )}

                    {/* Target Agent Tag */}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Target Agent: <strong style={{ color: '#f8fafc' }}>{targetAgent?.name || policy.agentId}</strong>
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {policy.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    {policy.description}
                  </p>
                </div>

                {/* Right controls: Dry-Run Toggle & Status selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Dry Run Toggle Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '11px', color: policy.dryRun ? '#c084fc' : 'var(--text-muted)', fontWeight: 600 }}>
                      Dry-Run Mode:
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleDryRun(policy.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: policy.dryRun ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: policy.dryRun ? '1px solid #8b5cf6' : '1px solid var(--border-subtle)',
                        color: policy.dryRun ? '#c084fc' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {policy.dryRun ? 'ON (Simulate)' : 'OFF (Enforce)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* MANDATORY WARNING: CLEAR LABEL WHEN ENFORCEMENT IS UNAVAILABLE */}
              {!policy.isEnforceable && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--alert-amber)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertTriangleIcon size={18} color="var(--alert-amber)" />
                  <div style={{ fontSize: '12px', color: '#fbbf24' }}>
                    <strong>ENFORCEMENT UNAVAILABLE:</strong> {policy.enforcementUnavailableReason || 'Connected agent is observe-only. Configured rule outcomes will default to ALERT instead of halting execution.'}
                  </div>
                </div>
              )}

              {/* Policy Scope Details: Allowed Tools, Approved Destinations, Transaction Limits */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: 'rgba(0, 0, 0, 0.35)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: '12px'
              }}>
                {/* Allowed Tools */}
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    ALLOWED TOOLS:
                  </span>
                  {policy.allowedTools && policy.allowedTools.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {policy.allowedTools.map((t, idx) => (
                        <span key={idx} className="font-mono" style={{ padding: '2px 6px', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.25)', color: 'var(--shield-cyan)', borderRadius: '4px', fontSize: '11px' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>All tools monitored</span>
                  )}
                </div>

                {/* Approved Destinations */}
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    APPROVED DESTINATIONS:
                  </span>
                  {policy.approvedDestinations && policy.approvedDestinations.length > 0 ? (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {policy.approvedDestinations.map((d, idx) => (
                        <span key={idx} className="font-mono" style={{ padding: '2px 6px', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)', color: '#34d399', borderRadius: '4px', fontSize: '11px' }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Strict Allowlist Required</span>
                  )}
                </div>

                {/* Limits & Approval Threshold */}
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    LIMITS &amp; APPROVAL GATES:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#f8fafc' }}>
                    {policy.maxNearPerTransaction && (
                      <div>Max Single: <strong style={{ color: '#34d399' }}>{policy.maxNearPerTransaction} NEAR</strong></div>
                    )}
                    {policy.dailyNearLimit && (
                      <div>Daily Cap: <strong style={{ color: '#34d399' }}>{policy.dailyNearLimit} NEAR</strong></div>
                    )}
                    {policy.requiresApprovalAboveNear && (
                      <div>Approval Above: <strong style={{ color: 'var(--alert-amber)' }}>{policy.requiresApprovalAboveNear} NEAR</strong></div>
                    )}
                    {policy.type === 'YOCTO_NEAR_GATE' && (
                      <div style={{ color: 'var(--shield-cyan)' }}>1 YoctoNEAR Rule Active</div>
                    )}
                  </div>
                </div>

                {/* Data Categories */}
                {Boolean(policy.dataCategories && policy.dataCategories.length > 0) && (
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      DATA CATEGORIES:
                    </span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(policy.dataCategories || []).map((c, idx) => (
                        <span key={idx} style={{ padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rules List with Outcomes */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Configured Rules &amp; Evaluation Outcomes ({(policy.rules || []).length})
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(policy.rules || []).map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                          {rule.name}
                        </div>
                        <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Condition: {rule.condition}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Outcome:</span>
                        <span className={`badge ${rule.action === 'BLOCK' ? 'badge-blocked' :
                            rule.action === 'PAUSE' || rule.action === 'REQUIRE_APPROVAL' ? 'badge-approval' :
                              rule.action === 'ALERT' ? 'badge-limited' : 'badge-allowed'
                          }`} style={{ fontSize: '10px' }}>
                          {policy.dryRun ? `[DRY-RUN] ${rule.action}` : rule.action}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Policy Rule Modal */}
      {isCreateModalOpen && (
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
          zIndex: 250,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Configure New Policy Guardrail
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XIcon size={20} color="var(--text-muted)" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Policy Name
                </label>
                <input
                  type="text"
                  required
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Target Monitored Agent
                </label>
                <select
                  value={newPolicyAgentId}
                  onChange={(e) => setNewPolicyAgentId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#f8fafc', fontSize: '13px' }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.enforcementLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Max Single NEAR Cap
                  </label>
                  <input
                    type="text"
                    value={newPolicyMaxNear}
                    onChange={(e) => setNewPolicyMaxNear(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Outcome on Violation
                  </label>
                  <select
                    value={newPolicyOutcome}
                    onChange={(e) => setNewPolicyOutcome(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: '#f8fafc', fontSize: '13px' }}
                  >
                    <option value="BLOCK">BLOCK (Halt Execution)</option>
                    <option value="REQUIRE_APPROVAL">REQUIRE_APPROVAL (Hold for 1 Yocto)</option>
                    <option value="PAUSE">PAUSE (Queue Suspend)</option>
                    <option value="ALERT">ALERT (Log Alert Only)</option>
                    <option value="LOG">LOG (Silent Record)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Allowed Tools (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newAllowedTools}
                  onChange={(e) => setNewAllowedTools(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--shield-cyan)', fontSize: '12px' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={newPolicyDryRun}
                    onChange={(e) => setNewPolicyDryRun(e.target.checked)}
                  />
                  <span>Enable Dry-Run Mode (Simulate violations without blocking execution)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Policy Guardrail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
