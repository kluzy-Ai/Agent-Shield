'use client';

import React, { useState } from 'react';
import { DefensivePlaybook } from '@/types';
import {
  ClockIcon,
  CopyIcon,
  CheckIcon,
  TerminalIcon
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
  const getPhaseStyle = (phase: string) => {
    switch (phase) {
      case 'IDENTIFY': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'CONTAIN': return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
      case 'ERADICATE': return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
      case 'RECOVER': return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case 'POST_INCIDENT': return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Defensive Incident Playbooks
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Standardized incident response workflows for high-severity AI agent security incidents. Execute step-by-step containment procedures.
          </p>
        </div>
      </div>

      {/* Main Grid: Playbook Navigation + Active Playbook Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
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
                style={{
                  background: isSelected ? '#f0fdf4' : '#ffffff',
                  border: isSelected ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderLeft: isSelected ? '4px solid #065f46' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: pb.severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
                    color: pb.severity === 'CRITICAL' ? '#b91c1c' : '#92400e'
                  }}>
                    {pb.severity}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ClockIcon size={12} color="#64748b" /> SLA: {pb.estimatedSla}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {pb.title}
                </div>

                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>
                  {pb.threatVector}
                </div>

                {/* Progress Meter */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    <span>Progress: {finishedCount}/{totalSteps} steps</span>
                    <span style={{ color: finishedCount === totalSteps ? '#166534' : '#065f46', fontWeight: 700 }}>
                      {progressPercent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: finishedCount === totalSteps ? '#16a34a' : '#065f46',
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
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px 24px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#065f46', fontWeight: 700 }}>
                      {selectedPlaybook.id}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Target Agents: {selectedPlaybook.targetAgentTypes.join(', ')}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {selectedPlaybook.title}
                  </h3>
                </div>

                <div style={{
                  padding: '6px 12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ClockIcon size={14} color="#166534" /> Target Containment SLA: {selectedPlaybook.estimatedSla}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                {selectedPlaybook.summary}
              </p>
            </div>

            {/* Checklist of Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedPlaybook.steps.map((step) => {
                const isChecked = !!completedSteps[step.id];
                const phaseStyle = getPhaseStyle(step.phase);

                return (
                  <div
                    key={step.id}
                    style={{
                      background: isChecked ? '#f0fdf4' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderLeft: isChecked ? '4px solid #16a34a' : `4px solid ${phaseStyle.color}`,
                      borderRadius: '10px',
                      padding: '16px 20px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
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
                          borderRadius: '6px',
                          border: isChecked ? 'none' : '1px solid #cbd5e1',
                          background: isChecked ? '#065f46' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          marginTop: '2px',
                          flexShrink: 0
                        }}
                      >
                        {isChecked && <CheckIcon size={14} color="#ffffff" strokeWidth={3} />}
                      </button>

                      {/* Step Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: phaseStyle.bg,
                            color: phaseStyle.color,
                            border: `1px solid ${phaseStyle.border}`
                          }}>
                            {step.phase}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: isChecked ? '#64748b' : '#0f172a', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {step.title}
                          </span>
                          {step.requiresConsensus && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a'
                            }}>
                              Requires 1 YoctoNEAR / Consensus
                            </span>
                          )}
                        </div>

                        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 10px' }}>
                          {step.instruction}
                        </p>

                        {/* Action Command / Snippet if present */}
                        {step.actionSnippet && (
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
                              <TerminalIcon size={14} color="#065f46" />
                              <code style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                                {step.actionSnippet}
                              </code>
                            </div>
                            <button
                              type="button"
                              onClick={() => copySnippet(step.id, step.actionSnippet!)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                color: '#065f46',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}
                            >
                              <CopyIcon size={13} color="#065f46" />
                              <span>{copiedSnippetId === step.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        )}

                        {step.toolRecommendation && (
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Recommended Console Tool: <span style={{ color: '#065f46', fontWeight: 600 }}>{step.toolRecommendation}</span>
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
