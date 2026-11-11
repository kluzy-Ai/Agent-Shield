'use client';

import React, { useState } from 'react';
import { DetectionRule } from '@/types';
import {
  TrendingUpIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuIcon,
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
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Top Header & Sub-Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <TrendingUpIcon size={22} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Threat Trends & Detection Rules
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Monitor ecosystem-wide attack frequency trends and share automated detection rules across Agent Shield, Sigma, and YARA formats.
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
          <button
            onClick={() => setActiveSection('trends')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'trends' ? 'var(--shield-cyan)' : 'transparent',
              color: activeSection === 'trends' ? '#030712' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Threat Trends & Surge Analytics
          </button>
          <button
            onClick={() => setActiveSection('rules')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeSection === 'rules' ? 'var(--shield-cyan)' : 'transparent',
              color: activeSection === 'rules' ? '#030712' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Detection Rules Sharing ({rules.length})
          </button>
        </div>
      </div>

      {activeSection === 'trends' ? (
        /* Threat Trends View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Fleet Interceptions (30D)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', margin: '8px 0 4px' }}>
                {trendsData.totalDetectionsFleet}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--near-emerald)' }}>
                100% telemetry audit logged
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Prevented Treasury Drains
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--near-emerald)', margin: '8px 0 4px' }}>
                {trendsData.preventedDrainsNear}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Halted by 1 yoctoNEAR rule & spending caps
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Avg Autonomous Containment SLA
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--shield-cyan)', margin: '8px 0 4px' }}>
                {trendsData.avgContainmentTime}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Gateway proxy inline response latency &lt; 85ms
              </div>
            </div>
          </div>

          {/* Surge Warning Alert Banner */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <AlertTriangleIcon size={24} color="#f59e0b" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                Surge Threat Advisory
              </div>
              <div style={{ fontSize: '13px', color: '#fed7aa', marginTop: '2px' }}>
                {trendsData.surgeIndicator}
              </div>
            </div>
          </div>

          {/* Visual Breakdown Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
            {/* Category Distribution */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
                Attack Vectors by Category
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trendsData.categoryBreakdown.map((item) => (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.category}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.count} attacks ({item.percent}%) &bull;{' '}
                        <span style={{ color: item.trend.startsWith('+') ? '#f59e0b' : '#34d399' }}>
                          {item.trend}
                        </span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.percent}%`,
                          height: '100%',
                          background: item.percent > 40 ? 'var(--critical-rose)' : item.percent > 20 ? 'var(--alert-amber)' : 'var(--shield-cyan)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Agent Frameworks */}
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
                Targeted Agent Runtimes
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trendsData.frameworkBreakdown.map((item) => (
                  <div key={item.framework}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.framework}</span>
                      <span style={{ color: 'var(--shield-cyan)' }}>{item.share}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${item.share}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                Observed from honeypot probe agents & consenting community threat telemetry over rolling 30-day window.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Detection Rules Sharing View */
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
          {/* Rules List Sidebar */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.6)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--shield-cyan)' : '3px solid transparent',
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
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {rule.format}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {rule.downloadsCount} imports
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                      {rule.title}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        color: 'var(--shield-cyan)'
                      }}>
                        {selectedRule.format} RULE
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: selectedRule.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b'
                      }}>
                        {selectedRule.severity}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Author: {selectedRule.author} &bull; Updated: {selectedRule.updatedAt}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      {selectedRule.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyRule(selectedRule)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CopyIcon size={14} />
                      {copiedRuleId === selectedRule.id ? 'Copied' : 'Copy Rule'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadRule(selectedRule)}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <DownloadIcon size={14} />
                      Download
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '16px' }}>
                  {selectedRule.description}
                </p>

                {/* Syntax-Highlighted Rule Viewer */}
                <div>
                  <div style={{
                    padding: '8px 14px',
                    background: '#090d16',
                    borderTopLeftRadius: 'var(--radius-sm)',
                    borderTopRightRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    borderBottom: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>Specification: {selectedRule.format}</span>
                    <span style={{ color: 'var(--shield-cyan)' }}>Ready for Gateway Ingestion</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: '#030712',
                    border: '1px solid var(--border-subtle)',
                    borderBottomLeftRadius: 'var(--radius-sm)',
                    borderBottomRightRadius: 'var(--radius-sm)',
                    color: '#93c5fd',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    lineHeight: 1.5,
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
