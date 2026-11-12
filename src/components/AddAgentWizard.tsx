'use client';

import React, { useState } from 'react';
import { Agent, EnforcementLevel } from '@/types';
import {
  CheckCircleIcon,
  CloseIcon,
  KeyIcon,
  CopyIcon
} from './icons';

interface AddAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentAdded: (newAgent: Agent) => void;
}

export function AddAgentWizard({ isOpen, onClose, onAgentAdded }: AddAgentWizardProps) {
  // Step 1 to 5, plus Step 6: 'SUCCESS' (Agent added)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1: How to connect
  const [method, setMethod] = useState<'SDK' | 'PROXY' | 'LOGS'>('SDK');

  // Step 2: About your agent
  const [name, setName] = useState('Refund Sentinel Bot');
  const [category, setCategory] = useState('E-commerce and refunds');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'TESTING'>('PRODUCTION');
  const [description, setDescription] = useState('Handles customer returns for a testnet storefront.');
  const [nearAccountId, setNearAccountId] = useState('refund-bot.testnet');
  const [contractId, setContractId] = useState('store-vault.testnet');

  // Step 3: Give it only what it needs
  const [actionTags, setActionTags] = useState<string[]>(['issue_refund', 'query_order', 'check_stock']);
  const [newTagInput, setNewTagInput] = useState('');
  const [gasBudget, setGasBudget] = useState('20.00');
  const [extraApproval, setExtraApproval] = useState(true);
  const [publicKey, setPublicKey] = useState('ed25519:6EF2XqK_');

  // Step 4: Test the connection
  const [testStage, setTestStage] = useState<'INITIAL' | 'RUNNING' | 'COMPLETE'>('INITIAL');
  const [testItems, setTestItems] = useState([
    { id: 1, label: 'Agent Shield can be reached', status: 'Passed' },
    { id: 2, label: 'Agent key accepted', status: 'Passed' },
    { id: 3, label: '"Still online" signal received', status: 'Waiting...' },
    { id: 4, label: 'Key permissions checked on NEAR testnet', status: 'Not started' }
  ]);

  // Step 6: Agent added
  const [copiedKey, setCopiedKey] = useState(false);
  const rawKey = 'ash_live_8f3Kq2Zr7WmXc4Nb1VdYt6Lp';

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (!isOpen) return null;

  // Add tag in Step 3
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const val = newTagInput.trim().replace(/,/g, '');
      if (!actionTags.includes(val)) {
        setActionTags([...actionTags, val]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setActionTags(actionTags.filter((t) => t !== tag));
  };

  // Run test in Step 4
  const handleRunTestAgain = () => {
    setTestStage('RUNNING');
    setTestItems([
      { id: 1, label: 'Agent Shield can be reached', status: 'Running...' },
      { id: 2, label: 'Agent key accepted', status: 'Waiting...' },
      { id: 3, label: '"Still online" signal received', status: 'Waiting...' },
      { id: 4, label: 'Key permissions checked on NEAR testnet', status: 'Not started' }
    ]);

    setTimeout(() => {
      setTestItems((prev) => [
        { ...prev[0], status: 'Passed' },
        { ...prev[1], status: 'Passed' },
        prev[2],
        prev[3]
      ]);
    }, 600);

    setTimeout(() => {
      setTestItems((prev) => [
        prev[0],
        prev[1],
        { ...prev[2], status: 'Passed' },
        { ...prev[3], status: 'Passed' }
      ]);
      setTestStage('COMPLETE');
      showToast('All connection & key checks passed.');
    }, 1200);
  };

  // Add agent submit from Step 5 -> Step 6
  const handleAddAgentFinal = () => {
    const enforcementLevel: EnforcementLevel =
      method === 'SDK' ? 'ENFORCING' : method === 'PROXY' ? 'APPROVAL_REQUIRED' : 'OBSERVE_ONLY';

    const newAgent: Agent = {
      id: `agent-${Date.now().toString().slice(-4)}`,
      name,
      description,
      category: 'ECOMMERCE',
      enforcementLevel,
      status: 'ACTIVE',
      nearAccountId,
      targetContractId: contractId,
      hasFunctionCallKey: true,
      fckAllowanceNear: gasBudget,
      fckReceiverId: contractId,
      fckAllowedMethods: actionTags,
      riskScore: 22,
      lastHeartbeat: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tools: actionTags.map((t) => ({
        name: t,
        description: `Scoped action on ${contractId}`,
        isMonitored: true,
        isEnforceable: method !== 'LOGS',
        requiresApproval: extraApproval && t.includes('refund')
      })),
      coverageGaps:
        method === 'LOGS'
          ? [
              {
                area: 'Observe-Only Limitation',
                description: 'Webhook logs cannot halt transactions in-line.',
                canBlock: false,
                recommendation: 'Upgrade to Agent Shield SDK.'
              }
            ]
          : []
    };

    onAgentAdded(newAgent);
    setStep(6);
  };

  const handleCopyKey = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawKey).catch(() => {});
    }
    setCopiedKey(true);
    showToast('Connection key copied to clipboard.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleResetForAnother = () => {
    setStep(1);
    setName('New Agent');
    setDescription('Autonomous assistant');
    setNearAccountId('new-agent.testnet');
  };

  const stepTitles: Record<number, string> = {
    1: 'How to connect',
    2: 'About your agent',
    3: 'Give it only what it needs',
    4: 'Test the connection',
    5: 'Safety check'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: '#065f46',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircleIcon size={16} color="#ffffff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Wizard Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: step === 6 ? '6px' : '10px'
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: step === 6 ? '#047857' : '#0f172a',
              margin: 0
            }}
          >
            {step === 6 ? 'Agent added' : 'Add an agent'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wizard"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* 5-Step Segmented Progress Bar (Steps 1 to 5) */}
        {step <= 5 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  onClick={() => setStep(s as any)}
                  title={`Jump to step ${s}`}
                  style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: s <= step ? '#065f46' : '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Step {step} of 5 &middot; {stepTitles[step]}
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 1: Step 1 of 5 · How to connect
           ================================================================== */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '14px' }}>
              How should Agent Shield connect to your agent?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* Option 1: Code connection (SDK) */}
              <div
                onClick={() => setMethod('SDK')}
                style={{
                  border: method === 'SDK' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: method === 'SDK' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Custom Radio Button */}
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: method === 'SDK' ? '5px solid #059669' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Code connection (SDK)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}
                    >
                      Recommended
                    </span>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}
                    >
                      Can stop actions
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '26px' }}>
                  Add a few lines to your agent's code. Each action is checked before it runs.
                </div>
              </div>

              {/* Option 2: Proxy (no code changes) */}
              <div
                onClick={() => setMethod('PROXY')}
                style={{
                  border: method === 'PROXY' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: method === 'PROXY' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: method === 'PROXY' ? '5px solid #059669' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Proxy (no code changes)
                    </span>
                  </div>

                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    Can stop actions
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '26px' }}>
                  Point your agent's NEAR connection at Agent Shield. We check calls on the way through.
                </div>
              </div>

              {/* Option 3: Logs only */}
              <div
                onClick={() => setMethod('LOGS')}
                style={{
                  border: method === 'LOGS' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                  background: method === 'LOGS' ? '#f0fdf4' : '#ffffff',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: method === 'LOGS' ? '5px solid #059669' : '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Logs only
                    </span>
                  </div>

                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    Watch only
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '26px' }}>
                  Send logs from LangChain or another service. We alert you, but we cannot stop actions.
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 2: Step 2 of 5 · About your agent
           ================================================================== */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {/* Agent name & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Agent name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="E-commerce and refunds">E-commerce and refunds &or;</option>
                    <option value="DeFi and trading">DeFi and trading</option>
                    <option value="Customer support">Customer support</option>
                    <option value="Research & intelligence">Research &amp; intelligence</option>
                  </select>
                </div>
              </div>

              {/* Where does it run? */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Where does it run?
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  {[
                    { id: 'PRODUCTION', label: 'Production' },
                    { id: 'STAGING', label: 'Staging' },
                    { id: 'TESTING', label: 'Testing' }
                  ].map((env) => {
                    const isSelected = environment === env.id;
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => setEnvironment(env.id as any)}
                        style={{
                          padding: '8px 12px',
                          background: isSelected ? '#065f46' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          border: 'none',
                          borderRight: '1px solid #e2e8f0',
                          fontSize: '13px',
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {env.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What does it do? */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  What does it do?
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Agent NEAR account & Contract it works with */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Agent NEAR account *
                  </label>
                  <input
                    type="text"
                    value={nearAccountId}
                    onChange={(e) => setNearAccountId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Contract it works with *
                  </label>
                  <input
                    type="text"
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 3: Step 3 of 5 · Give it only what it needs
           ================================================================== */}
        {step === 3 && (
          <div>
            {/* Mint Security Notice Box */}
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#065f46',
                lineHeight: 1.5,
                marginBottom: '16px'
              }}
            >
              We never ask for private keys or seed phrases. Give us only the agent's limited-access key (the Function Call Key's public part), or use a one-time pairing code.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {/* Actions the key may call */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Actions the key may call
                </label>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {actionTags.map((t) => (
                    <span
                      key={t}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Type & press Enter..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '12px',
                      flex: '1 1 120px',
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Any other action is rejected by NEAR itself.
                </div>
              </div>

              {/* Gas budget & Extra approval */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Gas budget for the key (NEAR)
                  </label>
                  <input
                    type="text"
                    value={gasBudget}
                    onChange={(e) => setGasBudget(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Covers network fees, not payments. Set payment limits in Policy Guardrails.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Extra approval (1 YoctoNEAR rule)
                  </label>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', lineHeight: 1.3 }}>
                      Ask me to approve sensitive actions
                    </span>
                    <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', cursor: 'pointer', flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={extraApproval}
                        onChange={(e) => setExtraApproval(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: extraApproval ? '#047857' : '#cbd5e1',
                          borderRadius: '20px',
                          transition: '0.2s ease'
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: '14px',
                            width: '14px',
                            left: extraApproval ? '18px' : '3px',
                            bottom: '3px',
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s ease'
                          }}
                        />
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Agent's public key */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Agent's public key
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPublicKey(`ed25519:${Math.random().toString(36).substring(2, 10).toUpperCase()}...`);
                      showToast('Generated fresh one-time pairing key.');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0f172a',
                      fontSize: '11px',
                      textDecoration: 'underline',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Create a one-time pairing code
                  </button>
                </div>

                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 4: Step 4 of 5 · Test the connection
           ================================================================== */}
        {step === 4 && (
          <div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              We check that your agent can reach Agent Shield and that its key works on NEAR testnet.
            </p>

            {/* Checklist Container */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '4px 14px',
                marginBottom: '16px'
              }}
            >
              {testItems.map((item, idx) => {
                const isPassed = item.status === 'Passed';
                const isWaiting = item.status.includes('Waiting');
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: idx < testItems.length - 1 ? '1px solid #f1f5f9' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#0f172a' }}>{item.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: isPassed ? '#d1fae5' : isWaiting ? '#fef3c7' : '#f1f5f9',
                        color: isPassed ? '#065f46' : isWaiting ? '#b45309' : '#64748b'
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Gray Help Callout */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#64748b',
                lineHeight: 1.4,
                marginBottom: '24px'
              }}
            >
              Taking longer than 30 seconds? Check that your agent is running and has the connection key from the next screen.
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                &larr; Back
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleRunTestAgain}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    color: '#0f172a',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Run test again
                </button>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  style={{
                    background: '#065f46',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Continue &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 5: Step 5 of 5 · Safety check
           ================================================================== */}
        {step === 5 && (
          <div>
            {/* Risk Score Box */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  STARTING RISK SCORE (HIGHER MEANS MORE RISK)
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#047857', lineHeight: 1 }}>
                    22
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>/ 100 &middot; Low</span>
                </div>
              </div>

              <span
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}
              >
                Can stop actions
              </span>
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {/* Item 1: Verified */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <span
                  style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  Verified
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', lineHeight: 1.4 }}>
                  The key can only call 3 actions on store-vault.testnet. It cannot move funds by itself.
                </span>
              </div>

              {/* Item 2: Suggested */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fef08a',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  Suggested
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', lineHeight: 1.4 }}>
                  Turn on the 1 YoctoNEAR rule for issue_refund so a person approves large refunds.
                </span>
              </div>

              {/* Item 3: Checked */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <span
                  style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    flexShrink: 0
                  }}
                >
                  Checked
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', lineHeight: 1.4 }}>
                  The receiving contract is not on the platform blocked list.
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(4)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleAddAgentFinal}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Add agent
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            SCREEN 6: Agent added (Success / Connection Key)
           ================================================================== */}
        {step === 6 && (
          <div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              {name} is connected and being watched.
            </p>

            {/* Yellow Warning Box */}
            <div
              style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: '10px'
              }}
            >
              Copy your connection key now. It is shown only once, and we store just a scrambled copy.
            </div>

            {/* Key Terminal Box */}
            <div
              style={{
                background: '#0f172a',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#ffffff',
                marginBottom: '4px'
              }}
            >
              {rawKey}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
              Example key, not real.
            </div>

            {/* Add it to your agent */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Add it to your agent
              </div>
              <div
                style={{
                  background: '#0f172a',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#ffffff',
                  lineHeight: 1.6
                }}
              >
                npm install @agentshield/sdk
                <br />
                AGENT_SHIELD_KEY={rawKey}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleResetForAnother}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Add another
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#0f172a',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {copiedKey ? 'Copied!' : 'Copy key'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#065f46',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Go to agent
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
