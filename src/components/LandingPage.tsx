'use client';

import React from 'react';
import {
  ShieldIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  CpuIcon,
  LockIcon,
  KeyIcon,
  EyeIcon,
  ZapIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  GlobeIcon,
  ServerIcon,
  ArrowRightIcon,
  PlusIcon
} from './icons';

interface LandingPageProps {
  onEnterConsole: () => void;
  onCreateWorkspace: () => void;
  onStartOnboarding: () => void;
  onAddAgent: () => void;
}

export function LandingPage({
  onEnterConsole,
  onCreateWorkspace,
  onStartOnboarding,
  onAddAgent
}: LandingPageProps) {
  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section style={{
        padding: '56px 36px',
        borderRadius: 'var(--radius-lg)',
        background: 'radial-gradient(ellipse at top, rgba(6, 182, 212, 0.15) 0%, rgba(3, 7, 18, 0.95) 75%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
        marginBottom: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.12)',
          filter: 'blur(70px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '20px' }}>
          <ShieldIcon size={14} color="var(--shield-cyan)" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--shield-cyan)', letterSpacing: '0.04em' }}>
            NEAR HACKATHON 2026 &bull; TRACK 06: SECURITY &bull; AGENT SHIELD
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#f8fafc', maxWidth: '850px', marginBottom: '18px' }}>
          Autonomous AI Agent Security, Spend Limits &amp; Threat Intelligence
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: 1.6, marginBottom: '28px' }}>
          <strong style={{ color: '#f8fafc' }}>Trust, but verify.</strong> Connect, monitor, detect, control, and learn. Agent Shield is the dedicated runtime enforcement and forensic defense layer for autonomous agents operating on NEAR Protocol.
        </p>

        {/* Hero Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <button
            type="button"
            onClick={onEnterConsole}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600 }}
          >
            <ShieldCheckIcon size={18} color="#ffffff" />
            <span>Launch Security Console</span>
          </button>

          <button
            type="button"
            onClick={onAddAgent}
            className="btn btn-secondary"
            style={{ padding: '12px 22px', fontSize: '14px', fontWeight: 600 }}
          >
            <PlusIcon size={18} color="var(--shield-cyan)" />
            <span>Add an Agent Wizard</span>
          </button>

          <button
            type="button"
            onClick={onStartOnboarding}
            className="btn btn-secondary"
            style={{ padding: '12px 20px', fontSize: '14px' }}
          >
            <ZapIcon size={16} color="var(--alert-amber)" />
            <span>View Persona Onboarding</span>
          </button>

          <button
            type="button"
            onClick={onCreateWorkspace}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '8px'
            }}
          >
            Manage Workspaces &rarr;
          </button>
        </div>

        {/* 5 PRD Pillars Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {[
            { step: '1. CONNECT', desc: 'SDK, proxy, or webhooks without leaking raw keys' },
            { step: '2. MONITOR', desc: 'Continuous tool call & outbound egress telemetry' },
            { step: '3. DETECT', desc: 'Prompt injections, drain spikes & malicious targets' },
            { step: '4. CONTROL', desc: 'Enforce Function Call Key caps & 1 yoctoNEAR gates' },
            { step: '5. LEARN', desc: 'Forensic reports feed shared threat intelligence' }
          ].map((pillar, i) => (
            <div key={i} style={{ padding: '8px 10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--shield-cyan)', letterSpacing: '0.04em' }}>
                {pillar.step}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {pillar.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRD Section 21 Messaging Guardrail - MANDATORY COMPLIANCE */}
      <section style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        marginBottom: '40px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--alert-amber)',
            flexShrink: 0
          }}>
            <AlertTriangleIcon size={24} color="var(--alert-amber)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                PRD Section 21 Honest Protection Guardrail
              </h3>
              <span className="badge badge-approval" style={{ fontSize: '10px' }}>
                Strict Anti-Hallucination Policy
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#fde68a', marginTop: '6px', lineHeight: 1.6 }}>
              <strong>Agent Shield provides continuous monitoring and configurable protection for supported integrations.</strong> We do <span style={{ textDecoration: 'underline' }}>NOT</span> promise &ldquo;complete protection against every threat&rdquo; or &ldquo;100% autonomous safety.&rdquo;
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '14px',
              marginTop: '14px',
              fontSize: '12px'
            }}>
              <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #10b981' }}>
                <strong style={{ color: '#34d399' }}>&check; What Agent Shield Deterministically Protects:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <li>NEAR Function Call Key spending limits &amp; gas allowances</li>
                  <li>1 yoctoNEAR cryptographic human approval gates for critical methods</li>
                  <li>In-line proxy blocking of known exploit recipient accounts</li>
                  <li>Tool execution interception via middleware SDK hooks</li>
                </ul>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #f43f5e' }}>
                <strong style={{ color: '#fb7185' }}>&cross; Known Protection Boundaries &amp; Limitations:</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <li>Observe-only integrations CANNOT block or pause execution (alerts only)</li>
                  <li>Unmonitored network egress bypassing the proxy cannot be filtered</li>
                  <li>Local shell commands executed directly on host bypass cloud guardrails</li>
                  <li>Prompt injection cannot be 100% prevented without runtime delimiter checks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Integration Tiers */}
      <section style={{ marginBottom: '44px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Supported Integration Architecture
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Choose the deployment tier that matches your security and operational requirements.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Tier 1 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #06b6d4' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge badge-observe">Tier 1: Passive</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero Latency</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Observe-Only Telemetry
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Ingests webhook events and execution logs from external agent platforms (e.g., LangChain, ElizaOS, OpenClaw).
              </p>
              <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ color: 'var(--shield-cyan)', fontWeight: 600, marginBottom: '4px' }}>Can Observe:</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Tool call names, timestamps, returned text, status flags.</div>
                <div style={{ color: 'var(--critical-rose)', fontWeight: 600, marginBottom: '4px' }}>Cannot Control:</div>
                <div style={{ color: 'var(--text-muted)' }}>Passive only. Cannot block or pause execution in-flight.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddAgent}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              Configure Webhooks
            </button>
          </div>

          {/* Tier 2 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #10b981' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge badge-enforcing">Tier 2: In-Line</span>
                <span style={{ fontSize: '11px', color: '#34d399' }}>&lt; 5ms Overhead</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Instrumented SDK
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                TypeScript/Node middleware (<span className="font-mono" style={{ color: 'var(--shield-cyan)' }}>@agent-shield/sdk</span>) wrapping agent tool runners and LLM invocations.
              </p>
              <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ color: '#34d399', fontWeight: 600, marginBottom: '4px' }}>Can Observe &amp; Control:</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Inspects arguments before execution; throws security aborts to halt actions before they reach external systems.</div>
                <div style={{ color: 'var(--shield-cyan)', fontWeight: 600, marginBottom: '4px' }}>Best For:</div>
                <div style={{ color: 'var(--text-muted)' }}>Custom agent codebases &amp; full programmatic control.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddAgent}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              View SDK Setup
            </button>
          </div>

          {/* Tier 3 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #8b5cf6' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                  Tier 3: Gateway
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Network Level</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                Security Gateway Proxy
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Zero-code change HTTP/JSON-RPC reverse proxy sitting between your agent and NEAR RPC or external APIs.
              </p>
              <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ color: '#c084fc', fontWeight: 600, marginBottom: '4px' }}>Can Control:</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Drops malicious HTTP requests, validates contract bytecode hashes, enforces spending caps on RPC calls.</div>
                <div style={{ color: 'var(--shield-cyan)', fontWeight: 600, marginBottom: '4px' }}>Best For:</div>
                <div style={{ color: 'var(--text-muted)' }}>Third-party agents where source code cannot be modified.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddAgent}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              Deploy Gateway Proxy
            </button>
          </div>

          {/* Tier 4 */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid #f59e0b' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge badge-approval">Tier 4: Platform</span>
                <span style={{ fontSize: '11px', color: '#fbbf24' }}>TEE &bull; OutLayer</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                TEE &amp; Custody Contracts
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                Hardware attestation via NEAR AI Cloud confidential computing and custodial escrow via OutLayer.
              </p>
              <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: 'var(--radius-sm)', fontSize: '11px', marginBottom: '16px' }}>
                <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '4px' }}>Hardware Attestation:</div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>Verifies Intel TDX / AMD SEV-SNP attestation quotes before issuing cryptographic signing keys.</div>
                <div style={{ color: 'var(--shield-cyan)', fontWeight: 600, marginBottom: '4px' }}>Best For:</div>
                <div style={{ color: 'var(--text-muted)' }}>High-value treasury agents and automated market makers.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onEnterConsole}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              Inspect Attestation Docs
            </button>
          </div>
        </div>
      </section>

      {/* Feature & Protection Comparison Matrix */}
      <section className="glass-panel" style={{ padding: '28px', marginBottom: '40px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
          Observability vs. Enforcement Capability Matrix
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Clear and unambiguous breakdown of what Agent Shield can observe versus actively control at each layer.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>SECURITY CAPABILITY</th>
                <th style={{ padding: '12px' }}>TIER 1 (OBSERVE)</th>
                <th style={{ padding: '12px' }}>TIER 2 (SDK)</th>
                <th style={{ padding: '12px' }}>TIER 3 (GATEWAY)</th>
                <th style={{ padding: '12px' }}>TIER 4 (TEE / CUSTODY)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>Tool Call Telemetry Ingestion</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Full</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Full</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Full</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Full</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>In-Flight Action Blocking</td>
                <td style={{ padding: '12px', color: 'var(--critical-rose)' }}>&cross; Cannot Halt</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Throw Abort</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Drop HTTP/RPC</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Enclave Refusal</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>NEAR Function Call Key Allowance Limits</td>
                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>On-chain only</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Pre-flight Check</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Enforced on RPC</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Hardware Scoped</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>1 YoctoNEAR Human Sign-off Gates</td>
                <td style={{ padding: '12px', color: 'var(--critical-rose)' }}>&cross; No Gate</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Dispatches Request</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Holds RPC Session</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Custody Hold</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>Counterparty Contract Bytecode Verification</td>
                <td style={{ padding: '12px', color: '#38bdf8' }}>Alert Only</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Intercepts Call</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Verifies Hash</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Verified State</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc' }}>Forensic Sanitization &amp; Threat Sharing</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Redacted Log</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Redacted Log</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Redacted Log</td>
                <td style={{ padding: '12px', color: '#34d399' }}>&check; Cryptographic Proof</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section style={{
        padding: '36px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
          Secure Your Autonomous Agents on NEAR Today
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.5 }}>
          Testnet ready. Instant setup via zero-config SQLite, scoped NEAR access keys, and real-time counterparty anomaly scoring.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onEnterConsole}
            className="btn btn-primary"
            style={{ padding: '10px 22px' }}
          >
            <ShieldCheckIcon size={16} color="#ffffff" />
            <span>Open Security Console</span>
          </button>
          <button
            type="button"
            onClick={onAddAgent}
            className="btn btn-secondary"
            style={{ padding: '10px 20px' }}
          >
            <PlusIcon size={16} color="var(--shield-cyan)" />
            <span>Add an Agent</span>
          </button>
        </div>
      </section>
    </div>
  );
}
