'use client';

import React, { useState } from 'react';
import { Agent, Workspace, AgentFilterState } from '@/types';
import {
  AlertTriangleIcon,
  PlusIcon
} from './icons';

interface AgentsListProps {
  agents: Agent[];
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
  onSelectAgent: (agent: Agent) => void;
  onAddAgent: () => void;
  onPauseToggle: (agentId: string) => void;
  onDisconnect: (agentId: string) => void;
  onRemove: (agentId: string) => void;
}

function timeAgo(isoString?: string): string {
  if (!isoString) return 'recently';
  try {
    const diffMs = Math.abs(Date.now() - new Date(isoString).getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return '2 min ago';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d ago`;
  } catch {
    return 'recently';
  }
}

function formatCategory(cat?: string): string {
  if (!cat) return 'General';
  const c = cat.toUpperCase();
  if (c === 'ECOMMERCE') return 'Ecommerce';
  if (c === 'FINANCE') return 'Finance';
  if (c === 'SUPPORT') return 'Support';
  if (c === 'CODING') return 'Coding';
  if (c === 'RESEARCH' || c === 'PRICE_ORACLE') return 'Research';
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

export function AgentsList({
  agents = [],
  onSelectAgent,
  onAddAgent,
  onPauseToggle,
  onDisconnect,
  onRemove
}: AgentsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'NEEDS_ATTENTION'>('ALL');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Identify any offline / lost heartbeat agent for the warning banner
  const offlineAgent = agents.find(
    (a) => a.status === 'DISCONNECTED' || a.id === 'agent-research-lost' || a.name.toLowerCase().includes('crawler')
  );

  // Status counts
  const totalCount = agents.length;
  const onlineCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const needsAttentionCount = agents.filter(
    (a) =>
      a.status === 'DISCONNECTED' ||
      a.enforcementLevel === 'OBSERVE_ONLY' ||
      a.enforcementLevel === 'LIMITED_VISIBILITY' ||
      a.riskScore >= 60
  ).length;

  // Filter agents based on search, env, risk, and status
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.name.toLowerCase().includes(q);
      const matchId = agent.id.toLowerCase().includes(q);
      const matchAccount = agent.nearAccountId?.toLowerCase().includes(q);
      const matchContract = agent.targetContractId?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchAccount && !matchContract) {
        return false;
      }
    }

    // Environment filter
    if (selectedEnv === 'TESTNET' && (!agent.nearAccountId || !agent.nearAccountId.includes('testnet'))) {
      return false;
    }
    if (selectedEnv === 'LOCAL' && agent.nearAccountId && agent.nearAccountId.includes('testnet')) {
      return false;
    }

    // Risk filter
    if (selectedRisk === 'LOW' && agent.riskScore >= 30) return false;
    if (selectedRisk === 'MEDIUM' && (agent.riskScore < 30 || agent.riskScore >= 60)) return false;
    if (selectedRisk === 'HIGH' && agent.riskScore < 60) return false;

    // Status filter
    if (statusFilter === 'ONLINE' && agent.status !== 'ACTIVE') return false;
    if (statusFilter === 'NEEDS_ATTENTION') {
      const isNeedsAttention =
        agent.status === 'DISCONNECTED' ||
        agent.enforcementLevel === 'OBSERVE_ONLY' ||
        agent.enforcementLevel === 'LIMITED_VISIBILITY' ||
        agent.riskScore >= 60;
      if (!isNeedsAttention) return false;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Screen Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Connected Agents
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            See what each agent can do, how well it is protected, and whether it is still online.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddAgent}
          style={{
            padding: '8px 16px',
            background: '#065f46',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <PlusIcon size={14} color="#ffffff" strokeWidth={2.2} />
          <span>Add Agent</span>
        </button>
      </div>

      {/* 2. Offline Warning Banner (Dynamic for disconnected agent) */}
      {offlineAgent && (
        <div style={{
          padding: '14px 20px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangleIcon size={16} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                We stopped hearing from {offlineAgent.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                No signal for 3 hours, so it is shown as Offline. We cannot confirm it is protected.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectAgent(offlineAgent)}
            style={{
              padding: '6px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#111827',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            Check connection
          </button>
        </div>
      )}

      {/* 3. Filters Row Container */}
      <div className="agents-filters-grid" style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr 1.6fr',
        gap: '16px',
        alignItems: 'flex-end',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        {/* Search Input */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
            Search
          </label>
          <input
            type="text"
            placeholder="Name, account or contract"
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

        {/* Environment Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
            Environment
          </label>
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
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
            <option value="ALL">All environments</option>
            <option value="TESTNET">NEAR Testnet</option>
            <option value="LOCAL">Local Tools</option>
          </select>
        </div>

        {/* Risk Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
            Risk
          </label>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
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
            <option value="LOW">Low (&lt; 30)</option>
            <option value="MEDIUM">Medium (30 - 60)</option>
            <option value="HIGH">High (60+)</option>
          </select>
        </div>

        {/* Status Filter Segmented Pills */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
            Status
          </label>
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'ALL' ? '#065f46' : 'transparent',
                color: statusFilter === 'ALL' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ONLINE')}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'ONLINE' ? '#065f46' : 'transparent',
                color: statusFilter === 'ONLINE' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Online ({onlineCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEEDS_ATTENTION')}
              style={{
                flex: 1.2,
                padding: '6px 8px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: statusFilter === 'NEEDS_ATTENTION' ? '#065f46' : 'transparent',
                color: statusFilter === 'NEEDS_ATTENTION' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Needs attention ({needsAttentionCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Agent Cards 3-Column Grid */}
      <div className="agents-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
        gap: '16px'
      }}>
        {filteredAgents.map((agent) => {
          const isDisconnected = agent.status === 'DISCONNECTED';
          const isEnforcing = agent.enforcementLevel === 'ENFORCING';
          const isApproval = agent.enforcementLevel === 'APPROVAL_REQUIRED';
          const isObserve = agent.enforcementLevel === 'OBSERVE_ONLY';

          // Badge configuration
          let badgeText = 'Blocking Enabled';
          let badgeBg = '#dcfce7';
          let badgeColor = '#166534';

          if (isDisconnected) {
            badgeText = 'Offline';
            badgeBg = '#fee2e2';
            badgeColor = '#dc2626';
          } else if (isApproval) {
            badgeText = 'Needs your OK';
            badgeBg = '#fef3c7';
            badgeColor = '#92400e';
          } else if (isObserve) {
            badgeText = 'Watch only';
            badgeBg = '#f1f5f9';
            badgeColor = '#475569';
          } else if (agent.enforcementLevel === 'LIMITED_VISIBILITY') {
            badgeText = 'Partly watched';
            badgeBg = '#fef3c7';
            badgeColor = '#92400e';
          }

          // Risk color calculation
          const riskTier = agent.riskScore < 30 ? 'Low' : agent.riskScore < 60 ? 'Medium' : 'High';
          const riskColor = agent.riskScore < 30 ? '#10b981' : agent.riskScore < 60 ? '#f59e0b' : '#ef4444';

          // Status indicator
          let statusText = 'Online';
          let statusDotColor = '#16a34a';
          if (isDisconnected) {
            statusText = 'Offline';
            statusDotColor = '#ef4444';
          } else if (isObserve || agent.enforcementLevel === 'LIMITED_VISIBILITY') {
            statusText = 'Partly watched';
            statusDotColor = '#f59e0b';
          }

          return (
            <div
              key={agent.id}
              style={{
                background: '#ffffff',
                border: isDisconnected ? '1px solid #fecaca' : '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                position: 'relative'
              }}
            >
              <div>
                {/* Header: Name and Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {agent.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {formatCategory(agent.category)}
                    </div>
                  </div>
                  <span style={{
                    background: badgeBg,
                    color: badgeColor,
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    {badgeText}
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: '12px', color: '#334155', margin: '10px 0 14px', lineHeight: 1.45 }}>
                  {agent.description}
                </p>

                {/* Key-Value Property Box */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  {/* NEAR account */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>NEAR account</span>
                    <span
                      className="font-mono"
                      onClick={() => {
                        if (agent.nearAccountId && agent.nearAccountId !== 'Not on-chain' && typeof navigator !== 'undefined') {
                          navigator.clipboard?.writeText(agent.nearAccountId);
                          setCopiedId(agent.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }
                      }}
                      title="Click to copy account ID"
                      style={{
                        fontWeight: 600,
                        color: copiedId === agent.id ? '#059669' : '#0f172a',
                        cursor: agent.nearAccountId && agent.nearAccountId !== 'Not on-chain' ? 'pointer' : 'default'
                      }}
                    >
                      {copiedId === agent.id ? 'Copied!' : (agent.nearAccountId || 'Not on-chain')}
                    </span>
                  </div>

                  {/* Target contract (if on-chain) */}
                  {agent.targetContractId ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Target contract</span>
                      <span className="font-mono" style={{ color: '#0f172a' }}>
                        {agent.targetContractId}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Connection</span>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {isObserve ? 'Webhook logs' : isDisconnected ? 'Heartbeat check' : 'Local tool'}
                      </span>
                    </div>
                  )}

                  {/* Allowance (if Function Call Key present) */}
                  {agent.hasFunctionCallKey && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: '#64748b' }}>Function Call Keys allowance</span>
                      <span className="font-mono" style={{ fontWeight: 600, color: '#0f172a' }}>
                        {agent.fckAllowanceNear} NEAR
                      </span>
                    </div>
                  )}
                </div>

                {/* Coverage Gap or Callout Banner */}
                {isDisconnected ? (
                  <div style={{
                    padding: '8px 10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#b91c1c',
                    marginBottom: '12px',
                    lineHeight: 1.4
                  }}>
                    We stopped hearing from this agent, so it is not being watched
                  </div>
                ) : Boolean(agent.coverageGaps && Array.isArray(agent.coverageGaps) && agent.coverageGaps.length > 0) ? (
                  <div style={{
                    padding: '8px 10px',
                    background: '#fffbeb',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#b45309',
                    marginBottom: '12px',
                    lineHeight: 1.4
                  }}>
                    Cannot {agent.coverageGaps[0].area ? agent.coverageGaps[0].area.toLowerCase() : 'check'}: {agent.coverageGaps[0].description}
                  </div>
                ) : isObserve ? (
                  <div style={{
                    padding: '8px 10px',
                    background: '#fffbeb',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#b45309',
                    marginBottom: '12px',
                    lineHeight: 1.4
                  }}>
                    Cannot stop: data it sends out
                  </div>
                ) : (
                  <div
                    onClick={() => onSelectAgent(agent)}
                    style={{
                      padding: '8px 10px',
                      background: '#f0fdf4',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#166534',
                      fontWeight: 500,
                      marginBottom: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Full view of its connected tools</span>
                    <span>&rarr;</span>
                  </div>
                )}
              </div>

              <div>
                {/* Risk Score Progress Bar */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Risk (higher means more risk)</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {agent.riskScore} / 100 &bull; {riskTier}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(agent.riskScore, 100)}%`,
                      height: '100%',
                      background: riskColor,
                      borderRadius: '2px'
                    }} />
                  </div>
                </div>

                {/* Status Indicator */}
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: statusDotColor, fontSize: '13px' }}>&bull;</span>
                  <span style={{ fontWeight: 500 }}>{statusText}</span>
                  <span style={{ color: '#94a3b8' }}>&bull; last signal {timeAgo(agent.lastHeartbeat)}</span>
                </div>

                {/* Bottom Actions Row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => onSelectAgent(agent)}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
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
                    View details
                  </button>

                  {isDisconnected ? (
                    <button
                      type="button"
                      onClick={() => onSelectAgent(agent)}
                      style={{
                        flex: 1.2,
                        padding: '7px 12px',
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
                      Check connection
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPauseToggle(agent.id)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        background: agent.status === 'PAUSED' ? 'rgba(5, 150, 105, 0.1)' : '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: agent.status === 'PAUSED' ? '#059669' : '#0f172a',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {agent.status === 'PAUSED' ? 'Resume' : 'Pause'}
                    </button>
                  )}

                  {/* ... Menu Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === agent.id ? null : agent.id);
                    }}
                    style={{
                      padding: '7px 10px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    ...
                  </button>

                  {/* Dropdown Menu for ... */}
                  {activeMenuId === agent.id && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      bottom: '38px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 20,
                      minWidth: '150px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAgent(agent);
                          setActiveMenuId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '12px',
                          color: '#0f172a',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        Inspect Keys & Tools
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDisconnect(agent.id);
                          setActiveMenuId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '12px',
                          color: '#b45309',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        Disconnect Agent
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRemove(agent.id);
                          setActiveMenuId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          border: 'none',
                          background: 'transparent',
                          fontSize: '12px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          borderRadius: '4px'
                        }}
                      >
                        Remove Agent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
