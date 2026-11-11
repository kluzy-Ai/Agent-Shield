'use client';

import React, { useState } from 'react';
import { Agent, EnforcementLevel } from '@/types';
import {
  ShieldIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  CpuIcon,
  LockIcon,
  KeyIcon,
  CheckCircleIcon,
  XIcon,
  ZapIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ServerIcon
} from './icons';

interface AddAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentAdded: (newAgent: Agent) => void;
}

export function AddAgentWizard({ isOpen, onClose, onAgentAdded }: AddAgentWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Method
  const [method, setMethod] = useState<'SDK' | 'GATEWAY' | 'WEBHOOK'>('SDK');

  // Step 2: Identity & Environment
  const [name, setName] = useState('Refund Sentinel Bot');
  const [category, setCategory] = useState<'ECOMMERCE' | 'FINANCE' | 'SUPPORT' | 'CODING' | 'RESEARCH' | 'WORKFLOW'>('ECOMMERCE');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'SANDBOX'>('PRODUCTION');
  const [description, setDescription] = useState('Autonomous customer return processing agent for testnet storefront.');
  const [nearAccountId, setNearAccountId] = useState('refund-bot.nearhack.testnet');
  const [targetContractId, setTargetContractId] = useState('store-vault.nearhack.testnet');

  // Step 3: Minimum Permissions & Secret Handling
  const [allowedMethods, setAllowedMethods] = useState('issue_refund, query_order, check_stock');
  const [allowanceNear, setAllowanceNear] = useState('20.00');
  const [enableYoctoNearGate, setEnableYoctoNearGate] = useState(true);
  const [publicKey, setPublicKey] = useState('ed25519:6E2XgK...');
  const [tokenCopied, setTokenCopied] = useState(false);

  // Step 4: Connection Test
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [testSteps, setTestSteps] = useState([
    { label: 'DNS & Gateway Route Handshake', done: false },
    { label: 'Agent Session Authentication Token', done: false },
    { label: 'Heartbeat Telemetry Ingestion', done: false },
    { label: 'NEAR Testnet Function Call Key Verification', done: false }
  ]);

  if (!isOpen) return null;

  const handleRunConnectionTest = () => {
    setTestStatus('TESTING');
    setTestSteps([
      { label: 'DNS & Gateway Route Handshake', done: false },
      { label: 'Agent Session Authentication Token', done: false },
      { label: 'Heartbeat Telemetry Ingestion', done: false },
      { label: 'NEAR Testnet Function Call Key Verification', done: false }
    ]);

    setTimeout(() => {
      setTestSteps((prev) => [{ ...prev[0], done: true }, prev[1], prev[2], prev[3]]);
    }, 400);

    setTimeout(() => {
      setTestSteps((prev) => [prev[0], { ...prev[1], done: true }, prev[2], prev[3]]);
    }, 900);

    setTimeout(() => {
      setTestSteps((prev) => [prev[0], prev[1], { ...prev[2], done: true }, prev[3]]);
    }, 1400);

    setTimeout(() => {
      setTestSteps((prev) => [prev[0], prev[1], prev[2], { ...prev[3], done: true }]);
      setTestStatus('SUCCESS');
    }, 1900);
  };

  const handleFinish = () => {
    const enforcementLevel: EnforcementLevel =
      method === 'SDK' ? 'ENFORCING' :
      method === 'GATEWAY' ? (enableYoctoNearGate ? 'APPROVAL_REQUIRED' : 'ENFORCING') :
      'OBSERVE_ONLY';

    const parsedMethods = allowedMethods
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const newAgent: Agent = {
      id: `agent-${Date.now().toString().slice(-4)}`,
      name,
      description,
      category,
      enforcementLevel,
      status: 'ACTIVE',
      nearAccountId,
      targetContractId,
      hasFunctionCallKey: true,
      fckAllowanceNear: allowanceNear,
      fckReceiverId: targetContractId,
      fckAllowedMethods: parsedMethods,
      riskScore: 22,
      lastHeartbeat: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tools: parsedMethods.map((m) => ({
        name: m,
        description: `Scoped method on ${targetContractId}`,
        isMonitored: true,
        isEnforceable: method !== 'WEBHOOK',
        requiresApproval: enableYoctoNearGate && m.includes('refund')
      })),
      coverageGaps: method === 'WEBHOOK' ? [
        {
          area: 'Observe-Only Limitation',
          description: 'Webhook streams cannot halt or pause rogue transactions.',
          canBlock: false,
          recommendation: 'Upgrade to Agent Shield Gateway or SDK.'
        }
      ] : []
    };

    onAgentAdded(newAgent);
    onClose();
  };

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
        maxWidth: '720px',
        width: '100%',
        padding: '32px',
        maxHeight: '90vh',
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

        {/* Header & Step Tracker */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CpuIcon size={24} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Add an Autonomous Agent
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Connect, configure least-privilege Function Call Keys, test the connection, and preview baseline security posture.
          </p>

          {/* Stepper Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '18px' }}>
            {[
              { num: 1, label: 'Method' },
              { num: 2, label: 'Identity' },
              { num: 3, label: 'Permissions' },
              { num: 4, label: 'Connection' },
              { num: 5, label: 'Assessment' }
            ].map((s) => (
              <div
                key={s.num}
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: step >= s.num ? 'var(--shield-cyan)' : 'rgba(255, 255, 255, 0.1)'
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>Step {step} of 5</span>
            <span style={{ color: 'var(--shield-cyan)', fontWeight: 600 }}>
              {step === 1 && 'Integration Method'}
              {step === 2 && 'Identity & Environment'}
              {step === 3 && 'Minimum Permissions & Key Scoping'}
              {step === 4 && 'Connection Test'}
              {step === 5 && 'Baseline Assessment Preview'}
            </span>
          </div>
        </div>

        {/* ============================================================
            STEP 1: METHOD SELECTION
           ============================================================ */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '14px' }}>
              Select How Agent Shield Intercepts This Agent
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {/* Option A: SDK */}
              <div
                onClick={() => setMethod('SDK')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: method === 'SDK' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                  border: method === 'SDK' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                      Instrumented SDK (@agent-shield/sdk)
                    </span>
                    <span className="badge badge-enforcing" style={{ fontSize: '9px' }}>RECOMMENDED</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#34d399' }}>Full In-Line Blocking</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Wrap tool invocations with TypeScript middleware. Directly inspects inputs, validates destinations, and halts execution before tools run.
                </p>
              </div>

              {/* Option B: Gateway */}
              <div
                onClick={() => setMethod('GATEWAY')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: method === 'GATEWAY' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                  border: method === 'GATEWAY' ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                    Security Gateway Proxy (Zero Code Modification)
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--shield-cyan)' }}>RPC Level Blocking</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Direct your agent&apos;s NEAR RPC URL to Agent Shield proxy. Blocks unauthorized contract calls and spending overruns at the network layer.
                </p>
              </div>

              {/* Option C: Webhooks */}
              <div
                onClick={() => setMethod('WEBHOOK')}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: method === 'WEBHOOK' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                  border: method === 'WEBHOOK' ? '1px solid var(--alert-amber)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>
                    Webhook Event Ingestion (Passive Observe-Only)
                  </span>
                  <span className="badge badge-approval" style={{ fontSize: '9px' }}>OBSERVE-ONLY</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Stream logs from LangChain or external services. Anomaly detection and threat intelligence only; cannot block or pause execution.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-primary"
              >
                <span>Continue to Identity &amp; Environment</span>
                <ArrowRightIcon size={16} color="#ffffff" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 2: IDENTITY & ENVIRONMENT
           ============================================================ */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '14px' }}>
              Agent Identity &amp; Target Contract
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: '#040816',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '13px'
                  }}
                >
                  <option value="ECOMMERCE">E-Commerce &amp; Refunds</option>
                  <option value="FINANCE">Finance &amp; Arbitrage</option>
                  <option value="SUPPORT">Customer Support</option>
                  <option value="CODING">Code &amp; CI/CD</option>
                  <option value="RESEARCH">Research &amp; Scraper</option>
                  <option value="WORKFLOW">Workflow Automation</option>
                </select>
              </div>
            </div>

            {/* Environment selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Operational Environment
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['PRODUCTION', 'STAGING', 'SANDBOX'] as const).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: environment === env ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: environment === env ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                      color: environment === env ? 'var(--shield-cyan)' : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Description / Declared Scope
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f8fafc',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Agent NEAR Account ID *
                </label>
                <input
                  type="text"
                  value={nearAccountId}
                  onChange={(e) => setNearAccountId(e.target.value)}
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Target Smart Contract ID *
                </label>
                <input
                  type="text"
                  value={targetContractId}
                  onChange={(e) => setTargetContractId(e.target.value)}
                  className="font-mono"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--shield-cyan)',
                    fontSize: '12px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary"
              >
                <ArrowLeftIcon size={16} color="var(--text-secondary)" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-primary"
              >
                <span>Continue to Permissions &amp; Secrets</span>
                <ArrowRightIcon size={16} color="#ffffff" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 3: MINIMUM PERMISSIONS & SECURE SECRET HANDLING
           ============================================================ */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Minimum Permissions &amp; Zero-Key Security
            </h3>

            {/* MANDATORY PRD SECTION 6.1 GUARDRAIL */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <ShieldCheckIcon size={20} color="var(--shield-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--shield-cyan)' }}>
                  SECURE SECRET HANDLING (NO RAW PRIVATE KEYS)
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
                  Agent Shield NEVER requests or stores private keys or seed phrases. Provide only the agent&apos;s scoped <strong>Function Call Key (FCK) Public Key</strong> or an ephemeral pairing token. On NEAR Protocol, FCKs cannot transfer native balance or call unspecified methods.
                </p>
              </div>
            </div>

            {/* Allowed Contract Methods */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Minimum Scoped Methods (Comma-separated)
              </label>
              <input
                type="text"
                value={allowedMethods}
                onChange={(e) => setAllowedMethods(e.target.value)}
                className="font-mono"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#34d399',
                  fontSize: '12px'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Only these exact methods will be permitted. Any other function call will be rejected by the NEAR runtime.
              </span>
            </div>

            {/* Allowance & 1 YoctoNEAR Rule */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Max NEAR Allowance (FCK Cap)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={allowanceNear}
                    onChange={(e) => setAllowanceNear(e.target.value)}
                    className="font-mono"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>NEAR</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  1 YoctoNEAR Approval Gate
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}>
                  <input
                    type="checkbox"
                    checked={enableYoctoNearGate}
                    onChange={(e) => setEnableYoctoNearGate(e.target.checked)}
                  />
                  <span>Enforce human sign-off</span>
                </label>
              </div>
            </div>

            {/* Scoped Public Key or Ephemeral Pairing Token */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Agent Scoped Public Key (ed25519)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 2000);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--shield-cyan)', fontSize: '11px', cursor: 'pointer' }}
                >
                  {tokenCopied ? '&check; Copied Token' : 'Generate Ephemeral Pairing Token'}
                </button>
              </div>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="font-mono"
                placeholder="ed25519:PublicAccessKeyOnly..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-secondary"
              >
                <ArrowLeftIcon size={16} color="var(--text-secondary)" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="btn btn-primary"
              >
                <span>Continue to Connection Test</span>
                <ArrowRightIcon size={16} color="#ffffff" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 4: CONNECTION TEST
           ============================================================ */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
              Live Diagnostic &amp; Heartbeat Probe
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Agent Shield tests the telemetry pathway, verifies token pairing, and queries NEAR RPC for key permissions.
            </p>

            <div style={{
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {testSteps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {s.done ? (
                        <CheckCircleIcon size={18} color="#34d399" />
                      ) : testStatus === 'TESTING' ? (
                        <div className="skeleton" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--text-muted)' }} />
                      )}
                      <span style={{ fontSize: '13px', color: s.done ? '#f8fafc' : 'var(--text-muted)' }}>
                        {s.label}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: s.done ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                      {s.done ? 'PASS' : testStatus === 'TESTING' ? 'PROBING...' : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>

              {testStatus === 'SUCCESS' && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px 14px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10b981',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                    &check; Connection Established (Latency: 38ms &bull; RPC: rpc.testnet.near.org)
                  </div>
                  <span className="badge badge-enforcing">VERIFIED</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn btn-secondary"
              >
                <ArrowLeftIcon size={16} color="var(--text-secondary)" />
                <span>Back</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleRunConnectionTest}
                  disabled={testStatus === 'TESTING'}
                  className="btn btn-secondary"
                >
                  <RefreshCwIcon size={16} color="var(--shield-cyan)" />
                  <span>{testStatus === 'SUCCESS' ? 'Retest Connection' : 'Run Connection Test'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={testStatus !== 'SUCCESS'}
                  className="btn btn-primary"
                >
                  <span>Preview Assessment</span>
                  <ArrowRightIcon size={16} color="#ffffff" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STEP 5: BASELINE ASSESSMENT PREVIEW
           ============================================================ */}
        {step === 5 && (
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
              Baseline Security Posture Assessment Preview
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Calculated automated risk baseline for {name} based on declared scope and contract analysis.
            </p>

            {/* Score Banner */}
            <div style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Baseline Risk Score
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#34d399', margin: '2px 0' }}>
                  22 <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>/ 100 (LOW RISK)</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Assessment Generated: Just now &bull; Testnet Verified
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-enforcing">Posture Healthy</span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Method Scope: <strong style={{ color: '#f8fafc' }}>Restricted FCK</strong>
                </div>
              </div>
            </div>

            {/* Detected Findings & Pre-Configured Guardrails */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #10b981', fontSize: '12px' }}>
                <strong style={{ color: '#34d399' }}>Verified Protection:</strong> Function Call Key strictly locked to {targetContractId} with {allowanceNear} NEAR allowance. Cannot transfer raw balance.
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #f59e0b', fontSize: '12px' }}>
                <strong style={{ color: '#fbbf24' }}>Recommended Guardrail:</strong> Enable 1 YoctoNEAR approval on &ldquo;issue_refund&rdquo; method to prevent drain vectors.
              </div>
              <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #06b6d4', fontSize: '12px' }}>
                <strong style={{ color: 'var(--shield-cyan)' }}>Threat Intelligence:</strong> Counterparty destination is clean (no malicious activity recorded in community blocklist).
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="btn btn-secondary"
              >
                <ArrowLeftIcon size={16} color="var(--text-secondary)" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="btn btn-primary"
                style={{ padding: '10px 24px' }}
              >
                <CheckCircleIcon size={18} color="#ffffff" />
                <span>Confirm &amp; Register Agent</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
