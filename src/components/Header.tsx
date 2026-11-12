'use client';

import React from 'react';
import {
  AlertTriangleIcon,
  BellIcon,
  GlobeIcon,
  PlusIcon,
  MenuIcon
} from './icons';

interface HeaderProps {
  currentView?: string;
  currentViewTitle?: string;
  activeWorkspaceName?: string;
  alertCount?: number;
  onOpenWorkspaceModal?: () => void;
  onAddAgent?: () => void;
  onNavigateToIncidents?: () => void;
  onToggleMobileNav?: () => void;
}

export function Header({
  currentView = 'overview',
  currentViewTitle = 'Security Overview',
  activeWorkspaceName = 'Treasury & Store Operations',
  alertCount = 3,
  onOpenWorkspaceModal,
  onAddAgent,
  onNavigateToIncidents,
  onToggleMobileNav
}: HeaderProps) {
  const isRedesignedView = currentView === 'overview' || currentView === 'agents' || currentView === 'incidents' || currentView === 'approvals' || currentView === 'policies' || currentView === 'intel' || currentView === 'threat-intel' || currentView === 'settings' || currentView === 'add-agent';

  if (isRedesignedView) {
    // Redesigned Light Header for Security Overview & Connected Agents
    return (
      <header
        className="redesign-header"
        style={{
          height: '64px',
          padding: '0 32px',
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}
      >
        {/* Left: Mobile Menu Toggle + Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', minWidth: 0 }}>
          <button
            type="button"
            className="redesign-mobile-toggle"
            onClick={onToggleMobileNav}
            aria-label="Open menu"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '6px',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a'
            }}
          >
            <MenuIcon size={18} color="#0f172a" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>Agent Shield</span>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>&rsaquo;</span>
            <span style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {currentViewTitle}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Alert Notification Button */}
          <button
            type="button"
            onClick={onNavigateToIncidents}
            title={`${alertCount} active alerts`}
            style={{
              padding: '7px 10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangleIcon size={14} color="#64748b" />
          </button>

          {/* Workspace Selector */}
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            style={{
              padding: '7px 14px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {activeWorkspaceName}
          </button>

          {/* + Add Agent Button */}
          <button
            type="button"
            onClick={onAddAgent}
            style={{
              padding: '7px 14px',
              background: '#065f46',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'nowrap'
            }}
          >
            <PlusIcon size={14} color="#ffffff" strokeWidth={2.2} />
            <span>Add Agent</span>
          </button>
        </div>
      </header>
    );
  }

  // Original Dark Header for Other Screens (Alerts, Approvals, Policies, Threat Intel, Settings)
  return (
    <header className="top-bar">
      {/* Left: Workspace Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Workspace:</span>
          <button
            type="button"
            onClick={onOpenWorkspaceModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#f8fafc',
              cursor: 'pointer'
            }}
            title="Click to manage or switch workspaces"
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--shield-cyan)' }} />
            <span>{activeWorkspaceName}</span>
            <span style={{ fontSize: '10px', color: 'var(--shield-cyan)', marginLeft: '4px' }}>&darr;</span>
          </button>
        </div>
      </div>

      {/* Right: Network Stats & Alert Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* RPC Health Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 10px',
          background: 'rgba(5, 150, 105, 0.1)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: '#34d399',
          fontWeight: 500
        }}>
          <GlobeIcon size={13} color="#34d399" />
          <span>rpc.testnet.near.org</span>
        </div>

        {/* Incident Alert Counter */}
        <div
          onClick={onNavigateToIncidents}
          style={{
            position: 'relative',
            padding: '8px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Click to view Threat Alerts & Incidents"
        >
          <BellIcon size={16} color="var(--text-secondary)" />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--critical-rose)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {alertCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
