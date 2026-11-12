'use client';

import React, { useState } from 'react';
import { DetectionRule } from '@/types';
import {
  TrendingUpIcon,
  CopyIcon,
  DownloadIcon,
  AlertTriangleIcon
} from './icons';

interface ThreatTrendsAndRulesProps {
  rules: DetectionRule[];
  trendsData: {
    totalDetectionsFleet: number;
    preventedDrainsNear: string;
    avgContainmentTime: string;
    surgeIndicator: string;
    categoryBreakdown: { category: string; count: number; percent: number; trend: string }[];
    frameworkBreakdown: { framework: string; share: number }[];
  };
}

export function ThreatTrendsAndRules({ rules, trendsData }: ThreatTrendsAndRulesProps) {
  const [activeSection, setActiveSection] = useState<'trends' | 'rules'>('trends');
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);

  const selectedRule = rules.find((r) => r.id === selectedRuleId) || rules[0];

  const handleCopyRule = (rule: DetectionRule) => {
    navigator.clipboard.writeText(rule.ruleContent);
    setCopiedRuleId(rule.id);
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  const handleDownloadRule = (rule: DetectionRule) => {
    const ext = rule.format === 'SIGMA' ? 'yml' : rule.format === 'YARA' ? 'yar' : 'rule';
    const blob = new Blob([rule.ruleContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rule.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Sub-Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Threat Trends &amp; Detection Rules
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Monitor ecosystem-wide attack frequency trends and share automated detection rules across Agent Shield, Sigma, and YARA formats.
          </p>
        </div>

        {/* View Switcher (Segmented Pill Pattern) */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '3px' }}>
          <button
            type="button"
            onClick={() => setActiveSection('trends')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeSection === 'trends' ? '1px solid #e2e8f0' : 'none',
              cursor: 'pointer',
              background: activeSection === 'trends' ? '#065f46' : 'transparent',
              color: activeSection === 'trends' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Threat Trends &amp; Surge Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('rules')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeSection === 'rules' ? '1px solid #e2e8f0' : 'none',
              cursor: 'pointer',
              background: activeSection === 'rules' ? '#065f46' : 'transparent',
              color: activeSection === 'rules' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Detection Rules Sharing ({rules.length})
          </button>
        </div>
      </div>

      {activeSection === 'trends' ? (
        /* Threat Trends View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Fleet Interceptions (30D)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                {trendsData.totalDetectionsFleet}
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                100% telemetry audit logged
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Prevented Treasury Drains
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#065f46', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                {trendsData.preventedDrainsNear}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Halted by 1 yoctoNEAR rule &amp; spending caps
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Avg Autonomous Containment SLA
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px', letterSpacing: '-0.02em' }}>
                {trendsData.avgContainmentTime}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Gateway proxy inline response latency &lt; 85ms
              </div>
            </div>
          </div>

          {/* Surge Warning Alert Banner */}
          <div style={{
            padding: '16px 20px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <AlertTriangleIcon size={22} color="#b45309" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                Surge Threat Advisory
              </div>
              <div style={{ fontSize: '13px', color: '#78350f', marginTop: '2px' }}>
                {trendsData.surgeIndicator}
              </div>
            </div>
          </div>

          {/* Visual Breakdown Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
            {/* Category Distribution */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
                Attack Vectors by Category
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trendsData.categoryBreakdown.map((item) => (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.category}</span>
                      <span style={{ color: '#64748b' }}>
                        {item.count} attacks ({item.percent}%) &bull;{' '}
                        <span style={{ color: item.trend.startsWith('+') ? '#d97706' : '#059669', fontWeight: 600 }}>
                          {item.trend}
                        </span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.percent}%`,
                          height: '100%',
                          background: item.percent > 40 ? '#dc2626' : item.percent > 20 ? '#d97706' : '#059669',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Agent Frameworks */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>
                Targeted Agent Runtimes
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trendsData.frameworkBreakdown.map((item) => (
                  <div key={item.framework}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>{item.framework}</span>
                      <span style={{ color: '#065f46', fontWeight: 700 }}>{item.share}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.share}%`,
                          height: '100%',
                          background: '#065f46',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                Observed from honeypot probe agents &amp; consenting community threat telemetry over rolling 30-day window.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Detection Rules Sharing View */
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
          {/* Rules List Sidebar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verified Detection Rules
              </div>
            </div>

            <div>
              {rules.map((rule) => {
                const isSelected = rule.id === selectedRuleId;
                return (
                  <div
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #e2e8f0',
                      background: isSelected ? '#f0fdf4' : 'transparent',
                      borderLeft: isSelected ? '4px solid #065f46' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: '#475569'
                      }}>
                        {rule.format}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {rule.downloadsCount} imports
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {rule.title}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Target: {rule.targetPlatform}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rule Detail & Code Viewer */}
          {selectedRule && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#dcfce7',
                        color: '#166534'
                      }}>
                        {selectedRule.format} RULE
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: selectedRule.severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
                        color: selectedRule.severity === 'CRITICAL' ? '#b91c1c' : '#92400e'
                      }}>
                        {selectedRule.severity}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Author: {selectedRule.author} &bull; Updated: {selectedRule.updatedAt}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {selectedRule.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyRule(selectedRule)}
                      style={{
                        fontSize: '12px',
                        padding: '6px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        color: '#0f172a',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <CopyIcon size={14} color="#0f172a" />
                      <span>{copiedRuleId === selectedRule.id ? 'Copied' : 'Copy Rule'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadRule(selectedRule)}
                      style={{
                        fontSize: '12px',
                        padding: '6px 14px',
                        background: '#065f46',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <DownloadIcon size={14} color="#ffffff" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
                  {selectedRule.description}
                </p>

                {/* Syntax-Highlighted Rule Viewer */}
                <div>
                  <div style={{
                    padding: '8px 14px',
                    background: '#1e293b',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: '#475569'
                  }}>
                    <span>Specification: {selectedRule.format}</span>
                    <span style={{ color: '#065f46', fontWeight: 600 }}>Ready for Gateway Ingestion</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderTop: 'none',
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px',
                    color: '#0f172a',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '13px',
                    fontWeight: 500,
                    lineHeight: 1.6,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedRule.ruleContent}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
