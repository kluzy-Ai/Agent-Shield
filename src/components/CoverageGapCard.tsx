'use client';

import React from 'react';
import { AlertTriangleIcon, ShieldCheckIcon, EyeIcon, KeyIcon } from './icons';

export function CoverageGapCard() {
  return (
    <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', borderLeft: '4px solid var(--alert-amber)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            padding: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--alert-amber)',
            flexShrink: 0
          }}>
            <AlertTriangleIcon size={20} color="var(--alert-amber)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                Coverage Transparency & Enforcement Boundaries
              </h3>
              <span className="badge badge-approval">Honest Disclosure</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5, maxWidth: '850px' }}>
              Agent Shield enforces security only where technically integrated into the execution path. In accordance with PRD Sections 11 &amp; 12, we never claim an action was &quot;Blocked&quot; unless our gateway or smart contract consensus actually prevented execution.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Enforced Path */}
              <div style={{ padding: '12px 14px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 600, fontSize: '12px' }}>
                  <ShieldCheckIcon size={16} color="#34d399" />
                  <span>Enforceable Control Points (Can Block)</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  <span title="NEAR access keys scoped to specific contracts, preventing autonomous transfer of native NEAR" style={{ cursor: 'help', textDecoration: 'underline dotted var(--shield-cyan)' }}>
                    <strong>Function Call Keys</strong> <sup style={{ color: 'var(--shield-cyan)' }}>?</sup>
                  </span> scoped to specific contracts (`store-vault.testnet`), max allowance budgets, and the contract <span title="Contract assert_one_yocto() checks that require human wallet signature since Function-Call Keys cannot attach deposits" style={{ cursor: 'help', textDecoration: 'underline dotted var(--shield-cyan)' }}>
                    <strong>1 YoctoNEAR rule</strong> <sup style={{ color: 'var(--shield-cyan)' }}>?</sup>
                  </span> requiring human authorization for critical actions.
                </p>
              </div>

              {/* Observe-Only Path */}
              <div style={{ padding: '12px 14px', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--shield-cyan)', fontWeight: 600, fontSize: '12px' }}>
                  <EyeIcon size={16} color="var(--shield-cyan)" />
                  <span>Observe-Only Integrations (Alert Only)</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  Webhook logs and external platform telemetry (e.g., <em>SupportGenie AI</em>). Violations generate real-time alerts and <span title="Cryptographically chained and redacted timeline logs proving execution details" style={{ cursor: 'help', textDecoration: 'underline dotted var(--shield-cyan)' }}>
                    <strong>Forensic records</strong> <sup style={{ color: 'var(--shield-cyan)' }}>?</sup>
                  </span>, but stops actions for agents connected through the SDK or proxy; other agents are watch-only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
