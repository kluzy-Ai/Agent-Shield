'use client';

import React, { useState } from 'react';
import { DefensivePlaybook } from '@/types';
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  CheckIcon,
  ShieldAlertIcon,
  TerminalIcon,
  AlertTriangleIcon
} from './icons';

interface DefensivePlaybooksProps {
  playbooks: DefensivePlaybook[];
  onTriggerQuickContainment?: (playbookId: string) => void;
}

export function DefensivePlaybooks({ playbooks, onTriggerQuickContainment }: DefensivePlaybooksProps) {
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>(playbooks[0]?.id || '');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const selectedPlaybook = playbooks.find((p) => p.id === selectedPlaybookId) || playbooks[0];

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const copySnippet = (stepId: string, snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetId(stepId);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Phase badge styling
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'IDENTIFY': return '#38bdf8';
      case 'CONTAIN': return '#f43f5e';
      case 'ERADICATE': return '#f59e0b';
      case 'RECOVER': return '#34d399';
      case 'POST_INCIDENT': return '#a78bfa';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <BookOpenIcon size={22} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Defensive Incident Playbooks
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Standardized incident response workflows for high-severity AI agent security incidents. Execute step-by-step containment procedures.
          </p>
        </div>
      </div>

      {/* Main Grid: Playbook Navigation + Active Playbook Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Left: Playbooks Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {playbooks.map((pb) => {
            const isSelected = pb.id === selectedPlaybookId;
            const totalSteps = (pb.steps || []).length;
            const finishedCount = (pb.steps || []).filter((s) => completedSteps[s.id]).length;
            const progressPercent = totalSteps > 0 ? Math.round((finishedCount / totalSteps) * 100) : 0;

            return (
              <div
                key={pb.id}
                onClick={() => setSelectedPlaybookId(pb.id)}
                className="card"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: pb.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: pb.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
                    border: pb.severity === 'CRITICAL' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    {pb.severity}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClockIcon size={12} /> SLA: {pb.estimatedSla}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>
                  {pb.title}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
                  {pb.threatVector}
                </div>

                {/* Progress Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>Progress: {finishedCount}/{totalSteps} steps</span>
                    <span style={{ color: finishedCount === totalSteps ? 'var(--near-emerald)' : 'var(--shield-cyan)' }}>
                      {progressPercent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: finishedCount === totalSteps ? 'var(--near-emerald)' : 'var(--shield-cyan)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Active Playbook Steps Checklist */}
        {selectedPlaybook && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Playbook Overview Header */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--shield-cyan)' }}>
                      {selectedPlaybook.id}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Target Agents: {selectedPlaybook.targetAgentTypes.join(', ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {selectedPlaybook.title}
                  </h3>
                </div>

                <div style={{
                  padding: '6px 12px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--shield-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ClockIcon size={14} /> Target Containment SLA: {selectedPlaybook.estimatedSla}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                {selectedPlaybook.summary}
              </p>
            </div>

            {/* Checklist of Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedPlaybook.steps.map((step, idx) => {
                const isChecked = !!completedSteps[step.id];
                const phaseColor = getPhaseColor(step.phase);

                return (
                  <div
                    key={step.id}
                    className="card"
                    style={{
                      padding: '18px 20px',
                      borderLeft: isChecked ? '4px solid var(--near-emerald)' : `4px solid ${phaseColor}`,
                      background: isChecked ? 'rgba(5, 150, 105, 0.04)' : 'rgba(15, 23, 42, 0.6)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleStep(step.id)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: isChecked ? '1px solid var(--near-emerald)' : '1px solid var(--border-subtle)',
                          background: isChecked ? 'var(--near-emerald)' : 'rgba(255,255,255,0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#030712',
                          marginTop: '2px',
                          flexShrink: 0
                        }}
                      >
                        {isChecked && <CheckIcon size={14} color="#030712" strokeWidth={3} />}
                      </button>

                      {/* Step Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: `${phaseColor}20`,
                            color: phaseColor,
                            border: `1px solid ${phaseColor}40`
                          }}>
                            {step.phase}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: isChecked ? 'var(--text-muted)' : '#f8fafc', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {step.title}
                          </span>
                          {step.requiresConsensus && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '10px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              Requires 1 YoctoNEAR / Consensus
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 10px' }}>
                          {step.instruction}
                        </p>

                        {/* Action Command / Snippet if present */}
                        {step.actionSnippet && (
                          <div style={{
                            background: '#090d16',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
                              <TerminalIcon size={14} color="var(--shield-cyan)" />
                              <code style={{ fontSize: '12px', color: '#93c5fd', fontFamily: 'monospace' }}>
                                {step.actionSnippet}
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={() => copySnippet(step.id, step.actionSnippet!)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px'
                              }}
                            >
                              <CopyIcon size={13} />
                              {copiedSnippetId === step.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        )}

                        {step.toolRecommendation && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Recommended Console Tool: <span style={{ color: 'var(--shield-cyan)' }}>{step.toolRecommendation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
