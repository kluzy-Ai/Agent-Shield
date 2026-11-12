'use client';

import React, { useState } from 'react';
import { ThreatReport } from '@/types';
import {
  SearchIcon,
  CloseIcon,
  CheckCircleIcon,
  AlertTriangleIcon
} from './icons';

interface PublicIntelligenceRepoProps {
  reports: ThreatReport[];
  onUpvoteHelpful: (reportId: string) => void;
  onSubmitNewReport?: () => void;
  isSignedIn?: boolean;
}

export function PublicIntelligenceRepo({
  reports = [],
  onUpvoteHelpful,
  onSubmitNewReport,
  isSignedIn = true
}: PublicIntelligenceRepoProps) {
  // Top view tabs
  const [activeViewTab, setActiveViewTab] = useState<'REPORTS' | 'TRENDS' | 'RULES' | 'GUIDES'>('REPORTS');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'HELPFUL' | 'NEWEST' | 'SEVERITY'>('HELPFUL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<string[]>([]);

  // Action states
  const [upvotedIds, setUpvotedIds] = useState<Record<string, number>>({});
  const [flagModalReport, setFlagModalReport] = useState<ThreatReport | null>(null);
  const [flagReason, setFlagReason] = useState('Spam or duplicate submission');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Filter only public consented reports that are not hidden
  const publicReports = reports.filter(
    (r) => r.isPublicConsented && !r.isHidden
  );

  // Helper to map attack category to readable type
  const getTypeDisplay = (cat?: string) => {
    switch (cat) {
      case 'PROMPT_INJECTION':
        return 'Trick instruction';
      case 'CREDENTIAL_EXPOSURE':
        return 'Leaked key';
      case 'AGENT_TOOL_HIJACKING':
        return 'Tool hijacking';
      case 'UNSAFE_TRANSACTION':
        return 'Unsafe payment';
      default:
        return 'Suspicious vector';
    }
  };

  // Helper for counts
  const countAll = publicReports.length;
  const countTrick = publicReports.filter((r) => r.threatCategory === 'PROMPT_INJECTION').length;
  const countKey = publicReports.filter((r) => r.threatCategory === 'CREDENTIAL_EXPOSURE').length;
  const countHijack = publicReports.filter((r) => r.threatCategory === 'AGENT_TOOL_HIJACKING').length;
  const countPayment = publicReports.filter((r) => r.threatCategory === 'UNSAFE_TRANSACTION').length;

  const countCritical = publicReports.filter((r) => r.severity === 'CRITICAL').length;
  const countHigh = publicReports.filter((r) => r.severity === 'HIGH').length;
  const countMedium = publicReports.filter((r) => r.severity === 'MEDIUM').length;

  const countConfirmed = publicReports.filter((r) => r.isConfirmed).length;
  const countUnverified = publicReports.filter((r) => !r.isConfirmed).length;

  // Filter logic
  const filteredReports = publicReports.filter((rep) => {
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = rep.title.toLowerCase().includes(q);
      const matchDesc = rep.description.toLowerCase().includes(q);
      const matchCat = rep.threatCategory?.toLowerCase().includes(q);
      const matchPlatform = rep.agentPlatform?.toLowerCase().includes(q);
      const matchTarget = rep.targetAddressOrDomain?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat && !matchPlatform && !matchTarget) return false;
    }

    // Tag
    if (selectedTag !== 'ALL') {
      const hasTag = rep.tags?.some((t) => t.toLowerCase().includes(selectedTag.toLowerCase()));
      const matchesCat = getTypeDisplay(rep.threatCategory).toLowerCase() === selectedTag.toLowerCase();
      const matchesPlatform = rep.agentPlatform?.toLowerCase().includes(selectedTag.toLowerCase());
      if (!hasTag && !matchesCat && !matchesPlatform) return false;
    }

    // Type
    if (selectedType !== 'ALL') {
      if (rep.threatCategory !== selectedType) return false;
    }

    // Severity
    if (selectedSeverities.length > 0) {
      if (!selectedSeverities.includes(rep.severity)) return false;
    }

    // Verification
    if (selectedVerification.length > 0) {
      const isConf = Boolean(rep.isConfirmed);
      if (selectedVerification.includes('CONFIRMED') && !isConf) return false;
      if (selectedVerification.includes('UNVERIFIED') && isConf) return false;
    }

    return true;
  });

  // Sorting
  filteredReports.sort((a, b) => {
    if (sortBy === 'HELPFUL') {
      const aVotes = (a.helpfulCount || 0) + (upvotedIds[a.id] || 0);
      const bVotes = (b.helpfulCount || 0) + (upvotedIds[b.id] || 0);
      return bVotes - aVotes;
    }
    if (sortBy === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0);
  });

  // Upvote action
  const handleUpvote = (id: string) => {
    if (upvotedIds[id]) return;
    setUpvotedIds((prev) => ({ ...prev, [id]: 1 }));
    onUpvoteHelpful(id);
    showToast('Feedback recorded: Marked mitigation as helpful!');
  };

  // Export action
  const handleExport = (rep: ThreatReport) => {
    const data = JSON.stringify(rep, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-report-${rep.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported threat report ${rep.id.toUpperCase()}`);
  };

  // Flag action
  const handleFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalReport) return;
    showToast(`Flag recorded for ${flagModalReport.id.toUpperCase()}. Review queued.`);
    setFlagModalReport(null);
  };

  const toggleSeverityCheckbox = (sev: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );
  };

  const toggleVerificationCheckbox = (v: string) => {
    setSelectedVerification((prev) =>
      prev.includes(v) ? prev.filter((item) => item !== v) : [...prev, v]
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Title, Subtitle and Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Threat Intelligence
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Real attacks on AI agents and how people defended against them. Anyone can read this without signing in.
          </p>
        </div>

        {onSubmitNewReport && (
          <button
            type="button"
            onClick={onSubmitNewReport}
            style={{
              padding: '8px 16px',
              background: '#065f46',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'nowrap'
            }}
          >
            Submit Threat Report
          </button>
        )}
      </div>

      {/* Action Toast Feedback */}
      {actionNotice && (
        <div style={{
          padding: '12px 18px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          {actionNotice}
        </div>
      )}

      {/* 2. Top View Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveViewTab('REPORTS')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeViewTab === 'REPORTS' ? '#065f46' : '#ffffff',
            color: activeViewTab === 'REPORTS' ? '#ffffff' : '#64748b',
            border: activeViewTab === 'REPORTS' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer'
          }}
        >
          Reports
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('TRENDS')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeViewTab === 'TRENDS' ? '#065f46' : '#ffffff',
            color: activeViewTab === 'TRENDS' ? '#ffffff' : '#64748b',
            border: activeViewTab === 'TRENDS' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer'
          }}
        >
          Trends
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('RULES')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeViewTab === 'RULES' ? '#065f46' : '#ffffff',
            color: activeViewTab === 'RULES' ? '#ffffff' : '#64748b',
            border: activeViewTab === 'RULES' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer'
          }}
        >
          Shared rules
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('GUIDES')}
          style={{
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            background: activeViewTab === 'GUIDES' ? '#065f46' : '#ffffff',
            color: activeViewTab === 'GUIDES' ? '#ffffff' : '#64748b',
            border: activeViewTab === 'GUIDES' ? 'none' : '1px solid #e2e8f0',
            cursor: 'pointer'
          }}
        >
          Guides
        </button>
      </div>

      {/* 3. Search & Keyword Filter Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Search Bar + Sort Dropdown */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search attacks, tools or account names"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="HELPFUL">Most helpful</option>
            <option value="NEWEST">Newest first</option>
            <option value="SEVERITY">Highest severity</option>
          </select>
        </div>

        {/* Keyword Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '2px'
        }}>
          <button
            type="button"
            onClick={() => setSelectedTag('ALL')}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: selectedTag === 'ALL' ? '#065f46' : '#f1f5f9',
              color: selectedTag === 'ALL' ? '#ffffff' : '#475569',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            All ({countAll})
          </button>

          {[
            'Prompt injection',
            'Key exposure',
            'Tool hijacking',
            'Price feed',
            'NEAR Intents',
            'ElizaOS',
            'LangChain'
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? 'ALL' : tag)}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                background: selectedTag === tag ? '#065f46' : '#f8fafc',
                color: selectedTag === tag ? '#ffffff' : '#475569',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tag}
            </button>
          ))}

          <span style={{
            padding: '4px 8px',
            fontSize: '11px',
            color: '#94a3b8',
            alignSelf: 'center',
            whiteSpace: 'nowrap'
          }}>
            + 12 more
          </span>
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="intel-layout-grid" style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Sidebar Filters */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          {/* Section 1: TYPE */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px' }}>
              TYPE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedType('ALL')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedType === 'ALL' ? '#dcfce7' : 'transparent',
                  color: selectedType === 'ALL' ? '#15803d' : '#0f172a',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: selectedType === 'ALL' ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>All</span>
                <span style={{ fontSize: '11px', color: selectedType === 'ALL' ? '#15803d' : '#64748b' }}>{countAll}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType(selectedType === 'PROMPT_INJECTION' ? 'ALL' : 'PROMPT_INJECTION')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedType === 'PROMPT_INJECTION' ? '#dcfce7' : 'transparent',
                  color: selectedType === 'PROMPT_INJECTION' ? '#15803d' : '#475569',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Trick instruction</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{countTrick}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType(selectedType === 'CREDENTIAL_EXPOSURE' ? 'ALL' : 'CREDENTIAL_EXPOSURE')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedType === 'CREDENTIAL_EXPOSURE' ? '#dcfce7' : 'transparent',
                  color: selectedType === 'CREDENTIAL_EXPOSURE' ? '#15803d' : '#475569',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Leaked key</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{countKey}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType(selectedType === 'AGENT_TOOL_HIJACKING' ? 'ALL' : 'AGENT_TOOL_HIJACKING')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedType === 'AGENT_TOOL_HIJACKING' ? '#dcfce7' : 'transparent',
                  color: selectedType === 'AGENT_TOOL_HIJACKING' ? '#15803d' : '#475569',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Tool hijacking</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{countHijack}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType(selectedType === 'UNSAFE_TRANSACTION' ? 'ALL' : 'UNSAFE_TRANSACTION')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: selectedType === 'UNSAFE_TRANSACTION' ? '#dcfce7' : 'transparent',
                  color: selectedType === 'UNSAFE_TRANSACTION' ? '#15803d' : '#475569',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>Unsafe payment</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{countPayment}</span>
              </button>
            </div>
          </div>

          {/* Section 2: SEVERITY */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px' }}>
              SEVERITY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes('CRITICAL')}
                  onChange={() => toggleSeverityCheckbox('CRITICAL')}
                  style={{ width: '14px', height: '14px', accentColor: '#065f46' }}
                />
                <span>Critical ({countCritical})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes('HIGH')}
                  onChange={() => toggleSeverityCheckbox('HIGH')}
                  style={{ width: '14px', height: '14px', accentColor: '#065f46' }}
                />
                <span>High ({countHigh})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedSeverities.includes('MEDIUM')}
                  onChange={() => toggleSeverityCheckbox('MEDIUM')}
                  style={{ width: '14px', height: '14px', accentColor: '#065f46' }}
                />
                <span>Medium ({countMedium})</span>
              </label>
            </div>
          </div>

          {/* Section 3: CHECKED BY US */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: '8px' }}>
              CHECKED BY US
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedVerification.includes('CONFIRMED')}
                  onChange={() => toggleVerificationCheckbox('CONFIRMED')}
                  style={{ width: '14px', height: '14px', accentColor: '#065f46' }}
                />
                <span>Confirmed ({countConfirmed})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedVerification.includes('UNVERIFIED')}
                  onChange={() => toggleVerificationCheckbox('UNVERIFIED')}
                  style={{ width: '14px', height: '14px', accentColor: '#065f46' }}
                />
                <span>Not verified ({countUnverified})</span>
              </label>
            </div>
          </div>

          {/* Disclaimer text */}
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            lineHeight: 1.45,
            borderTop: '1px solid #f1f5f9',
            paddingTop: '14px'
          }}>
            Reports not marked Confirmed come from the community and are not checked by us. They never change what Agent Shield blocks.
          </div>
        </div>

        {/* RIGHT COLUMN: Threat Report Cards Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredReports.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <CheckCircleIcon size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                No matching reports found
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Try clearing search or filters to see all community threat intelligence.
              </p>
            </div>
          ) : (
            filteredReports.map((rep) => {
              const currentHelpful = (rep.helpfulCount || 0) + (upvotedIds[rep.id] || 0);
              const typeText = getTypeDisplay(rep.threatCategory);
              const isConfirmed = Boolean(rep.isConfirmed);

              return (
                <div
                  key={rep.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Top Meta Line: ID + Badges + Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="font-mono" style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {rep.id}
                      </span>

                      <span style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {typeText}
                      </span>

                      {/* Severity Badge */}
                      <span style={{
                        background: rep.severity === 'CRITICAL' ? '#dc2626' : '#fef3c7',
                        color: rep.severity === 'CRITICAL' ? '#ffffff' : '#b45309',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {rep.severity === 'CRITICAL' ? 'Critical' : 'High'}
                      </span>

                      {/* Verification Status Badge */}
                      {isConfirmed ? (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          &check; Confirmed
                        </span>
                      ) : (
                        <span style={{
                          background: '#fef9c3',
                          color: '#a16207',
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Community report, not verified
                        </span>
                      )}
                    </div>

                    {/* Right buttons: Export & Flag */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleExport(rep)}
                        style={{
                          padding: '4px 10px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          color: '#0f172a',
                          cursor: 'pointer'
                        }}
                      >
                        Export
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlagModalReport(rep)}
                        style={{
                          padding: '4px 10px',
                          background: '#ffffff',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          color: '#dc2626',
                          cursor: 'pointer'
                        }}
                      >
                        Flag
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.35 }}>
                    {rep.title}
                  </h3>

                  {/* Summary Description */}
                  <p style={{ fontSize: '12.5px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                    {rep.description}
                  </p>

                  {/* WHAT IT LOOKED LIKE (PRIVATE DETAILS HIDDEN) */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      WHAT IT LOOKED LIKE (PRIVATE DETAILS HIDDEN)
                    </div>
                    <div style={{
                      background: '#0f172a',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono, monospace)',
                      lineHeight: 1.5,
                      overflowX: 'auto'
                    }}>
                      {rep.evidenceSnippet || rep.defensiveEvidence || 'Payload sanitized.'}
                    </div>
                  </div>

                  {/* HOW TO DEFEND */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      HOW TO DEFEND
                    </div>
                    <div style={{
                      background: '#f0fdf4',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: '#166534',
                      fontSize: '12px',
                      lineHeight: 1.45
                    }}>
                      {rep.mitigationApplied}
                    </div>
                  </div>

                  {/* Card Footer: Tags & This helped button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f8fafc'
                  }}>
                    {/* Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
                      {rep.tags?.map((tag) => (
                        <span key={tag} style={{ color: tag.startsWith('Runtime:') ? '#0f172a' : '#64748b' }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Upvote Button */}
                    <button
                      type="button"
                      onClick={() => handleUpvote(rep.id)}
                      style={{
                        padding: '5px 12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: upvotedIds[rep.id] ? '#15803d' : '#0f172a',
                        cursor: upvotedIds[rep.id] ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>This helped &bull; {currentHelpful}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Flag Report Modal */}
      {flagModalReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
              Flag Community Threat Report
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.45 }}>
              Flagging report <strong>{flagModalReport.id.toUpperCase()}</strong>. Reports flagged by 3 distinct community accounts are automatically hidden pending moderator review.
            </p>

            <form onSubmit={handleFlagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                  Reason for Flag
                </label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', color: '#0f172a' }}
                >
                  <option value="Spam or duplicate submission">Spam or duplicate submission</option>
                  <option value="Inaccurate technical details">Inaccurate technical details</option>
                  <option value="Harassment or inappropriate content">Harassment or inappropriate content</option>
                  <option value="Unsanitized sensitive credentials">Unsanitized sensitive credentials</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFlagModalReport(null)}
                  style={{ padding: '8px 14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 14px', background: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}
                >
                  Submit Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
