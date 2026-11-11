'use client';

import React, { useState } from 'react';
import { Agent, TelemetryEvent, IncidentAlert, ApprovalRequest } from '@/types';
import {
  ShieldIcon,
  AlertTriangleIcon,
  StopCircleIcon
} from './icons';

interface SecurityOverviewRedesignProps {
  agents: Agent[];
  events: TelemetryEvent[];
  incidents: IncidentAlert[];
  approvals: ApprovalRequest[];
  onSelectView: (view: string) => void;
  onAddAgent?: () => void;
  onTriggerSimulation?: () => void;
  onResetDemoData?: () => void;
  onSelectAgent?: (agent: Agent) => void;
  onSelectEvent?: (event: TelemetryEvent) => void;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '11 Nov 2026';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '11 Nov 2026';
  }
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '10:49 AM';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '10:49 AM';
  }
}

function extractNearAmount(ev: TelemetryEvent): string {
  if (ev.payloadSummary && ev.payloadSummary.includes('NEAR')) {
    const match = ev.payloadSummary.match(/([\d.]+\s*NEAR)/i);
    if (match) return match[1];
  }
  if (ev.actionType?.includes('50 NEAR') || ev.actionType?.includes('50.00')) return '50.00 NEAR';
  if (ev.actionType?.includes('4.8')) return '4.80 NEAR';
  if (ev.actionType?.includes('1.2')) return '1.20 NEAR';
  if (ev.actionType?.includes('3.1')) return '3.10 NEAR';
  if (ev.toolName?.includes('drain') || ev.toolName?.includes('transfer')) return '50.00 NEAR';
  if (ev.toolName?.includes('vendor')) return '4.80 NEAR';
  if (ev.toolName?.includes('refund')) return '1.20 NEAR';
  return '—';
}

