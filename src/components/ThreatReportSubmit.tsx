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
  InfoIcon,
  ClockIcon
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

  const sanitizedEvidencePreview = sanitizeContent(defensiveEvidence || '<!-- Example payload: transfer(recipient: adversary.testnet, key: ed25519:... [auto-scrubbed]) -->');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    onSubmitReport({
      title: sanitizeContent(title).slice(0, 150),
      threatCategory: category,
      severity,
      agentPlatform,
      targetAddressOrDomain: sanitizeContent(targetAddressOrDomain),
      description: sanitizeContent(description).slice(0, 4000),
      defensiveEvidence: sanitizeContent(defensiveEvidence),
      mitigationApplied: sanitizeContent(mitigationApplied).slice(0, 2000),
      isPublicConsented,
      reporterName,
      reporterEmail
    });

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setActiveTab('my-reports');
      setTitle('');
      setDescription('');
      setDefensiveEvidence('');
      setMitigationApplied('');
      setTargetAddressOrDomain('');
    }, 1800);
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
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <FileTextIcon size={22} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Threat Reporting & Evidence Collection
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Submit suspicious agent behaviors, prompt injection attempts, or key leakage patterns. Plain text only, automated redaction before storage.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
          <button
            onClick={() => setActiveTab('submit')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'submit' ? 'var(--shield-cyan)' : 'transparent',
              color: activeTab === 'submit' ? '#030712' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            Submit Threat Report
          </button>
          <button
            onClick={() => setActiveTab('my-reports')}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'my-reports' ? 'var(--shield-cyan)' : 'transparent',
              color: activeTab === 'my-reports' ? '#030712' : 'var(--text-muted)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>My Submitted Reports</span>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px'
            }}>
              {reports.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'submit' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {/* Submission Form */}
          <div className="card" style={{ padding: '24px' }}>
            {submittedSuccess ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid var(--near-emerald)',
                borderRadius: 'var(--radius-md)'
              }}>
                <CheckCircleIcon size={44} color="var(--near-emerald)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '14px', marginBottom: '8px' }}>
                  Threat Report Preserved & Published
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
                  Forensic payload sanitized. {isPublicConsented ? 'Your report has been published immediately to the community repository, labeled "Community report, not verified".' : 'Report saved privately to your workspace.'}
                </p>
                <div style={{ fontSize: '12px', color: 'var(--shield-cyan)' }}>
                  Redirecting to My Reports tracker...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Title */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                        Title *
                      </label>
                      <span style={{ fontSize: '11px', color: title.length > 140 ? 'var(--alert-amber)' : 'var(--text-muted)' }}>
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
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#f8fafc',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  {/* Category & Severity Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ThreatReportCategory)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#f8fafc',
                          fontSize: '13px'
                        }}
                      >
                        {PRD_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id} style={{ background: '#0f172a' }}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                        Assessed Severity *
                      </label>
                      <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#f8fafc',
                          fontSize: '13px'
                        }}
                      >
                        <option value="CRITICAL" style={{ background: '#0f172a', color: '#f43f5e' }}>CRITICAL — Autonomous Fund Drain / Key Leak</option>
                        <option value="HIGH" style={{ background: '#0f172a', color: '#f59e0b' }}>HIGH — Prompt Injection / Tool Hijack</option>
                        <option value="MEDIUM" style={{ background: '#0f172a', color: '#38bdf8' }}>MEDIUM — Data Leakage / Policy Warning</option>
                        <option value="LOW" style={{ background: '#0f172a', color: '#94a3b8' }}>LOW — Informational Telemetry Discrepancy</option>
                      </select>
                    </div>
                  </div>

                  {/* Agent Framework & Target */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                        Affected Agent Framework / Runtime
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., LangChain, ElizaOS, Custom Python, NEAR AI"
                        value={agentPlatform}
                        onChange={(e) => setAgentPlatform(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#f8fafc',
                          fontSize: '13px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                        Target Contract or Destination
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., store-vault.testnet or endpoint domain"
                        value={targetAddressOrDomain}
                        onChange={(e) => setTargetAddressOrDomain(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#f8fafc',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>

                  {/* What Happened (Description) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                        What Happened (Plain text only) *
                      </label>
                      <span style={{ fontSize: '11px', color: description.length > 3800 ? 'var(--alert-amber)' : 'var(--text-muted)' }}>
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
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#f8fafc',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* How to Defend (Mitigation Applied) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                        How to Defend (Plain text only) *
                      </label>
                      <span style={{ fontSize: '11px', color: mitigationApplied.length > 1900 ? 'var(--alert-amber)' : 'var(--text-muted)' }}>
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
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#f8fafc',
                        fontSize: '13px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Public Checkbox */}
                  <div style={{
                    padding: '16px',
                    background: isPublicConsented ? 'rgba(6, 182, 212, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                    border: isPublicConsented ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isPublicConsented}
                        onChange={(e) => setIsPublicConsented(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isPublicConsented ? (
                            <>
                              <GlobeIcon size={16} color="var(--shield-cyan)" />
                              I agree this report will be public
                            </>
                          ) : (
                            <>
                              <LockIcon size={16} color="var(--text-muted)" />
                              Private to my workspace only
                            </>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          {isPublicConsented
                            ? 'Published immediately to the community threat repository, labeled "Community report, not verified".'
                            : 'Unchecked = private to your workspace only.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Requirement 7: Form Notice */}
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#fbbf24'
                  }}>
                    <AlertTriangleIcon size={16} color="#fbbf24" />
                    <span>Report behavior, not people. No personal details or attack instructions.</span>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600 }}
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
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <EyeIcon size={16} color="var(--shield-cyan)" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Live Redaction Preview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copySanitizedPreview}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CopyIcon size={12} />
                  {copiedPreview ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#cbd5e1',
                maxHeight: '220px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {defensiveEvidence ? sanitizedEvidencePreview : '// Type in the fields to test real-time PII and key scrubbing.'}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <InfoIcon size={14} color="var(--shield-cyan)" />
                <span>Zero raw secrets: ed25519 seeds, bearer tokens, and emails are scrubbed before storage.</span>
              </div>
            </div>

            {/* Category Explanation Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                Category: {PRD_CATEGORIES.find(c => c.id === category)?.label}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {PRD_CATEGORIES.find(c => c.id === category)?.description}
              </p>
            </div>

            {/* Safeguards Card */}
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                Automated Safeguards
              </h4>
              <ul style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
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
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Workspace Threat Submissions Tracker
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Track your submitted community reports and workspace-private records.
                </p>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {reports.length} reports
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Report ID & Title</th>
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
                      ? { label: 'Hidden (3 Flags)', color: 'var(--critical-rose)' }
                      : rep.isConfirmed
                        ? { label: 'Confirmed', color: 'var(--near-emerald)' }
                        : rep.isPublicConsented
                          ? { label: 'Community report, not verified', color: 'var(--shield-cyan)' }
                          : { label: 'Workspace Private', color: 'var(--text-muted)' };

                    return (
                      <tr key={rep.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{rep.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rep.id} &bull; {rep.agentPlatform}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                            color: 'var(--shield-cyan)'
                          }}>
                            {rep.threatCategory}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: rep.severity === 'CRITICAL' ? '#f43f5e' : rep.severity === 'HIGH' ? '#f59e0b' : '#38bdf8'
                          }}>
                            {rep.severity}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {rep.isPublicConsented ? (
                            <span style={{ fontSize: '11px', color: 'var(--shield-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <GlobeIcon size={12} /> Public
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <LockIcon size={12} /> Private Only
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: `${statusBadge.color}20`,
                            border: `1px solid ${statusBadge.color}60`,
                            color: statusBadge.color
                          }}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
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
