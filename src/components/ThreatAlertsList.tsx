'use client';

import React, { useState } from 'react';
import { IncidentAlert, SeverityLevel } from '@/types';

interface ThreatAlertsListProps {
  incidents: IncidentAlert[];
  onSelectIncident: (incident: IncidentAlert) => void;
  onBulkAcknowledge: (incidentIds: string[]) => void;
  onMarkFalsePositive: (incidentId: string, reason: string) => void;
  onPauseAgent?: (agentId: string) => void;
  onDisconnectAgent?: (agentId: string) => void;
}

function timeAgo(isoString?: string): string {
  if (!isoString) return 'recently';
  try {
    const diffMs = Math.abs(Date.now() - new Date(isoString).getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return '20 min ago';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h ago`;
    return `${Math.floor(diffHours / 24)} d ago`;
  } catch {
    return '20 min ago';
  }
}

function formatDetailDate(isoString?: string): string {
  if (!isoString) return '11 Nov 2026, 13:24 UTC';
  try {
    const d = new Date(isoString);
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`;
    return `${day}, ${time}`;
  } catch {
    return '11 Nov 2026, 13:24 UTC';
  }
}

function formatCategory(cat?: string): string {
  if (!cat) return 'Suspicious behavior';
  const c = cat.toUpperCase();
  if (c.includes('PROMPT') || c.includes('INJECTION')) return 'Trick instruction (prompt injection)';
  if (c.includes('COUNTERPARTY') || c.includes('RECEIVER')) return 'Suspicious receiver';
  if (c.includes('DATA') || c.includes('EXFILTRATION')) return 'Data sent out';
  if (c.includes('SPEND')) return 'Unauthorized payment';
  return cat;
}

export function ThreatAlertsList({
  incidents = [],
  onSelectIncident,
  onBulkAcknowledge,
  onMarkFalsePositive,
  onPauseAgent,
  onDisconnectAgent
}: ThreatAlertsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'INVESTIGATING' | 'ACKNOWLEDGED'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedIncidentId, setInspectedIncidentId] = useState<string>(incidents[0]?.id || 'inc-0412');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Status counts
  const totalCount = incidents.length;
  const newCount = incidents.filter((i) => i.status === 'OPEN').length;
  const investigatingCount = incidents.filter((i) => i.status === 'INVESTIGATING').length;
  const acknowledgedCount = incidents.filter((i) => i.status === 'ACKNOWLEDGED').length;

  // Unique agents
  const agentNames = Array.from(new Set(incidents.map((i) => i.agentName)));

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedAgent !== 'ALL' && inc.agentName !== selectedAgent) return false;
    if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) return false;
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchAgent = inc.agentName.toLowerCase().includes(q);
      const matchSummary = inc.summary.toLowerCase().includes(q);
      const matchDest = inc.evidence?.destination?.toLowerCase().includes(q);
      if (!matchTitle && !matchAgent && !matchSummary && !matchDest) return false;
    }
    return true;
  });

  // Selected incident for inspection
  const inspectedIncident =
    incidents.find((i) => i.id === inspectedIncidentId) ||
    filteredIncidents[0] ||
    incidents[0];

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredIncidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIncidents.map((i) => i.id));
    }
  };

  const handleBulkAck = () => {
    if (selectedIds.length === 0) return;
    onBulkAcknowledge(selectedIds);
    setSelectedIds([]);
    setActionNotice(`Acknowledged ${selectedIds.length} alert(s)`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSingleAck = (id: string) => {
    onBulkAcknowledge([id]);
    setActionNotice(`Alert ${id.toUpperCase()} acknowledged`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleNotAThreat = (id: string) => {
    onMarkFalsePositive(id, 'Marked as not a threat by operator');
    setActionNotice(`Marked ${id.toUpperCase()} as not a threat`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleExport = (inc: IncidentAlert) => {
    const reportData = JSON.stringify(inc, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${inc.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setActionNotice(`Exported report for ${inc.id.toUpperCase()}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Helper for right column steps
  const getTimelineSteps = (inc?: IncidentAlert) => {
    if (!inc) return [];
    if (inc.id === 'inc-0412' || inc.id === 'inc-001' || inc.title.toLowerCase().includes('refund')) {
      return [
        { num: 1, label: 'Trigger', detail: 'hidden text in a web page' },
        { num: 2, label: 'Agent response', detail: 'agreed to the request' },
        { num: 3, label: 'Tool call', detail: 'issue_refund (2500 NEAR)', isCode: true },
        { num: 4, label: 'Attempted action', detail: 'send to attacker-drain.testnet', isCode: true },
        { num: 5, label: 'Rule applied', detail: 'receiver is on the blocked list' },
        { num: 6, label: 'Outcome', detail: 'stopped before signing, nothing sent' },
        { num: 7, label: 'Threat signs', detail: 'trick instruction, blocked account' }
      ];
    }
    if (inc.id === 'inc-0413' || inc.id === 'inc-002' || inc.title.toLowerCase().includes('contract')) {
      return [
        { num: 1, label: 'Trigger', detail: 'scheduled yield rebalance' },
        { num: 2, label: 'Agent response', detail: 'prepared pool transaction' },
        { num: 3, label: 'Tool call', detail: 'rebalance_vault (150 NEAR)', isCode: true },
        { num: 4, label: 'Attempted action', detail: 'send to uniswap-fork.testnet', isCode: true },
        { num: 5, label: 'Rule applied', detail: 'receiver bytecode updated < 45m ago' },
        { num: 6, label: 'Outcome', detail: 'paused payment, held for your OK' },
        { num: 7, label: 'Threat signs', detail: 'fresh bytecode, 0 prior interactions' }
      ];
    }
    return [
      { num: 1, label: 'Trigger', detail: 'customer ticket webhook received' },
      { num: 2, label: 'Agent response', detail: 'formulated outside webhook' },
      { num: 3, label: 'Tool call', detail: 'post_external_webhook', isCode: true },
      { num: 4, label: 'Attempted action', detail: 'dispatch to 198.51.100.44:8080', isCode: true },
      { num: 5, label: 'Rule applied', detail: 'destination outside approved list' },
      { num: 6, label: 'Outcome', detail: 'alerted you only, agent is watch only' },
      { num: 7, label: 'Threat signs', detail: 'unapproved external IP address' }
    ];
  };

  // Helper for right column forensic box
  const getForensicCode = (inc?: IncidentAlert) => {
    if (!inc) return '';
    if (inc.id === 'inc-0412' || inc.id === 'inc-001' || inc.title.toLowerCase().includes('refund')) {
      return `tool_call issue_refund\namount: 2500 NEAR\nreceiver: attacker-drain.testnet\nkey: [HIDDEN] · email: [HIDDEN]\nsha256: 9f2c...b71e`;
    }
    if (inc.id === 'inc-0413' || inc.id === 'inc-002' || inc.title.toLowerCase().includes('contract')) {
      return `tool_call rebalance_vault\namount: 150.00 NEAR\nreceiver: uniswap-fork.testnet\ncode_hash: 0x9b3f...e102\nsha256: 4a1d...c902`;
    }
    return `tool_call post_external_webhook\ndestination: 198.51.100.44:8080\npayload: {"ticket_id": "[REDACTED]"}\nsha256: 7f8a...33d1`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Title and Counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Threat Alerts
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Suspicious actions we found, why we flagged them, and what we did about each.
          </p>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, alignSelf: 'flex-end' }}>
          Showing {filteredIncidents.length} of {incidents.length} alerts
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionNotice && (
        <div style={{
          padding: '10px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '13px',
          fontWeight: 500
        }}>
          {actionNotice}
        </div>
      )}

      {/* 2. Filter Controls Box */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Top Dropdowns Row */}
        <div className="alerts-filters-top" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '16px',
          alignItems: 'flex-end'
        }}>
          {/* Search Input */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Title, agent or account"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none'
              }}
            />
          </div>

          {/* Agent Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
              Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none'
              }}
            >
              <option value="ALL">All agents</option>
              {agentNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Severity Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none'
              }}
            >
              <option value="ALL">All levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Status Segmented Control */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
            Status
          </label>
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%'
          }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'ALL' ? '#065f46' : 'transparent',
                color: statusFilter === 'ALL' ? '#ffffff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('OPEN')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'OPEN' ? '#065f46' : 'transparent',
                color: statusFilter === 'OPEN' ? '#ffffff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              New ({newCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INVESTIGATING')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'INVESTIGATING' ? '#065f46' : 'transparent',
                color: statusFilter === 'INVESTIGATING' ? '#ffffff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Investigating ({investigatingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACKNOWLEDGED')}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'ACKNOWLEDGED' ? '#065f46' : 'transparent',
                color: statusFilter === 'ACKNOWLEDGED' ? '#ffffff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              Acknowledged ({acknowledgedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="alerts-2col-layout" style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 0.95fr',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Bulk Action & Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Bulk Selection Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 6px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f172a', fontWeight: 500, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === filteredIncidents.length}
                onChange={handleSelectAll}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#065f46' }}
              />
              <span>Select all {filteredIncidents.length}</span>
            </label>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleBulkAck}
                disabled={selectedIds.length === 0}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedIds.length === 0 ? '#94a3b8' : '#0f172a',
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Acknowledge selected
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedIds.length > 0) {
                    selectedIds.forEach((id) => onMarkFalsePositive(id, 'Bulk false positive'));
                    setSelectedIds([]);
                    setActionNotice('Marked selected as not a threat');
                  }
                }}
                disabled={selectedIds.length === 0}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectedIds.length === 0 ? '#94a3b8' : '#0f172a',
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Not a threat
              </button>
            </div>
          </div>

          {/* Alert Cards */}
          {filteredIncidents.map((inc) => {
            const isInspected = inspectedIncident?.id === inc.id;
            const isChecked = selectedIds.includes(inc.id);

            // Severity Badge
            let sevText = 'Critical';
            let sevBg = '#fee2e2';
            let sevColor = '#b91c1c';
            if (inc.severity === 'HIGH') {
              sevText = 'High';
              sevBg = '#fef3c7';
              sevColor = '#b45309';
            } else if (inc.severity === 'MEDIUM') {
              sevText = 'Medium';
              sevBg = '#fef3c7';
              sevColor = '#b45309';
            } else if (inc.severity === 'LOW') {
              sevText = 'Low';
              sevBg = '#f1f5f9';
              sevColor = '#475569';
            }

            // Action Badge
            let actText = 'Stopped';
            let actBg = '#dcfce7';
            let actColor = '#15803d';
            if (inc.enforcementAction === 'PAUSED') {
              actText = 'Held for your OK';
              actBg = '#fef3c7';
              actColor = '#b45309';
            } else if (inc.enforcementAction === 'FLAGGED' || inc.enforcementAction === 'ALLOWED') {
              actText = 'Seen, not stopped';
              actBg = '#f1f5f9';
              actColor = '#475569';
            }

            // Status Badge
            let statText = 'New';
            let statBg = '#f1f5f9';
            let statColor = '#475569';
            if (inc.status === 'INVESTIGATING') {
              statText = 'Investigating';
              statBg = '#f1f5f9';
              statColor = '#475569';
            } else if (inc.status === 'ACKNOWLEDGED') {
              statText = 'Acknowledged';
              statBg = '#dcfce7';
              statColor = '#15803d';
            }

            // Banner text
            let bannerText = 'What we did: stopped it before it was signed. Nothing was sent.';
            let bannerBg = '#f0fdf4';
            let bannerColor = '#166534';
            if (inc.enforcementAction === 'PAUSED') {
              bannerText = 'What we did: paused the payment. It needs your approval to continue.';
              bannerBg = '#fffbeb';
              bannerColor = '#b45309';
            } else if (inc.enforcementAction === 'FLAGGED' || inc.enforcementAction === 'ALLOWED') {
              bannerText = 'What we did: alerted you only. This agent is watch only, so we cannot stop it.';
              bannerBg = '#f8fafc';
              bannerColor = '#64748b';
            }

            return (
              <div
                key={inc.id}
                onClick={() => {
                  setInspectedIncidentId(inc.id);
                  onSelectIncident(inc);
                }}
                style={{
                  background: '#ffffff',
                  border: isInspected ? '1px solid #10b981' : '1px solid #e5e7eb',
                  borderLeft: isInspected ? '3px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Top Row: Checkbox + Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(inc.id);
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#065f46' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        background: sevBg,
                        color: sevColor,
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {sevText}
                      </span>
                      <span style={{
                        background: actBg,
                        color: actColor,
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {actText}
                      </span>
                      <span style={{
                        background: statBg,
                        color: statColor,
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {statText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '6px 0 4px', lineHeight: 1.3 }}>
                  {inc.title}
                </h3>

                {/* Metadata Row */}
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                  <div>
                    <span>Agent </span>
                    <strong style={{ color: '#0f172a', fontWeight: 600 }}>{inc.agentName}</strong>
                  </div>
                  <div>
                    <span>Type </span>
                    <span style={{ color: '#475569' }}>{formatCategory(inc.attackCategory)}</span>
                  </div>
                  <span>{timeAgo(inc.createdAt)}</span>
                </div>

                {/* Description Text */}
                <p style={{ fontSize: '12px', color: '#334155', margin: '0 0 10px', lineHeight: 1.45 }}>
                  {inc.summary}
                </p>

                {/* What we did Callout Banner */}
                <div style={{
                  padding: '8px 12px',
                  background: bannerBg,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: bannerColor,
                  fontWeight: 500,
                  marginBottom: '14px'
                }}>
                  {bannerText}
                </div>

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedIncidentId(inc.id);
                      onSelectIncident(inc);
                      if (typeof window !== 'undefined' && window.innerWidth < 1150) {
                        document.getElementById('incident-inspection-pane')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      background: '#065f46',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Inspect
                  </button>

                  {inc.status !== 'ACKNOWLEDGED' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleAck(inc.id);
                      }}
                      style={{
                        padding: '6px 14px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      Acknowledge
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotAThreat(inc.id);
                    }}
                    style={{
                      padding: '6px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                  >
                    Not a threat
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Incident Details Pane */}
        {inspectedIncident && (
          <div
            id="incident-inspection-pane"
            style={{
              position: 'sticky',
              top: '20px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '22px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            {/* Detail Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="font-mono" style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', letterSpacing: '0.04em' }}>
                INCIDENT {inspectedIncident.id.toUpperCase()}
              </span>
              <span style={{
                background: inspectedIncident.severity === 'CRITICAL' ? '#ef4444' : inspectedIncident.severity === 'HIGH' ? '#f59e0b' : '#3b82f6',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                textTransform: 'capitalize'
              }}>
                {inspectedIncident.severity.toLowerCase()}
              </span>
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.35 }}>
              {inspectedIncident.title}
            </h2>

            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
              {formatDetailDate(inspectedIncident.createdAt)} &bull; {inspectedIncident.agentName} &bull; {inspectedIncident.enforcementAction === 'BLOCKED' ? 'Stopped' : inspectedIncident.enforcementAction === 'PAUSED' ? 'Held for your OK' : 'Seen, not stopped'}
            </div>

            {/* Structured Sequence Steps (1 to 7) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {getTimelineSteps(inspectedIncident).map((step) => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px' }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {step.num}
                  </div>
                  <div style={{ lineHeight: 1.4 }}>
                    <strong style={{ color: '#0f172a', fontWeight: 600 }}>{step.label}</strong>
                    <span style={{ color: '#64748b' }}> &bull; </span>
                    <span className={step.isCode ? 'font-mono' : undefined} style={{ color: '#334155' }}>
                      {step.detail}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Forensic records code block */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                Forensic records (private details hidden)
              </div>
              <pre className="font-mono" style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                lineHeight: 1.6,
                margin: 0,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {getForensicCode(inspectedIncident)}
              </pre>
            </div>

            {/* Action Buttons Rows */}
            <div className="alerts-detail-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSingleAck(inspectedIncident.id)}
                style={{
                  padding: '8px 12px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPauseAgent) {
                    onPauseAgent(inspectedIncident.agentId);
                    setActionNotice(`Updated status for ${inspectedIncident.agentName}`);
                    setTimeout(() => setActionNotice(null), 3000);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Pause this agent
              </button>
              <button
                type="button"
                onClick={() => handleExport(inspectedIncident)}
                style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Export report
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDisconnectAgent) {
                    onDisconnectAgent(inspectedIncident.agentId);
                    setActionNotice(`Disconnected agent ${inspectedIncident.agentName}`);
                    setTimeout(() => setActionNotice(null), 3000);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Cut off connection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
