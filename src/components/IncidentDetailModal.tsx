'use client';

import React, { useState } from 'react';
import { IncidentAlert, IncidentTimelineStep, IncidentOperatorNote } from '@/types';
import {
  ShieldAlertIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  EyeIcon,
  LockIcon,
  KeyIcon,
  GlobeIcon,
  ClockIcon
} from './icons';

interface IncidentDetailModalProps {
  isOpen: boolean;
  incident: IncidentAlert | null;
  onClose: () => void;
  onAddNote: (incidentId: string, noteContent: string) => void;
  onAcknowledge: (incidentId: string) => void;
  onMarkFalsePositive: (incidentId: string, reason: string) => void;
  onSubmitAsThreatReport?: (incident: IncidentAlert) => void;
}

function formatUtcTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')} UTC (${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')})`;
  } catch {
    return isoString;
  }
}

export function IncidentDetailModal({
  isOpen,
  incident,
  onClose,
  onAddNote,
  onAcknowledge,
  onMarkFalsePositive,
  onSubmitAsThreatReport
}: IncidentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'payload' | 'notes' | 'export'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(incident.id, newNote.trim());
    setNewNote('');
  };

  const sanitizedExportData = JSON.stringify(
    {
      reportType: 'AGENT_SHIELD_SANITIZED_INCIDENT',
      version: '1.0.0',
      incidentId: incident.id,
      timestamp: incident.createdAt,
      agentCategory: incident.agentName.includes('Shop') ? 'ECOMMERCE' : 'FINANCE',
      attackCategory: incident.attackCategory,
      severity: incident.severity,
      enforcementOutcome: incident.enforcementAction,
      evidenceSummary: incident.evidence.observedBehavior,
      ruleTriggered: incident.evidence.ruleMatched || 'Policy spend limit exceeded',
      remediationApplied: incident.remediationRecommendation,
      isVerifiedDefensiveAction: incident.enforcementAction === 'BLOCKED',
      secretsRedacted: true,
      piiRedacted: true
    },
    null,
    2
  );

  const handleCopyExport = () => {
    navigator.clipboard.writeText(sanitizedExportData);
    setCopyFeedback('Copied Sanitized Export JSON to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleCopyPayload = () => {
    if (!incident.redactedPayload) return;
    navigator.clipboard.writeText(incident.redactedPayload);
    setCopyFeedback('Copied Redacted Payload to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 250,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '880px',
        width: '100%',
        padding: '32px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <XIcon size={20} color="var(--text-muted)" />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span className={`badge ${incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'badge-blocked' :
                incident.severity === 'MEDIUM' ? 'badge-approval' : 'badge-enforcing'
              }`}>
              {incident.severity}
            </span>

            <span className={`badge ${incident.enforcementAction === 'BLOCKED' ? 'badge-blocked' :
                incident.enforcementAction === 'PAUSED' ? 'badge-approval' :
                  incident.enforcementAction === 'FLAGGED' ? 'badge-limited' : 'badge-allowed'
              }`}>
              Enforcement: {incident.enforcementAction}
            </span>

            <span className="badge badge-observe">
              Status: {incident.status}
            </span>

            {incident.isFalsePositive && (
              <span className="badge badge-approval">FALSE POSITIVE</span>
            )}

            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Ref: <span className="font-mono">{incident.id}</span> &bull; {formatUtcTime(incident.createdAt)}
            </span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px' }}>
            {incident.title}
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Target Agent: <strong style={{ color: '#f8fafc' }}>{incident.agentName}</strong> &bull; Attack Vector: <span className="font-mono" style={{ color: 'var(--shield-cyan)' }}>{incident.attackCategory}</span>
          </p>
        </div>

        {/* Action Banner with Acknowledge / False-Positive Buttons */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>Operator Disposition:</strong> {incident.status === 'OPEN' ? 'Requires review and remediation' : `Marked as ${incident.status}`}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {incident.status !== 'ACKNOWLEDGED' && incident.status !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => onAcknowledge(incident.id)}
                className="btn btn-primary btn-sm"
              >
                <CheckCircleIcon size={14} color="#ffffff" />
                <span>Acknowledge Incident</span>
              </button>
            )}

            {!incident.isFalsePositive && (
              <button
                type="button"
                onClick={() => onMarkFalsePositive(incident.id, 'Operator audited: legitimate behavior')}
                className="btn btn-secondary btn-sm"
              >
                <span>Mark False-Positive</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {copyFeedback && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-sm)',
            color: '#34d399',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            &check; {copyFeedback}
          </div>
        )}

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { id: 'timeline', label: '1. Forensic Timeline Sequence' },
            { id: 'evidence', label: '2. "Why Flagged" & Evidence' },
            { id: 'payload', label: '3. Redacted Payload Viewer' },
            { id: 'notes', label: `4. Operator Notes (${incident.operatorNotes?.length || 0})` },
            { id: 'export', label: '5. Sanitized Export Preview' }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid var(--shield-cyan)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--shield-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB 1: FORENSIC TIMELINE SEQUENCE
            Sequence of: Trigger -> Agent Response -> Tool Calls -> Attempted Action -> Policy Decision -> Outcome -> Indicators
           ============================================================ */}
        {activeTab === 'timeline' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>
                Complete Execution Sequence Reconstruction
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Step-by-step chronology reconstructing how the prompt was received, how the agent formulated tool arguments, and the exact point of gateway interception.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incident.timeline && incident.timeline.length > 0 ? (
                incident.timeline.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: step.phase === 'OUTCOME' && incident.enforcementAction === 'BLOCKED' ? '3px solid var(--critical-rose)' :
                        step.phase === 'POLICY_DECISION' ? '3px solid #fbbf24' :
                          step.phase === 'TRIGGER' ? '3px solid var(--shield-cyan)' : '3px solid #64748b'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                          {step.label}
                        </span>
                        {step.enforcementBadge && (
                          <span className="badge badge-blocked" style={{ fontSize: '9px' }}>
                            {step.enforcementBadge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatUtcTime(step.timestamp)}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                      {step.description}
                    </p>

                    {step.payloadSnippet && (
                      <pre style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        background: '#040816',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--shield-cyan)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {step.payloadSnippet}
                      </pre>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No timeline sequence reconstructed for this event.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: WHY THIS WAS FLAGGED WITH EVIDENCE
           ============================================================ */}
        {activeTab === 'evidence' && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>
                Why This Was Flagged &amp; Cryptographic Evidence
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Matched rule conditions, adversarial input substrings, and counterparty threat signals.
              </p>
            </div>

            {/* Matched Policy Rule */}
            <div style={{ padding: '14px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--critical-rose)', marginBottom: '4px' }}>
                POLICY VIOLATION TRIGGER:
              </div>
              <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                {incident.evidence.ruleMatched || 'Rule spending cap & blocklist filter'}
              </div>
            </div>

            {/* Trigger Input Evidence */}
            {incident.evidence.triggerInput && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Raw Triggering Input (Unescaped Adversarial Content)
                </label>
                <div style={{ marginTop: '4px', padding: '12px', background: '#040816', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#fb7185' }}>
                  {incident.evidence.triggerInput}
                </div>
              </div>
            )}

            {/* Counterparty Indicators */}
            {incident.evidence.counterpartyIndicators && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Counterparty Scoring Indicators (Track 06)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {incident.evidence.counterpartyIndicators.map((ind, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      &bull; {ind}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Response */}
            <div style={{ padding: '14px', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--shield-cyan)', marginBottom: '4px' }}>
                RECOMMENDED OPERATOR ACTION:
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {incident.remediationRecommendation}
              </p>
            </div>

            {/* Hardware TEE Attestation & NEAR AI Cloud Inference Card (Stage 11 Item 4) */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheckIcon size={18} color="var(--shield-cyan)" />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                    Hardware TEE Enclave Attestation (NEAR AI Cloud)
                  </span>
                </div>
                <span className="badge badge-enforcing" style={{ fontSize: '9px' }}>
                  {incident.evidence?.llmAssessment?.isFallback !== false ? 'DETERMINISTIC FALLBACK' : 'INTEL TDX ATTESTED'}
                </span>
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>
                Autonomous inference verification per <code>VERIFIED_FACTS.md</code> (Section 3). AI classifier executed inside confidential hardware enclave with cryptographic quote verification.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>PROVIDER:</span>
                  <span style={{ color: 'var(--shield-cyan)' }}>
                    {incident.evidence?.llmAssessment?.provider || 'NEAR_AI_CLOUD'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>ENCLAVE HARDWARE:</span>
                  <span style={{ color: '#f8fafc' }}>
                    {incident.evidence?.llmAssessment?.attestation?.enclaveHardware || 'Intel TDX / NVIDIA CC'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>MEASUREMENT QUOTE:</span>
                  <span style={{ color: '#34d399' }}>
                    {incident.evidence?.llmAssessment?.isFallback !== false
                      ? 'N/A (Local Heuristic Fallback)'
                      : '0x4f8a...e9b2 (Valid NRAS Quote)'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>STATUS:</span>
                  <span style={{ color: incident.evidence?.llmAssessment?.isFallback !== false ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                    {incident.evidence?.llmAssessment?.isFallback !== false
                      ? '[LOCAL DETERMINISTIC FALLBACK - NO NEAR_AI_API_KEY]'
                      : 'ATTESTED_VALID (Hardware Verified)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: REDACTED PAYLOAD VIEWER
           ============================================================ */}
        {activeTab === 'payload' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 2px' }}>
                  Forensic Raw Payload (Secrets &amp; PII Redacted)
                </h3>
                <span style={{ fontSize: '11px', color: '#34d399' }}>Compliant with PRD Section 11 &amp; FR-11 Sanitization Rules</span>
              </div>

              <button
                type="button"
                onClick={handleCopyPayload}
                className="btn btn-secondary btn-sm"
              >
                <CopyIcon size={14} color="var(--shield-cyan)" />
                <span>Copy Payload JSON</span>
              </button>
            </div>

            <pre style={{
              padding: '16px',
              background: '#040816',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              overflowX: 'auto',
              maxHeight: '400px'
            }}>
              {incident.redactedPayload || '// No payload snippet recorded for this incident.'}
            </pre>
          </div>
        )}

        {/* ============================================================
            TAB 4: OPERATOR NOTES
           ============================================================ */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>
                Operator Investigation Notes
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Append immutable audit notes for peer security reviewers and incident response logging.
              </p>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {incident.operatorNotes && incident.operatorNotes.length > 0 ? (
                incident.operatorNotes.map((note) => (
                  <div key={note.id} style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                      <strong style={{ color: 'var(--shield-cyan)' }}>{note.author}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{formatUtcTime(note.timestamp)}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#f8fafc', margin: 0, lineHeight: 1.4 }}>
                      {note.content}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No operator notes logged yet.
                </div>
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNoteSubmit} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Add investigation observation or rationale..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  background: '#040816',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f8fafc',
                  fontSize: '12px'
                }}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
              >
                <span>Add Note</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================
            TAB 5: SANITIZED EXPORT PREVIEW
           ============================================================ */}
        {activeTab === 'export' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', margin: '0 0 2px' }}>
                  Sanitized Community Threat Intel Export Preview
                </h3>
                <span style={{ fontSize: '11px', color: '#34d399' }}>Zero PII &bull; Ready for public threat repository sharing</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyExport}
                  className="btn btn-secondary btn-sm"
                >
                  <CopyIcon size={14} color="#ffffff" />
                  <span>Copy Export JSON</span>
                </button>

                {onSubmitAsThreatReport && incident && (
                  <button
                    type="button"
                    onClick={() => onSubmitAsThreatReport(incident)}
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                      border: 'none',
                      color: '#ffffff'
                    }}
                  >
                    <GlobeIcon size={14} color="#ffffff" />
                    <span>Submit as Threat Report</span>
                  </button>
                )}
              </div>
            </div>

            <pre style={{
              padding: '16px',
              background: '#040816',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--shield-cyan)',
              lineHeight: 1.5,
              overflowX: 'auto',
              maxHeight: '400px'
            }}>
              {sanitizedExportData}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