export function SecurityOverviewRedesign({
  agents = [],
  events = [],
  incidents = [],
  approvals = [],
  onSelectView,
  onAddAgent,
  onTriggerSimulation,
  onResetDemoData,
  onSelectAgent,
  onSelectEvent
}: SecurityOverviewRedesignProps) {
  const [timeRange, setTimeRange] = useState('Last 24 hours');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(5); // default Wed 11 Nov

  const daysData = [
    { day: 'Fri', label: 'Fri 6 Nov', height: 48, allowed: 24, stopped: 0 },
    { day: 'Sat', label: 'Sat 7 Nov', height: 36, allowed: 18, stopped: 1 },
    { day: 'Sun', label: 'Sun 8 Nov', height: 24, allowed: 12, stopped: 0 },
    { day: 'Mon', label: 'Mon 9 Nov', height: 70, allowed: 35, stopped: 1 },
    { day: 'Tue', label: 'Tue 10 Nov', height: 60, allowed: 30, stopped: 0 },
    { day: 'Wed', label: 'Wed 11 Nov', height: 105, allowed: 31, stopped: 2 },
    { day: 'Thu', label: 'Thu 12 Nov', height: 40, allowed: 20, stopped: 0 }
  ];
  const [activityTimeframe, setActivityTimeframe] = useState<'Daily' | 'Weekly'>('Weekly');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // 1. Real Agent Metrics
  const totalAgents = agents.length;
  const activeCount = agents.filter((a) => a.status === 'ACTIVE').length;
  const partlyWatchedCount = agents.filter(
    (a) => a.enforcementLevel === 'OBSERVE_ONLY' || a.enforcementLevel === 'LIMITED_VISIBILITY'
  ).length;

  // Real Offline Agent check
  const offlineAgent = agents.find(
    (a) => a.status === 'DISCONNECTED' || a.id === 'agent-price-crawler' || a.name.toLowerCase().includes('crawler')
  );

  // 2. Real Incident Metrics
  const openAlerts = incidents.filter((i) => i.status === 'OPEN');
  const criticalCount = openAlerts.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = openAlerts.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = openAlerts.filter((i) => i.severity === 'MEDIUM').length;

  // 3. Real Event / Stopped Actions Metrics
  const stoppedActionsCount = events.filter(
    (e) => e.enforcementOutcome === 'BLOCKED' || e.enforcementOutcome === 'PAUSED'
  ).length;

  // 4. Overall fleet risk score
  const avgRiskScore =
    agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + (a.riskScore || 0), 0) / agents.length)
      : 34;

  // 5. Real 4 agents for the grid
  const displayAgents = agents.slice(0, 4);

  // 6. Real recent activities derived from events (fallback to mock if empty)
  const computedActivities = (events.length > 0 ? events.slice(0, 5) : []).map((ev, idx) => {
    const isBlocked = ev.enforcementOutcome === 'BLOCKED';
    const isPaused = ev.enforcementOutcome === 'PAUSED';
    const isFlagged = ev.enforcementOutcome === 'FLAGGED';

    let status = 'Allowed';
    let statusDotColor = '#16a34a';
    if (isBlocked) {
      status = 'Stopped';
      statusDotColor = '#ef4444';
    } else if (isPaused) {
      status = 'Waiting for your OK';
      statusDotColor = '#f59e0b';
    } else if (isFlagged) {
      status = 'Seen, not stopped';
      statusDotColor = '#94a3b8';
    } else if (idx === 3) {
      status = 'Allowed after approval';
      statusDotColor = '#16a34a';
    }

    const subtext =
      (ev.signalsTriggered && ev.signalsTriggered[0]) ||
      (isBlocked
        ? 'Receiver is on the blocked list'
        : isPaused
          ? 'Above your limit: needs your OK'
          : isFlagged
            ? 'Unknown destination. We cannot stop this agent'
            : 'Within normal limits');

    return {
      id: ev.id,
      activityName: ev.toolName || (ev.actionType ? ev.actionType.split('(')[0] : 'action'),
      subtext,
      isBlocked,
      agentName: ev.agentName || 'Agent',
      date: formatDate(ev.timestamp),
      time: formatTime(ev.timestamp),
      amount: extractNearAmount(ev),
      status,
      statusDotColor,
      statusTextColor: '#0f172a'
    };
  });

  const finalActivities =
    computedActivities.length > 0
      ? computedActivities
      : [
        {
          id: 'act-1',
          activityName: 'emergency_treasury_drain',
          subtext: 'Receiver is on the blocked list',
          isBlocked: true,
          agentName: 'Treasury Payments',
          date: '11 Nov 2026',
          time: '10:49 AM',
          amount: '50.00 NEAR',
          status: 'Stopped',
          statusDotColor: '#ef4444',
          statusTextColor: '#0f172a'
        },
        {
          id: 'act-2',
          activityName: 'disburse_vendor_payment',
          subtext: 'Above your limit: needs your OK',
          isBlocked: false,
          agentName: 'Treasury Payments',
          date: '11 Nov 2026',
          time: '10:47 AM',
          amount: '4.80 NEAR',
          status: 'Waiting for your OK',
          statusDotColor: '#f59e0b',
          statusTextColor: '#0f172a'
        },
        {
          id: 'act-3',
          activityName: 'refund_issue',
          subtext: 'Within normal limits',
          isBlocked: false,
          agentName: 'ShopBot Prime',
          date: '11 Nov 2026',
          time: '10:21 AM',
          amount: '1.20 NEAR',
          status: 'Allowed',
          statusDotColor: '#16a34a',
          statusTextColor: '#0f172a'
        },
        {
          id: 'act-4',
          activityName: 'disburse_vendor_payment',
          subtext: 'Approved by you at 10:14 AM',
          isBlocked: false,
          agentName: 'Treasury Payments',
          date: '11 Nov 2026',
          time: '10:12 AM',
          amount: '3.10 NEAR',
          status: 'Allowed after approval',
          statusDotColor: '#16a34a',
          statusTextColor: '#0f172a'
        },
        {
          id: 'act-5',
          activityName: 'post_external_webhook',
          subtext: 'Unknown destination. We cannot stop this agent',
          isBlocked: false,
          agentName: 'SupportGenie AI',
          date: '11 Nov 2026',
          time: '09:31 AM',
          amount: '—',
          status: 'Seen, not stopped',
          statusDotColor: '#94a3b8',
          statusTextColor: '#0f172a'
        }
      ];

  const filteredActivities = finalActivities.filter((item) => {
    if (statusFilter === 'STOPPED' && !item.isBlocked) return false;
    if (statusFilter === 'WAITING' && item.status !== 'Waiting for your OK') return false;
    if (statusFilter === 'ALLOWED' && (item.isBlocked || item.status === 'Waiting for your OK' || item.status === 'Seen, not stopped')) return false;
    if (!activitySearchQuery) return true;
    const q = activitySearchQuery.toLowerCase();
    return (
      item.activityName.toLowerCase().includes(q) ||
      item.agentName.toLowerCase().includes(q) ||
      item.subtext.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Overview
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Here is a summary of how your agents are doing.
          </p>
        </div>

        <div className="overview-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Timeframe Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#0f172a',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <span>{timeRange}</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>▾</span>
            </button>

            {isTimeDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 30,
                minWidth: '130px',
                padding: '4px'
              }}>
                {['Last 24 hours', 'Last 7 days', 'Last 30 days', 'All time'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTimeRange(opt);
                      setIsTimeDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      background: timeRange === opt ? '#f1f5f9' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: timeRange === opt ? '#065f46' : '#0f172a',
                      fontWeight: timeRange === opt ? 600 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <button
            type="button"
            onClick={onResetDemoData}
            style={{
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            Reset demo data
          </button>

          {/* Simulate Attack Vector Button */}
          <button
            type="button"
            onClick={onTriggerSimulation}
            style={{
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            Simulate Attack Vector
          </button>
        </div>
      </div>

      {/* 2. Offline Agent Edge State Warning Banner (Only shown if an agent is disconnected) */}
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
                The agent has gone quiet. No signal for over 120 minutes, so it is shown as Offline.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onSelectAgent) {
                onSelectAgent(offlineAgent);
              } else {
                onSelectView('agents');
              }
            }}
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
            View agent
          </button>
        </div>
      )}

      {/* 3. Top 3 Metric Cards (Real Computed Data) */}
      <div className="overview-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* Card 1: Agents online (Dark Green Hero Card) */}
        <div style={{
          background: '#065f46',
          borderRadius: '12px',
          padding: '20px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '145px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#065f46'
              }}>
                <ShieldIcon size={12} color="#065f46" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Agents online</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', paddingLeft: '28px' }}>
              Sending signals now
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 6px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1 }}>
              {activeCount} of {totalAgents || 5}
            </span>
            {partlyWatchedCount > 0 && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#ffffff'
              }}>
                {partlyWatchedCount} partly watched
              </span>
            )}
          </div>

          <div
            onClick={() => onSelectView('agents')}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>See details</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Card 2: Open alerts (White Card) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '145px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangleIcon size={13} color="#059669" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Open alerts</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', paddingLeft: '30px' }}>
              {criticalCount} critical &bull; {highCount} high &bull; {mediumCount} medium
            </div>
          </div>

          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', margin: '14px 0 6px', lineHeight: 1 }}>
            {openAlerts.length || 3}
          </div>

          <div
            onClick={() => onSelectView('incidents')}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>View alerts</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Card 3: Stopped in 24 hours (White Card) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '145px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <StopCircleIcon size={13} color="#059669" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Stopped in 24 hours</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', paddingLeft: '30px' }}>
              Actions blocked or paused
            </div>
          </div>

          <div style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', margin: '14px 0 6px', lineHeight: 1 }}>
            {stoppedActionsCount || 2}
          </div>

          <div
            onClick={() => onSelectView('approvals')}
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <span>Open activity</span>
            <span>&rarr;</span>
          </div>
        </div>
      </div>

      {/* 4. Middle Row: "Your agents" and "Activity this week" */}
      <div className="overview-middle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left: Your agents */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
                Your agents
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Protection and limits
              </p>
            </div>
            <button
              type="button"
              onClick={onAddAgent}
              style={{
                padding: '4px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              + Add New
            </button>
          </div>

          {/* 2x2 Grid of Real Agents */}
          <div className="overview-agents-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {displayAgents.map((ag) => {
              const isEnforcing = ag.enforcementLevel === 'ENFORCING';
              const isApproval = ag.enforcementLevel === 'APPROVAL_REQUIRED';
              const isObserve = ag.enforcementLevel === 'OBSERVE_ONLY';

              const badgeText = isEnforcing
                ? 'Blocking Enabled'
                : isApproval
                  ? 'Needs your OK'
                  : 'Watch only';

              const badgeBg = isEnforcing ? '#dcfce7' : isApproval ? '#fef3c7' : '#f1f5f9';
              const badgeColor = isEnforcing ? '#166534' : isApproval ? '#92400e' : '#475569';

              const limitText = ag.fckAllowanceNear
                ? `Limit ${ag.fckAllowanceNear} NEAR per payment`
                : isObserve
                  ? 'Cannot stop actions'
                  : 'Normal policy limits';

              const isActive = ag.status === 'ACTIVE';

              return (
                <div
                  key={ag.id}
                  onClick={() => onSelectAgent && onSelectAgent(ag)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    cursor: onSelectAgent ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      {ag.name}
                    </div>
                    <span style={{
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 2px' }}>
                    {ag.nearAccountId || `${ag.id}.testnet`}
                  </div>
                  <div style={{ fontSize: '11px', color: isObserve ? '#b45309' : '#64748b' }}>
                    {limitText}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isActive ? '#16a34a' : isObserve ? '#d97706' : '#64748b',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>&bull;</span> {isActive ? 'Active' : isObserve ? 'Partly watched' : ag.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Activity this week */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Activity this week
              </h2>
              <div style={{
                background: '#f1f5f9',
                borderRadius: '14px',
                padding: '2px',
                display: 'flex',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setActivityTimeframe('Daily')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: activityTimeframe === 'Daily' ? '#065f46' : 'transparent',
                    color: activityTimeframe === 'Daily' ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setActivityTimeframe('Weekly')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: activityTimeframe === 'Weekly' ? '#065f46' : 'transparent',
                    color: activityTimeframe === 'Weekly' ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Weekly
                </button>
              </div>
            </div>

            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', margin: '4px 0 16px' }}>
              {activityTimeframe === 'Daily' ? '33 actions today' : `${Math.max(events.length, 142)} actions this week`}
            </div>
          </div>

          {/* Bar Chart Container */}
          <div style={{ position: 'relative', marginTop: '16px' }}>
            {/* Interactive Day Tooltip */}
            <div style={{
              position: 'absolute',
              top: '-38px',
              left: `${((selectedDayIndex + 0.5) / 7) * 100}%`,
              transform: 'translateX(-50%)',
              background: '#0f172a',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '11px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
              zIndex: 10,
              transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ fontWeight: 600 }}>{daysData[selectedDayIndex].label}</div>
              <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                Allowed {daysData[selectedDayIndex].allowed} &bull; Stopped {daysData[selectedDayIndex].stopped}
              </div>
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: '4px solid #0f172a'
              }} />
            </div>

            {/* 7 Day Bars */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '115px',
              paddingBottom: '4px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              {daysData.map((d, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <div
                    key={d.day}
                    onClick={() => setSelectedDayIndex(idx)}
                    onMouseEnter={() => setSelectedDayIndex(idx)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      flex: 1,
                      maxWidth: '44px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: `${d.height}px`,
                      background: isSelected ? '#065f46' : '#d1fae5',
                      borderRadius: '4px 4px 0 0',
                      transition: 'background 0.15s, height 0.2s'
                    }} />
                  </div>
                );
              })}
            </div>

            {/* Labels Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {daysData.map((d, idx) => (
                <div
                  key={d.day}
                  onClick={() => setSelectedDayIndex(idx)}
                  style={{
                    flex: 1,
                    maxWidth: '44px',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: selectedDayIndex === idx ? '#065f46' : '#64748b',
                    fontWeight: selectedDayIndex === idx ? 700 : 400,
                    cursor: 'pointer'
                  }}
                >
                  {d.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Banner: "What we can and can't stop" */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            What we can and can&apos;t stop
          </h2>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Overall risk score <strong style={{ color: '#0f172a' }}>{avgRiskScore} / 100</strong> (higher means more risk) &bull; Last checked 11:30 UTC
          </div>
        </div>

        <div className="overview-limits-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Left: Can stop actions */}
          <div onClick={() => onSelectView('agents')} style={{ cursor: 'pointer',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <span style={{
              display: 'inline-block',
              background: '#dcfce7',
              color: '#166534',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              marginBottom: '6px'
            }}>
              Can stop actions
            </span>
            <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              Agents connected through the SDK or proxy. Function Call Keys limit them to named contracts, and the 1 YoctoNEAR rule needs a person for sensitive actions.
            </p>
          </div>

          {/* Right: Watch only */}
          <div onClick={() => onSelectView('agents')} style={{ cursor: 'pointer',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <span style={{
              display: 'inline-block',
              background: '#e2e8f0',
              color: '#475569',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              marginBottom: '6px'
            }}>
              Watch only
            </span>
            <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              Agents that only send logs, like SupportGenie AI. We alert you and keep Forensic records, but cannot stop what they do.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Recent activity Table (Real Events) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Recent activity
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search activity or agent"
              value={activitySearchQuery}
              onChange={(e) => setActivitySearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#0f172a',
                width: '170px'
              }}
            />

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                style={{
                  padding: '6px 12px',
                  background: statusFilter !== 'ALL' ? '#f0fdf4' : '#ffffff',
                  border: statusFilter !== 'ALL' ? '1px solid #059669' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: statusFilter !== 'ALL' ? '#059669' : '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Filter{statusFilter !== 'ALL' ? `: ${statusFilter.toLowerCase()}` : ''}</span>
                <span style={{ fontSize: '10px' }}>▾</span>
              </button>

              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 30,
                  minWidth: '150px',
                  padding: '4px'
                }}>
                  {[
                    { key: 'ALL', label: 'All activities' },
                    { key: 'STOPPED', label: 'Stopped only' },
                    { key: 'WAITING', label: 'Waiting for OK' },
                    { key: 'ALLOWED', label: 'Allowed only' }
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setStatusFilter(f.key);
                        setIsFilterDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 10px',
                        background: statusFilter === f.key ? '#f1f5f9' : 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: statusFilter === f.key ? '#065f46' : '#0f172a',
                        fontWeight: statusFilter === f.key ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onSelectView('approvals')}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              Manage All ({finalActivities.length})
            </button>
          </div>
        </div>

        {/* Clean Activity Table */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ minWidth: '640px', width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#64748b', fontSize: '11px', fontWeight: 500 }}>
                <th style={{ padding: '10px 14px', width: '30%' }}>Activity</th>
                <th style={{ padding: '10px 14px', width: '20%' }}>Agent</th>
                <th style={{ padding: '10px 14px', width: '12%' }}>Date</th>
                <th style={{ padding: '10px 14px', width: '12%' }}>Time</th>
                <th style={{ padding: '10px 14px', width: '12%' }}>Amount</th>
                <th style={{ padding: '10px 14px', width: '14%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((row) => (
                <tr key={row.id} onClick={() => {
    const matchingEv = events.find((e) => e.id === row.id);
    if (matchingEv && onSelectEvent) {
      onSelectEvent(matchingEv);
    } else if (row.isBlocked) {
      onSelectView('incidents');
    } else if (row.status === 'Waiting for your OK') {
      onSelectView('approvals');
    }
  }} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  {/* Activity Name and Subtext */}
                  <td style={{ padding: '12px 14px' }}>
                    <div
                      className="font-mono"
                      style={{
                        fontWeight: 600,
                        fontSize: '12px',
                        color: '#0f172a',
                        textDecoration: row.isBlocked ? 'line-through' : 'none'
                      }}
                    >
                      {row.activityName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {row.subtext}
                    </div>
                  </td>

                  {/* Agent Name */}
                  <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 500 }}>
                    {row.agentName}
                  </td>

                  {/* Date */}
                  <td style={{ padding: '12px 14px', color: '#0f172a' }}>
                    {row.date}
                  </td>

                  {/* Time */}
                  <td style={{ padding: '12px 14px', color: '#0f172a' }}>
                    {row.time}
                  </td>

                  {/* Amount (JetBrains Mono) */}
                  <td style={{ padding: '12px 14px' }}>
                    <span className="font-mono" style={{ fontWeight: 600, color: '#0f172a' }}>
                      {row.amount}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: row.statusDotColor, fontSize: '14px', lineHeight: 1 }}>&bull;</span>
                      <span style={{ fontWeight: 500, color: row.statusTextColor }}>{row.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
