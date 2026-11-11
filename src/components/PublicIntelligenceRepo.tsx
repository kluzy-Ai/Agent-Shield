'use client';

import React, { useState } from 'react';
import { ThreatReport } from '@/types';
import {
  GlobeIcon,
  SearchIcon,
  TagIcon,
  ThumbsUpIcon,
  ShieldCheckIcon,
  CopyIcon,
  AlertTriangleIcon,
  ClockIcon,
  XCircleIcon,
  FlagIcon
} from './icons';

interface PublicIntelligenceRepoProps {
  reports: ThreatReport[];
  onUpvoteHelpful: (reportId: string) => void;
  onSubmitNewReport?: () => void;
  isSignedIn?: boolean;
}

export function PublicIntelligenceRepo({
  reports,
  onUpvoteHelpful,
  onSubmitNewReport,
  isSignedIn = true
}: PublicIntelligenceRepoProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [flagModalReport, setFlagModalReport] = useState<ThreatReport | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagMessage, setFlagMessage] = useState<string | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<ThreatReport | null>(null);

  // Filter only public consented reports that are not hidden
  const publishedReports = reports.filter(
    (r) => r.isPublicConsented && !r.isHidden && (r.moderationStatus === 'VERIFIED_PUBLISHED' || r.moderationStatus === 'PENDING_REVIEW')
  );

  // Extract all unique tags
  const allTags = Array.from(
    new Set(publishedReports.flatMap((r) => r.tags || []))
  );

  // Filter by search & tag
  const filteredReports = publishedReports.filter((rep) => {
    const matchesSearch =
      rep.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.threatCategory && rep.threatCategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rep.agentPlatform && rep.agentPlatform.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = selectedTag === 'ALL' || (rep.tags && rep.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const handleUpvote = (id: string) => {
    if (upvotedIds[id]) return;
    setUpvotedIds((prev) => ({ ...prev, [id]: true }));
    onUpvoteHelpful(id);
  };

  const handleCopyRecord = (rep: ThreatReport) => {
    const json = JSON.stringify(
      {
        id: rep.id,
        title: rep.title,
        category: rep.threatCategory,
        severity: rep.severity,
        platform: rep.agentPlatform,
        description: rep.description,
        mitigation: rep.mitigationApplied,
        evidence: rep.evidenceSnippet || rep.defensiveEvidence,
        isConfirmed: Boolean(rep.isConfirmed)
      },
      null,
      2
    );
    navigator.clipboard.writeText(json);
    setCopiedId(rep.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalReport || !flagReason.trim()) return;

    setFlagSubmitting(true);
    setFlagMessage(null);
    try {
      const res = await fetch('/api/threat-intel/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: flagModalReport.id,
          reason: flagReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFlagMessage(data.error || 'Failed to flag report.');
      } else {
        setFlagMessage(data.message || 'Report flagged successfully.');
        setTimeout(() => {
          setFlagModalReport(null);
          setFlagReason('');
          setFlagMessage(null);
        }, 1800);
      }
    } catch (err: any) {
      setFlagMessage(err.message || 'Network error.');
    } finally {
      setFlagSubmitting(false);
    }
  };

  return (
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <GlobeIcon size={22} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Public Threat Intelligence Repository
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Open community repository of AI agent attack patterns and defenses. Publicly readable without sign-in.
          </p>
        </div>

        {onSubmitNewReport && (
          <button
            onClick={onSubmitNewReport}
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '8px 18px', fontWeight: 600 }}
          >
            Submit Threat Report
          </button>
        )}
      </div>

      {/* Search & Tag Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Search Box */}
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }}>
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              placeholder="Search threat patterns, affected runtimes, contract IDs, or attack vectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: '#f8fafc',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Tag Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <TagIcon size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px' }}>
            Tags:
          </span>
          <button
            onClick={() => setSelectedTag('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              border: selectedTag === 'ALL' ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
              background: selectedTag === 'ALL' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: selectedTag === 'ALL' ? 'var(--shield-cyan)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            All Reports ({publishedReports.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                border: selectedTag === tag ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                background: selectedTag === tag ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: selectedTag === tag ? 'var(--shield-cyan)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredReports.length === 0 ? (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              No threat intelligence records match your search criteria.
            </p>
          </div>
        ) : (
          filteredReports.map((rep) => {
            const isUpvoted = upvotedIds[rep.id];
            const currentHelpfulCount = (rep.helpfulCount || 0) + (isUpvoted ? 1 : 0);

            return (
              <div key={rep.id} className="card" style={{ padding: '24px' }}>
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--shield-cyan)' }}>
                        {rep.id}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                        color: 'var(--shield-cyan)',
                        fontWeight: 600
                      }}>
                        {rep.threatCategory}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: rep.severity === 'CRITICAL' ? '#f43f5e' : rep.severity === 'HIGH' ? '#f59e0b' : '#38bdf8'
                      }}>
                        {rep.severity}
                      </span>

                      {/* Requirement 5: Community report, not verified vs Confirmed */}
                      {rep.isConfirmed ? (
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--near-emerald)',
                          background: 'rgba(5, 150, 105, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(5, 150, 105, 0.35)',
                          fontWeight: 600
                        }}>
                          <ShieldCheckIcon size={12} /> Confirmed
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '11px',
                          color: '#fbbf24',
                          background: 'rgba(245, 158, 11, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontWeight: 500
                        }}>
                          Community report, not verified
                        </span>
                      )}

                      {rep.flagCount && rep.flagCount > 0 ? (
                        <span style={{ fontSize: '10px', color: 'var(--alert-amber)' }}>
                          Flags: {rep.flagCount}/3
                        </span>
                      ) : null}
                    </div>

                    <h3
                      onClick={() => setSelectedReportDetail(rep)}
                      style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', margin: 0, cursor: 'pointer' }}
                    >
                      {rep.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyRecord(rep)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CopyIcon size={12} />
                      {copiedId === rep.id ? 'Copied' : 'Export'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFlagModalReport(rep);
                        setFlagReason('');
                        setFlagMessage(null);
                      }}
                      title="Flag report as inappropriate or false"
                      style={{
                        background: 'rgba(244, 63, 94, 0.08)',
                        border: '1px solid rgba(244, 63, 94, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px',
                        color: '#fb7185',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FlagIcon size={12} color="#fb7185" />
                      Flag
                    </button>
                  </div>
                </div>

                {/* Plain text description - links are strictly plain text, never clickable */}
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '14px', wordBreak: 'break-word' }}>
                  {rep.description}
                </p>

                {/* Plain text evidence snippet */}
                {(rep.evidenceSnippet || rep.defensiveEvidence) && (
                  <div style={{
                    marginBottom: '14px',
                    background: '#090d16',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Sanitized Forensic Pattern
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#93c5fd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {rep.evidenceSnippet || rep.defensiveEvidence}
                    </div>
                  </div>
                )}

                {/* How to defend (plain text) */}
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--near-emerald)', textTransform: 'uppercase' }}>
                    How to Defend (Mitigation)
                  </div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '4px', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {rep.mitigationApplied}
                  </div>
                </div>

                {/* Card Bottom Row: Tags & Mitigation Feedback Counter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {rep.tags?.map((t) => (
                      <span key={t} style={{ fontSize: '11px', color: 'var(--shield-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                        {t}
                      </span>
                    ))}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      Runtime: {rep.agentPlatform}
                    </span>
                  </div>

                  {/* "This Helped" Feedback Counter */}
                  <button
                    type="button"
                    onClick={() => handleUpvote(rep.id)}
                    style={{
                      background: isUpvoted ? 'rgba(5, 150, 105, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: isUpvoted ? '1px solid var(--near-emerald)' : '1px solid var(--border-subtle)',
                      color: isUpvoted ? '#34d399' : 'var(--text-muted)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ThumbsUpIcon size={14} color={isUpvoted ? '#34d399' : 'currentColor'} />
                    <span>{isUpvoted ? 'Mitigation Marked Helpful' : 'This Helped'}</span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}>
                      {currentHelpfulCount}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Flag Modal */}
      {flagModalReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FlagIcon size={18} color="#fb7185" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Flag Threat Report
                </h3>
              </div>
              <button
                onClick={() => setFlagModalReport(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Reporting: <strong>{flagModalReport.title}</strong> ({flagModalReport.id}).
              After 3 flags from different accounts, reports are automatically hidden pending platform owner review.
            </p>

            {flagMessage && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '4px',
                background: flagMessage.includes('success') || flagMessage.includes('hidden') ? 'rgba(5, 150, 105, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: flagMessage.includes('success') || flagMessage.includes('hidden') ? '#34d399' : '#fb7185',
                fontSize: '12px',
                marginBottom: '14px'
              }}>
                {flagMessage}
              </div>
            )}

            <form onSubmit={handleFlagSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Reason for Flagging *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Contains personal details, attack instructions, or spam..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#f8fafc',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFlagModalReport(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagSubmitting || !flagReason.trim()}
                  className="btn btn-danger"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {flagSubmitting ? 'Flagging...' : 'Submit Flag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReportDetail && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--shield-cyan)', fontFamily: 'monospace' }}>
                  {selectedReportDetail.id}
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0', color: '#f8fafc' }}>
                  {selectedReportDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XCircleIcon size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--shield-cyan)' }}>
                {selectedReportDetail.threatCategory}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: selectedReportDetail.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b' }}>
                {selectedReportDetail.severity}
              </span>
              {selectedReportDetail.isConfirmed ? (
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                  Confirmed
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                  Community report, not verified
                </span>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                What Happened
              </h4>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, margin: 0, wordBreak: 'break-word' }}>
                {selectedReportDetail.description}
              </p>
            </div>

            {(selectedReportDetail.evidenceSnippet || selectedReportDetail.defensiveEvidence) && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Sanitized Evidence
                </h4>
                <div style={{ background: '#090d16', padding: '12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#93c5fd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedReportDetail.evidenceSnippet || selectedReportDetail.defensiveEvidence}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--near-emerald)', textTransform: 'uppercase', marginBottom: '4px' }}>
                How to Defend
              </h4>
              <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
                {selectedReportDetail.mitigationApplied}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedReportDetail(null)}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
