'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  CopyIcon
} from './icons';

interface AddAgentCardsOverviewProps {
  onAgentAdded?: (newAgent: any) => void;
  onNavigateBack?: () => void;
}

export function AddAgentCardsOverview({ onAgentAdded, onNavigateBack }: AddAgentCardsOverviewProps) {
  // Card 1 State
  const [method, setMethod] = useState<'SDK' | 'PROXY' | 'LOGS'>('SDK');

  // Card 2 State
  const [name, setName] = useState('Refund Sentinel Bot');
  const [category, setCategory] = useState('E-commerce and refunds');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'TESTING'>('PRODUCTION');
  const [description, setDescription] = useState('Handles customer returns for a testnet storefront.');
  const [nearAccountId, setNearAccountId] = useState('refund-bot.testnet');
  const [contractId, setContractId] = useState('store-vault.testnet');

  // Card 3 State
  const [actionTags, setActionTags] = useState<string[]>(['issue_refund', 'query_order', 'check_stock']);
  const [gasBudget, setGasBudget] = useState('20.00');
  const [extraApproval, setExtraApproval] = useState(true);
  const [publicKey, setPublicKey] = useState('ed25519:6EF2XqK_');

  // Card 4 State
  const [testItems, setTestItems] = useState([
    { id: 1, label: 'Agent Shield can be reached', status: 'Passed' },
    { id: 2, label: 'Agent key accepted', status: 'Passed' },
    { id: 3, label: '"Still online" signal received', status: 'Waiting...' },
    { id: 4, label: 'Key permissions checked on NEAR testnet', status: 'Not started' }
  ]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Card 6 State
  const [copiedKey, setCopiedKey] = useState(false);
  const rawKey = 'ash_live_8f3Kq2Zr7WmXc4Nb1VdYt6Lp';

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyKey = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawKey).catch(() => {});
    }
    setCopiedKey(true);
    showToast('Connection key copied to clipboard.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRunTest = () => {
    setIsRunningTest(true);
    setTestItems([
      { id: 1, label: 'Agent Shield can be reached', status: 'Passed' },
      { id: 2, label: 'Agent key accepted', status: 'Passed' },
      { id: 3, label: '"Still online" signal received', status: 'Running...' },
      { id: 4, label: 'Key permissions checked on NEAR testnet', status: 'Waiting...' }
    ]);

    setTimeout(() => {
      setTestItems([
        { id: 1, label: 'Agent Shield can be reached', status: 'Passed' },
        { id: 2, label: 'Agent key accepted', status: 'Passed' },
        { id: 3, label: '"Still online" signal received', status: 'Passed' },
        { id: 4, label: 'Key permissions checked on NEAR testnet', status: 'Passed' }
      ]);
      setIsRunningTest(false);
      showToast('All connection checks passed successfully.');
    }, 1000);
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '32px',
            background: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircleIcon size={16} color="#ffffff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header matching mockup */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Add Agent
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          A five-step guide, then your connection key. Each card below is one screen of the wizard.
        </p>
      </div>

      {/* 2-Column Responsive Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* ==================================================================
            CARD 1: Step 1 of 5 · How to connect
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          {/* Card Top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add an agent</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          {/* Progress Bar (Step 1) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Step 1 of 5 &middot; How to connect
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
            How should Agent Shield connect to your agent?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {/* Option 1: Code connection (SDK) */}
            <div
              onClick={() => setMethod('SDK')}
              style={{
                border: method === 'SDK' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                background: method === 'SDK' ? '#f0fdf4' : '#ffffff',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: method === 'SDK' ? '4px solid #059669' : '1.5px solid #cbd5e1',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Code connection (SDK)</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                    Recommended
                  </span>
                  <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                    Can stop actions
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>
                Add a few lines to your agent's code. Each action is checked before it runs.
              </div>
            </div>

            {/* Option 2: Proxy */}
            <div
              onClick={() => setMethod('PROXY')}
              style={{
                border: method === 'PROXY' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                background: method === 'PROXY' ? '#f0fdf4' : '#ffffff',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: method === 'PROXY' ? '4px solid #059669' : '1.5px solid #cbd5e1',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Proxy (no code changes)</span>
                </div>
                <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                  Can stop actions
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>
                Point your agent's NEAR connection at Agent Shield. We check calls on the way through.
              </div>
            </div>

            {/* Option 3: Logs only */}
            <div
              onClick={() => setMethod('LOGS')}
              style={{
                border: method === 'LOGS' ? '1.5px solid #059669' : '1px solid #e2e8f0',
                background: method === 'LOGS' ? '#f0fdf4' : '#ffffff',
                borderRadius: '8px',
                padding: '12px 14px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: method === 'LOGS' ? '4px solid #059669' : '1.5px solid #cbd5e1',
                      background: '#ffffff'
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Logs only</span>
                </div>
                <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '10px', padding: '1px 6px', borderRadius: '10px' }}>
                  Watch only
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>
                Send logs from LangChain or another service. We alert you, but we cannot stop actions.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#334155' }}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}
            >
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* ==================================================================
            CARD 2: Step 2 of 5 · About your agent
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add an agent</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          {/* Progress Bar (Step 2) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Step 2 of 5 &middot; About your agent
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Agent name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box' }}
                >
                  <option value="E-commerce and refunds">E-commerce and refunds &or;</option>
                  <option value="DeFi and trading">DeFi and trading</option>
                  <option value="Customer support">Customer support</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Where does it run?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                {['Production', 'Staging', 'Testing'].map((env) => {
                  const isSel = environment === env.toUpperCase();
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env.toUpperCase() as any)}
                      style={{
                        padding: '6px 8px',
                        background: isSel ? '#065f46' : '#ffffff',
                        color: isSel ? '#ffffff' : '#334155',
                        border: 'none',
                        borderRight: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: isSel ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {env}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                What does it do?
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Agent NEAR account *
                </label>
                <input
                  type="text"
                  value={nearAccountId}
                  onChange={(e) => setNearAccountId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Contract it works with *
                </label>
                <input
                  type="text"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#334155' }}
            >
              &larr; Back
            </button>
            <button
              type="button"
              style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}
            >
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* ==================================================================
            CARD 3: Step 3 of 5 · Give it only what it needs
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add an agent</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          {/* Progress Bar (Step 3) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Step 3 of 5 &middot; Give it only what it needs
          </div>

          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#065f46',
              lineHeight: 1.4,
              marginBottom: '14px'
            }}
          >
            We never ask for private keys or seed phrases. Give us only the agent's limited-access key (the Function Call Key's public part), or use a one-time pairing code.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Actions the key may call
              </label>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', display: 'flex', gap: '6px' }}>
                {actionTags.map((t) => (
                  <span key={t} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontFamily: 'monospace' }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                Any other action is rejected by NEAR itself.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Gas budget for the key (NEAR)
                </label>
                <input
                  type="text"
                  value={gasBudget}
                  onChange={(e) => setGasBudget(e.target.value)}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                  Covers network fees, not payments. Set payment limits in Policy Guardrails.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Extra approval (1 YoctoNEAR rule)
                </label>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#0f172a' }}>Ask me to approve sensitive actions</span>
                  <div
                    onClick={() => setExtraApproval(!extraApproval)}
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '18px',
                      background: extraApproval ? '#047857' : '#cbd5e1',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffffff', position: 'absolute', top: '3px', left: extraApproval ? '17px' : '3px', transition: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Agent's public key</label>
                <span style={{ fontSize: '10px', color: '#0f172a', textDecoration: 'underline', cursor: 'pointer' }}>
                  Create a one-time pairing code
                </span>
              </div>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#334155' }}
            >
              &larr; Back
            </button>
            <button
              type="button"
              style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}
            >
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* ==================================================================
            CARD 4: Step 4 of 5 · Test the connection
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add an agent</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          {/* Progress Bar (Step 4) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Step 4 of 5 &middot; Test the connection
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
            We check that your agent can reach Agent Shield and that its key works on NEAR testnet.
          </p>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 12px', marginBottom: '14px' }}>
            {testItems.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: idx < testItems.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}
              >
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{item.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: item.status === 'Passed' ? '#d1fae5' : item.status.includes('Waiting') ? '#fef3c7' : '#f1f5f9',
                    color: item.status === 'Passed' ? '#065f46' : item.status.includes('Waiting') ? '#b45309' : '#64748b'
                  }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#64748b', lineHeight: 1.4, marginBottom: '20px' }}>
            Taking longer than 30 seconds? Check that your agent is running and has the connection key from the next screen.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#334155' }}
            >
              &larr; Back
            </button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={isRunningTest}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: '#0f172a', cursor: 'pointer' }}
              >
                {isRunningTest ? 'Testing...' : 'Run test again'}
              </button>
              <button
                type="button"
                style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#ffffff' }}
              >
                Continue &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================
            CARD 5: Step 5 of 5 · Safety check
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add an agent</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          {/* Progress Bar (Step 5) */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
            <div style={{ flex: 1, height: '3px', background: '#065f46', borderRadius: '2px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
            Step 5 of 5 &middot; Safety check
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                STARTING RISK SCORE (HIGHER MEANS MORE RISK)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#047857' }}>22</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>/ 100 &middot; Low</span>
              </div>
            </div>
            <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px' }}>
              Can stop actions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>Verified</span>
              <span style={{ fontSize: '12px', color: '#0f172a' }}>
                The key can only call 3 actions on store-vault.testnet. It cannot move funds by itself.
              </span>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>Suggested</span>
              <span style={{ fontSize: '12px', color: '#0f172a' }}>
                Turn on the 1 YoctoNEAR rule for issue_refund so a person approves large refunds.
              </span>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>Checked</span>
              <span style={{ fontSize: '12px', color: '#0f172a' }}>
                The receiving contract is not on the platform blocked list.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#334155' }}
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={() => showToast('Agent configured and ready to connect.')}
              style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
            >
              Add agent
            </button>
          </div>
        </div>

        {/* ==================================================================
            CARD 6: Agent added (Success / Keys Screen)
           ================================================================== */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#047857', margin: 0 }}>Agent added</h2>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>&times;</span>
          </div>

          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
            Refund Sentinel Bot is connected and being watched.
          </p>

          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Copy your connection key now. It is shown only once, and we store just a scrambled copy.
          </div>

          <div style={{ background: '#0f172a', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', marginBottom: '3px' }}>
            {rawKey}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '14px' }}>
            Example key, not real.
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
              Add it to your agent
            </div>
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#ffffff', lineHeight: 1.5 }}>
              npm install @agentshield/sdk
              <br />
              AGENT_SHIELD_KEY=ash_live_...
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: '#0f172a' }}
            >
              Add another
            </button>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleCopyKey}
                style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', color: '#0f172a', cursor: 'pointer' }}
              >
                {copiedKey ? 'Copied!' : 'Copy key'}
              </button>
              <button
                type="button"
                onClick={() => showToast('Navigating to agent profile...')}
                style={{ background: '#065f46', border: 'none', borderRadius: '6px', padding: '7px 18px', fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
              >
                Go to agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

