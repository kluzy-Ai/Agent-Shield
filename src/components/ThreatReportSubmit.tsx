'use client';

import React, { useState } from 'react';
import {
  ThreatReport,
  ThreatReportCategory,
  SeverityLevel
} from '@/types';
import {
  ShieldAlertIcon,
  CheckCircleIcon,
  FileTextIcon,
  EyeIcon,
  LockIcon,
  GlobeIcon,
  AlertTriangleIcon,
  CopyIcon,
  InfoIcon
} from './icons';

interface ThreatReportSubmitProps {
  reports: ThreatReport[];
  onSubmitReport: (report: Partial<ThreatReport>) => void;
  initialReportData?: Partial<ThreatReport> | null;
}

const PRD_CATEGORIES: { id: ThreatReportCategory; label: string; description: string }[] = [
  { id: 'PROMPT_INJECTION', label: 'Prompt Injection', description: 'Attacker manipulated LLM context to override system instructions or extract sensitive data.' },
  { id: 'AGENT_TOOL_HIJACKING', label: 'Agent / Tool Hijacking', description: 'Malicious inputs redirected agent tool execution to unintended external endpoints or CLI commands.' },
  { id: 'UNAUTHORIZED_TOOL_USE', label: 'Unauthorized Tool Use', description: 'Agent accessed tools, APIs, or contract methods outside of its approved operational profile.' },
  { id: 'DATA_LEAKAGE', label: 'Data Leakage', description: 'Sensitive customer PII, internal files, or memory vectors were exposed in responses or logs.' },
  { id: 'CREDENTIAL_EXPOSURE', label: 'Credential Exposure / Key Leakage', description: 'Raw API keys, NEAR access keys, or bearer tokens were dumped in unencrypted storage or network egress.' },
  { id: 'PRIVILEGE_ESCALATION', label: 'Privilege Escalation', description: 'Agent transitioned from a restricted Function Call Key to unauthorized administrative actions.' },
  { id: 'MALICIOUS_TOOL_PLUGIN', label: 'Malicious Tool or Plugin', description: 'Third-party MCP server or plugin package contained backdoor or exfiltration logic.' },
  { id: 'UNSAFE_TRANSACTION', label: 'Unsafe Transaction / Liquidity Drain', description: 'Exploitative smart contract calls, slippage manipulation, or unauthorized balance drains.' },
  { id: 'IDENTITY_IMPERSONATION', label: 'Identity or Impersonation Abuse', description: 'Adversary spoofed agent identity or user identity to authorize rogue state changes.' },
  { id: 'DENIAL_OF_SERVICE', label: 'Denial of Service', description: 'Resource exhaustion attack flooding agent with recursive tasks or gas-depleting calls.' },
  { id: 'SUPPLY_CHAIN_COMPROMISE', label: 'Model or Agent Supply-Chain Compromise', description: 'Base foundation model or dependency repository was compromised upstream.' },
  { id: 'UNEXPECTED_AUTONOMOUS_BEHAVIOR', label: 'Unexpected Autonomous Behavior', description: 'Agent drifted from intended operational bounds without explicit external instruction.' }
];

