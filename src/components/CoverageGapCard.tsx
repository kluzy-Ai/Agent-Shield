'use client';

import React from 'react';
import { AlertTriangleIcon, ShieldCheckIcon, EyeIcon } from './icons';

export function CoverageGapCard() {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #d97706',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            padding: '8px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            color: '#b45309',
            flexShrink: 0
          }}>
            <AlertTriangleIcon size={20} color="#b45309" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Coverage Transparency &amp; Enforcement Boundaries
              </h3>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                background: '#fef3c7',
                color: '#92400e'
              }}>
                Honest Disclosure
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: 1.5, maxWidth: '850px' }}>
              Agent Shield enforces security only where technically integrated into the execution path. In accordance with PRD Sections 11 &amp; 12, we never claim an action was &quot;Blocked&quot; unless our gateway or smart contract consensus actually prevented execution.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {/* Enforced Path */}
              <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '12px' }}>
                  <ShieldCheckIcon size={16} color="#059669" />
                  <span>Enforceable Control Points (Can Block)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#334155', marginTop: '6px', lineHeight: 1.5 }}>
                  <strong>Function Call Keys</strong> scoped to specific contracts (`store-vault.testnet`), max allowance budgets, and the contract <strong>1 YoctoNEAR rule</strong> requiring human authorization for critical actions.
                </p>
              </div>

              {/* Observe-Only Path */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700, fontSize: '12px' }}>
                  <EyeIcon size={16} color="#065f46" />
                  <span>Observe-Only Integrations (Alert Only)</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                  Webhook logs and external platform telemetry (e.g., <em>SupportGenie AI</em>). Violations generate real-time alerts and <strong>Forensic records</strong>, but stops actions for agents connected through the SDK or proxy; other agents are watch-only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
