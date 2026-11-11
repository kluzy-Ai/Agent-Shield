'use client';

import React, { useState } from 'react';
import { UserPersona } from '@/types';
import {
  ShieldIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  CpuIcon,
  KeyIcon,
  GlobeIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ServerIcon,
  LockIcon
} from './icons';

interface OnboardingFlowProps {
  onComplete: () => void;
  onLaunchAddAgent: () => void;
}

export function OnboardingFlow({ onComplete, onLaunchAddAgent }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedPersona, setSelectedPersona] = useState<UserPersona>('ECOMMERCE_OPERATOR');
  const [selectedIntegration, setSelectedIntegration] = useState<'SDK' | 'GATEWAY' | 'OBSERVE'>('SDK');

  const personas = [
    {
      id: 'ECOMMERCE_OPERATOR' as UserPersona,
      title: 'E-commerce / Storefront Operator',
      subtitle: 'Running autonomous customer support, return refunds, or store order bots.',
      primaryNeed: 'Defend store vault from refund drain exploits and restrict spending to 20 NEAR per day.',
      recommendedTier: 'Instrumented SDK or Gateway Proxy'
    },
    {
      id: 'AGENT_DEVELOPER' as UserPersona,
      title: 'Autonomous Agent Engineer',
      subtitle: 'Building multi-tool agents with ElizaOS, LangChain, or custom LLM frameworks.',
      primaryNeed: 'Automate security baseline checks, FCK scoping, and intercept dangerous tool calls before release.',
      recommendedTier: 'Instrumented SDK (@agent-shield/sdk)'
    },
    {
      id: 'INDIVIDUAL' as UserPersona,
      title: 'Individual Agent Operator',
      subtitle: 'Delegating personal crypto wallet actions to an AI assistant or research bot.',
      primaryNeed: 'Prevent agent from spending full wallet balance via Function Call Key gas allowances.',
      recommendedTier: 'Gateway Proxy'
    },
    {
      id: 'SECURITY_TEAM' as UserPersona,
      title: 'Enterprise Security & SecOps',
      subtitle: 'Managing multi-agent fleet compliance, outbound network egress, and audit trails.',
      primaryNeed: 'Continuous egress inspection, threat alert routing, and sanitized forensic intelligence.',
      recommendedTier: 'Gateway Proxy + SDK Middleware'
    },
    {
      id: 'RESEARCHER' as UserPersona,
      title: 'Security Researcher / Auditor',
      subtitle: 'Probing autonomous agent attack surfaces, prompt injection vectors, and contract risks.',
      primaryNeed: 'Analyze counterparty scoring signals (bytecode changes, account age) and submit findings.',
      recommendedTier: 'Full Platform & Threat Intel'
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 0 60px' }}>
      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: currentStep >= 1 ? 'var(--shield-cyan)' : 'rgba(255, 255, 255, 0.1)',
            color: '#030712',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            1
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: currentStep >= 1 ? '#f8fafc' : 'var(--text-muted)' }}>
            User Persona &amp; Security Profile
          </span>
        </div>

        <div style={{ width: '40px', height: '1px', background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: currentStep === 2 ? 'var(--shield-cyan)' : 'rgba(255, 255, 255, 0.1)',
            color: '#030712',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            2
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: currentStep === 2 ? '#f8fafc' : 'var(--text-muted)' }}>
            Integration Options &amp; Controls
          </span>
        </div>
      </div>

      {/* STEP 1: Persona Selection */}
      {currentStep === 1 && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              Select Your Operational Role
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Agent Shield tailors your security dashboard, spending presets, and threat feeds to your specific agent workload.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {personas.map((p) => {
              const isSelected = selectedPersona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                    border: isSelected ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      marginTop: '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--shield-cyan)' : '2px solid var(--text-muted)',
                      background: '#030712',
                      flexShrink: 0
                    }} />
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                        {p.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 8px' }}>
                        {p.subtitle}
                      </p>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--shield-cyan)' }}>Security Focus:</strong> {p.primaryNeed}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-observe" style={{ fontSize: '10px', flexShrink: 0 }}>
                    {p.recommendedTier}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: '14px' }}
            >
              <span>Continue to Integration Options</span>
              <ArrowRightIcon size={16} color="#ffffff" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Integration Options & Matrix */}
      {currentStep === 2 && (
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              Choose Your Integration Method
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Explicit disclosure of what each integration tier can observe vs. actively control.
            </p>
          </div>

          {/* 3 Integration Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* SDK */}
            <div
              onClick={() => setSelectedIntegration('SDK')}
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: selectedIntegration === 'SDK' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                border: selectedIntegration === 'SDK' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge badge-enforcing">RECOMMENDED</span>
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>Active In-Line</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                Instrumented SDK
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                Embeds directly in TypeScript/Node agent runtimes to inspect tool parameters before invocation.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div><strong style={{ color: '#34d399' }}>Can Observe:</strong> Tool names, raw parameters, returned payloads, outbound endpoints.</div>
                <div><strong style={{ color: '#34d399' }}>Can Control:</strong> Immediately halts tool calls before execution by throwing runtime exceptions.</div>
              </div>
            </div>

            {/* Gateway */}
            <div
              onClick={() => setSelectedIntegration('GATEWAY')}
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: selectedIntegration === 'GATEWAY' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                border: selectedIntegration === 'GATEWAY' ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge badge-observe">ZERO CODE CHANGES</span>
                <span style={{ fontSize: '11px', color: 'var(--shield-cyan)', fontWeight: 600 }}>Network Proxy</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                Security Gateway Proxy
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                Point your agent&apos;s NEAR RPC URL to Agent Shield proxy. Intercepts JSON-RPC calls automatically.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div><strong style={{ color: 'var(--shield-cyan)' }}>Can Observe:</strong> All RPC requests, method names, gas attached, target contracts.</div>
                <div><strong style={{ color: 'var(--shield-cyan)' }}>Can Control:</strong> Returns HTTP 403 / RPC error if spending limits or counterparty checks fail.</div>
              </div>
            </div>

            {/* Webhook Observe-Only */}
            <div
              onClick={() => setSelectedIntegration('OBSERVE')}
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: selectedIntegration === 'OBSERVE' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                border: selectedIntegration === 'OBSERVE' ? '1px solid var(--alert-amber)' : '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge badge-approval">PASSIVE ONLY</span>
                <span style={{ fontSize: '11px', color: 'var(--alert-amber)', fontWeight: 600 }}>No Blocking</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                Webhook / Log Stream
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                Passive telemetry stream from third-party agent hosting platforms.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <div><strong style={{ color: 'var(--shield-cyan)' }}>Can Observe:</strong> Event timestamps, tool logs, diagnostic messages.</div>
                <div><strong style={{ color: 'var(--critical-rose)' }}>Cannot Control:</strong> Cannot block or pause actions. Generates alerts only.</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-secondary"
            >
              <ArrowLeftIcon size={16} color="var(--text-secondary)" />
              <span>Back to Role Selection</span>
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onComplete}
                className="btn btn-secondary"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={onLaunchAddAgent}
                className="btn btn-primary"
              >
                <CpuIcon size={16} color="#ffffff" />
                <span>Launch &ldquo;Add an Agent&rdquo; Wizard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