export function ThreatReportSubmit({ reports, onSubmitReport, initialReportData }: ThreatReportSubmitProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'my-reports'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (p === 'my-reports') return 'my-reports';
    }
    return 'submit';
  });

  // Form State
  const [title, setTitle] = useState(initialReportData?.title || '');
  const [category, setCategory] = useState<ThreatReportCategory>((initialReportData?.threatCategory as ThreatReportCategory) || 'PROMPT_INJECTION');
  const [severity, setSeverity] = useState<SeverityLevel>(initialReportData?.severity || 'HIGH');
  const [agentPlatform, setAgentPlatform] = useState(initialReportData?.agentPlatform || 'LangChain + NEAR Intents');
  const [targetAddressOrDomain, setTargetAddressOrDomain] = useState(initialReportData?.targetAddressOrDomain || '');
  const [description, setDescription] = useState(initialReportData?.description || '');
  const [defensiveEvidence, setDefensiveEvidence] = useState(initialReportData?.defensiveEvidence || initialReportData?.evidenceSnippet || '');
  const [mitigationApplied, setMitigationApplied] = useState(initialReportData?.mitigationApplied || '');
  const [isPublicConsented, setIsPublicConsented] = useState(initialReportData?.isPublicConsented || false);
  const [reporterName, setReporterName] = useState(initialReportData?.reporterName || 'Operator (Self)');
  const [reporterEmail, setReporterEmail] = useState(initialReportData?.reporterEmail || '');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Synchronize when initialReportData changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__setThreatReportTab = (t: 'submit' | 'my-reports') => setActiveTab(t);
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'my-reports') {
        setActiveTab('my-reports');
      }
    }
    if (initialReportData) {
      if (initialReportData.title) setTitle(initialReportData.title);
      if (initialReportData.threatCategory) setCategory(initialReportData.threatCategory as ThreatReportCategory);
      if (initialReportData.severity) setSeverity(initialReportData.severity);
      if (initialReportData.agentPlatform) setAgentPlatform(initialReportData.agentPlatform);
      if (initialReportData.targetAddressOrDomain) setTargetAddressOrDomain(initialReportData.targetAddressOrDomain);
      if (initialReportData.description) setDescription(initialReportData.description);
      if (initialReportData.defensiveEvidence || initialReportData.evidenceSnippet) {
        setDefensiveEvidence(initialReportData.defensiveEvidence || initialReportData.evidenceSnippet || '');
      }
      if (initialReportData.mitigationApplied) setMitigationApplied(initialReportData.mitigationApplied);
      if (initialReportData.isPublicConsented !== undefined) setIsPublicConsented(initialReportData.isPublicConsented);
      setActiveTab('submit');
    }
  }, [initialReportData]);

  // Auto-sanitizer for live preview (PRD Section 11 & FR-11)
  const sanitizeContent = (text: string) => {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Strip HTML
      .replace(/ed25519:[a-zA-Z0-9]{40,96}/g, '[REDACTED_NEAR_PRIVATE_KEY]')
      .replace(/ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_BEARER_TOKEN]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL_PII]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[REDACTED_IP_ADDRESS]');
  };

  const sanitizedEvidencePreview = sanitizeContent(defensiveEvidence);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !mitigationApplied.trim()) return;

    const newReport: Partial<ThreatReport> = {
      title: title.trim(),
      threatCategory: category,
      severity,
      agentPlatform: agentPlatform.trim() || 'Custom Agent Runtime',
      targetAddressOrDomain: targetAddressOrDomain.trim() || undefined,
      description: sanitizeContent(description),
      evidenceSnippet: sanitizedEvidencePreview,
      defensiveEvidence: sanitizedEvidencePreview,
      mitigationApplied: sanitizeContent(mitigationApplied),
      isPublicConsented,
      reporterName: reporterName.trim() || 'Anonymous Operator',
      reporterEmail: reporterEmail.trim() || undefined,
      isConfirmed: false,
      moderationStatus: 'VERIFIED_PUBLISHED',
      flagCount: 0,
      helpfulCount: 0,
      createdAt: new Date().toISOString()
    };

    onSubmitReport(newReport);
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setActiveTab('my-reports');
      setTitle('');
      setDescription('');
      setDefensiveEvidence('');
      setMitigationApplied('');
      setTargetAddressOrDomain('');
    }, 1200);
  };

  const copySanitizedPreview = () => {
    const payload = JSON.stringify({
      title,
      category,
      severity,
      agentPlatform,
      isPublicConsented,
      evidence: sanitizedEvidencePreview,
      mitigation: sanitizeContent(mitigationApplied)
    }, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Threat Reporting &amp; Evidence Collection
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Submit suspicious agent behaviors, prompt injection attempts, or key leakage patterns. Plain text only, automated redaction before storage.
          </p>
        </div>

        {/* Tab Switcher (Segmented Pill Pattern) */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', gap: '3px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'submit' ? '1px solid #e2e8f0' : 'none',
              cursor: 'pointer',
              background: activeTab === 'submit' ? '#065f46' : 'transparent',
              color: activeTab === 'submit' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            Submit Threat Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my-reports')}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              border: activeTab === 'my-reports' ? '1px solid #e2e8f0' : 'none',
              cursor: 'pointer',
              background: activeTab === 'my-reports' ? '#065f46' : 'transparent',
              color: activeTab === 'my-reports' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>My Submitted Reports</span>
            <span style={{
              background: activeTab === 'my-reports' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'my-reports' ? '#ffffff' : '#0f172a',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '10px'
            }}>
              {reports.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'submit' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
          {/* Submission Form */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            {submittedSuccess ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px'
              }}>
                <CheckCircleIcon size={44} color="#16a34a" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginTop: '14px', marginBottom: '8px' }}>
                  Threat Report Preserved &amp; Published
                </h3>
                <p style={{ fontSize: '13px', color: '#15803d', maxWidth: '420px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                  Forensic payload sanitized. {isPublicConsented ? 'Your report has been published immediately to the community repository, labeled "Community report, not verified".' : 'Report saved privately to your workspace.'}
                </p>
                <div style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
                  Redirecting to My Reports tracker...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        Title *
                      </label>
                      <span style={{ fontSize: '11px', color: title.length > 140 ? '#b45309' : '#94a3b8' }}>
                        {title.length}/150
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={150}
                      placeholder="e.g., Hidden Prompt Injection in Refund Request Email"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Category & Severity Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ThreatReportCategory)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      >
                        {PRD_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        Assessed Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      >
                        <option value="CRITICAL">CRITICAL — Autonomous Fund Drain / Key Leak</option>
                        <option value="HIGH">HIGH — Prompt Injection / Tool Hijack</option>
                        <option value="MEDIUM">MEDIUM — Data Leakage / Policy Warning</option>
                        <option value="LOW">LOW — Informational Telemetry Discrepancy</option>
                      </select>
                    </div>
                  </div>

                  {/* Agent Framework & Target */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        Affected Agent Framework / Runtime
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., LangChain, ElizaOS, Custom Python, NEAR AI"
                        value={agentPlatform}
                        onChange={(e) => setAgentPlatform(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                        Target Contract or Destination
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., store-vault.testnet or endpoint domain"
                        value={targetAddressOrDomain}
                        onChange={(e) => setTargetAddressOrDomain(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#0f172a',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* What Happened (Description) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        What Happened (Plain text only) *
                      </label>
                      <span style={{ fontSize: '11px', color: description.length > 3800 ? '#b45309' : '#94a3b8' }}>
                        {description.length}/4000
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      maxLength={4000}
                      placeholder="Explain what the agent was doing, the sequence of instructions received, and how the vulnerability materialized..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '13px',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* How to Defend (Mitigation Applied) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        How to Defend (Plain text only) *
                      </label>
                      <span style={{ fontSize: '11px', color: mitigationApplied.length > 1900 ? '#b45309' : '#94a3b8' }}>
                        {mitigationApplied.length}/2000
                      </span>
                    </div>
                    <textarea
                      required
                      rows={3}
                      maxLength={2000}
                      placeholder="e.g., Enforce 1 yoctoNEAR human approval gate, add destination allowlist, reject unstructured prompt injection tokens."
                      value={mitigationApplied}
                      onChange={(e) => setMitigationApplied(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#0f172a',
                        fontSize: '13px',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Public Checkbox */}
                  <div style={{
                    padding: '14px 16px',
                    background: isPublicConsented ? '#f0fdf4' : '#f8fafc',
                    border: isPublicConsented ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isPublicConsented}
                        onChange={(e) => setIsPublicConsented(e.target.checked)}
                        style={{ marginTop: '3px', accentColor: '#065f46' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isPublicConsented ? (
                            <>
                              <GlobeIcon size={16} color="#065f46" />
                              <span>I agree this report will be public</span>
                            </>
                          ) : (
                            <>
                              <LockIcon size={16} color="#64748b" />
                              <span>Private to my workspace only</span>
                            </>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                          {isPublicConsented
                            ? 'Published immediately to the community threat repository, labeled "Community report, not verified".'
                            : 'Unchecked = private to your workspace only.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Safeguard Form Notice */}
                  <div style={{
                    padding: '10px 14px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#92400e'
                  }}>
                    <AlertTriangleIcon size={16} color="#b45309" />
                    <span>Report behavior, not people. No personal details or attack instructions.</span>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 24px',
                        background: '#065f46',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ffffff',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      Submit Threat Report
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Live Redaction Preview & Safeguard Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Live Redaction Preview Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EyeIcon size={16} color="#065f46" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Live Redaction Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copySanitizedPreview}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CopyIcon size={12} color="#0f172a" />
                  <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                color: '#0f172a',
                lineHeight: 1.6,
                maxHeight: '220px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {defensiveEvidence ? sanitizedEvidencePreview : '// Type in the fields to test real-time PII and key scrubbing.'}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                <InfoIcon size={14} color="#065f46" />
                <span>Zero raw secrets: ed25519 seeds, bearer tokens, and emails are scrubbed before storage.</span>
              </div>
            </div>

            {/* Category Explanation Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Category: {PRD_CATEGORIES.find(c => c.id === category)?.label}
              </h4>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                {PRD_CATEGORIES.find(c => c.id === category)?.description}
              </p>
            </div>

            {/* Safeguards Card */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Automated Safeguards
              </h4>
              <ul style={{ fontSize: '12px', color: '#64748b', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
                <li>No attachments allowed (plain text only).</li>
                <li>Links render as plain text, never clickable.</li>
                <li>Rate limit: 5 reports per 10 minutes, daily cap per account.</li>
                <li>Reports with 3 community flags are auto-hidden pending platform review.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* My Submitted Reports Tracker */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Workspace Threat Submissions Tracker
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
                  Track your submitted community reports and workspace-private records.
                </p>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {reports.length} reports
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Report ID &amp; Title</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Severity</th>
                    <th style={{ padding: '12px 16px' }}>Visibility</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((rep) => {
                    const statusBadge = rep.isHidden
                      ? { label: 'Hidden (3 Flags)', bg: '#fee2e2', color: '#b91c1c' }
                      : rep.isConfirmed
                        ? { label: 'Confirmed', bg: '#dcfce7', color: '#166534' }
                        : rep.isPublicConsented
                          ? { label: 'Community report, not verified', bg: '#fef3c7', color: '#92400e' }
                          : { label: 'Workspace Private', bg: '#f1f5f9', color: '#475569' };

                    return (
                      <tr key={rep.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{rep.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{rep.id} &bull; {rep.agentPlatform}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {rep.threatCategory}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: rep.severity === 'CRITICAL' ? '#dc2626' : rep.severity === 'HIGH' ? '#ea580c' : '#0284c7'
                          }}>
                            {rep.severity}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {rep.isPublicConsented ? (
                            <span style={{ fontSize: '11px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <GlobeIcon size={12} color="#065f46" /> Public
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <LockIcon size={12} color="#64748b" /> Private Only
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: statusBadge.bg,
                            color: statusBadge.color
                          }}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
