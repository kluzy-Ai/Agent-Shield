'use client';

import React, { useState } from 'react';
import { UserPersona } from '@/types';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  CpuIcon
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: currentStep >= 1 ? '#065f46' : '#e2e8f0',
            color: currentStep >= 1 ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            1
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: currentStep >= 1 ? '#0f172a' : '#94a3b8' }}>
            User Persona &amp; Security Profile
          </span>
        </div>

        <div style={{ width: '40px', height: '1px', background: '#e2e8f0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: currentStep === 2 ? '#065f46' : '#e2e8f0',
            color: currentStep === 2 ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            2
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: currentStep === 2 ? '#0f172a' : '#94a3b8' }}>
            Integration Options &amp; Controls
          </span>
        </div>
      </div>

      {/* STEP 1: Persona Selection */}
      {currentStep === 1 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '36px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Select Your Operational Role
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
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
                    borderRadius: '10px',
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    border: isSelected ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderLeft: isSelected ? '4px solid #065f46' : '1px solid #e2e8f0',
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
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #065f46' : '2px solid #cbd5e1',
                      background: '#ffffff',
                      flexShrink: 0
                    }} />
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {p.title}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 6px' }}>
                        {p.subtitle}
                      </p>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                        <strong style={{ color: '#065f46' }}>Security Focus:</strong> {p.primaryNeed}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: '#f1f5f9',
                    color: '#475569',
                    flexShrink: 0
                  }}>
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
              style={{
                padding: '10px 24px',
                background: '#065f46',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <span>Continue to Integration Options</span>
              <ArrowRightIcon size={16} color="#ffffff" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Integration Options & Matrix */}
      {currentStep === 2 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '36px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Choose Your Integration Method
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
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
                borderRadius: '10px',
                background: selectedIntegration === 'SDK' ? '#f0fdf4' : '#ffffff',
                border: selectedIntegration === 'SDK' ? '2px solid #065f46' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>
                  RECOMMENDED
                </span>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Active In-Line</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Instrumented SDK
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                Embeds directly in TypeScript/Node agent runtimes to inspect tool parameters before invocation.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div><strong style={{ color: '#065f46' }}>Can Observe:</strong> Tool names, raw parameters, returned payloads, outbound endpoints.</div>
                <div><strong style={{ color: '#065f46' }}>Can Control:</strong> Immediately halts tool calls before execution by throwing runtime exceptions.</div>
              </div>
            </div>

            {/* Gateway */}
            <div
              onClick={() => setSelectedIntegration('GATEWAY')}
              style={{
                padding: '20px',
                borderRadius: '10px',
                background: selectedIntegration === 'GATEWAY' ? '#f0fdf4' : '#ffffff',
                border: selectedIntegration === 'GATEWAY' ? '2px solid #065f46' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                  ZERO CODE CHANGES
                </span>
                <span style={{ fontSize: '11px', color: '#065f46', fontWeight: 600 }}>Network Proxy</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Security Gateway Proxy
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                Point your agent&apos;s NEAR RPC URL to Agent Shield proxy. Intercepts JSON-RPC calls automatically.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div><strong style={{ color: '#065f46' }}>Can Observe:</strong> All RPC requests, method names, gas attached, target contracts.</div>
                <div><strong style={{ color: '#065f46' }}>Can Control:</strong> Returns HTTP 403 / RPC error if spending limits or counterparty checks fail.</div>
              </div>
            </div>

            {/* Webhook Observe-Only */}
            <div
              onClick={() => setSelectedIntegration('OBSERVE')}
              style={{
                padding: '20px',
                borderRadius: '10px',
                background: selectedIntegration === 'OBSERVE' ? '#fffbeb' : '#ffffff',
                border: selectedIntegration === 'OBSERVE' ? '2px solid #d97706' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>
                  PASSIVE ONLY
                </span>
                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>No Blocking</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                Webhook / Log Stream
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '14px' }}>
                Passive telemetry stream from third-party agent hosting platforms.
              </p>
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div><strong style={{ color: '#065f46' }}>Can Observe:</strong> Event timestamps, tool logs, diagnostic messages.</div>
                <div><strong style={{ color: '#b91c1c' }}>Cannot Control:</strong> Cannot block or pause actions. Generates alerts only.</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              style={{
                padding: '9px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeftIcon size={16} color="#0f172a" />
              <span>Back to Role Selection</span>
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onComplete}
                style={{
                  padding: '9px 16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={onLaunchAddAgent}
                style={{
                  padding: '9px 20px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
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
