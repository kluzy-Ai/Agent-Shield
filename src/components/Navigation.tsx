'use client';

import React from 'react';
import {
  ShieldIcon,
  LayoutGridIcon,
  CpuIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  LockIcon,
  GlobeIcon,
  SlidersHorizontalIcon,
  CloseIcon
} from './icons';

interface NavigationProps {
  currentView: string;
  onSelectView: (view: string) => void;
  pendingApprovalsCount?: number;
  alertCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Navigation({
  currentView,
  onSelectView,
  pendingApprovalsCount = 2,
  alertCount = 3,
  mobileOpen = false,
  onCloseMobile
}: NavigationProps) {
  const isRedesignedView = currentView === 'overview' || currentView === 'agents' || currentView === 'incidents';

  const groups = [
    {
      groupTitle: 'MAIN MENU',
      items: [
        {
          id: 'overview',
          label: 'Security Overview',
          icon: LayoutGridIcon,
          count: null
        },
        {
          id: 'agents',
          label: 'Connected Agents',
          icon: CpuIcon,
          count: null
        },
        {
          id: 'incidents',
          label: 'Threat Alerts',
          icon: AlertTriangleIcon,
          count: alertCount > 0 ? alertCount.toString() : null
        },
        {
          id: 'approvals',
          label: 'Approvals Queue',
          icon: CheckCircleIcon,
          count: pendingApprovalsCount > 0 ? pendingApprovalsCount.toString() : null
        }
      ]
    },
    {
      groupTitle: 'PROTECTION',
      items: [
        {
          id: 'policies',
          label: 'Policy Guardrails',
          icon: LockIcon,
          count: null
        },
        {
          id: 'intel',
          label: 'Threat Intelligence',
          icon: GlobeIcon,
          count: null
        }
      ]
    },
    {
      groupTitle: 'GENERAL',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: SlidersHorizontalIcon,
          count: null
        }
      ]
    }
  ];

  if (isRedesignedView) {
    const renderSidebarContent = (isMobile = false) => (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: isMobile ? 'auto' : '100vh' }}>
        <div>
          {/* Brand Header */}
          <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <ShieldIcon size={16} color="#ffffff" strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Agent Shield
              </span>
            </div>

            {isMobile && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b'
                }}
              >
                <CloseIcon size={18} color="#64748b" />
              </button>
            )}
          </div>

          {/* Search Bar with ⌘ K badge */}
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{
              padding: '7px 12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              <span>Search</span>
              <kbd style={{
                fontSize: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                padding: '1px 5px',
                color: '#64748b',
                fontWeight: 500
              }}>
                ⌘ K
              </kbd>
            </div>
          </div>

          {/* Grouped Navigation */}
          <nav style={{ padding: '0 12px' }}>
            {groups.map((grp) => (
              <div key={grp.groupTitle} style={{ marginBottom: '18px' }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                  padding: '0 10px',
                  marginBottom: '6px'
                }}>
                  {grp.groupTitle}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectView(item.id);
                            if (isMobile && onCloseMobile) {
                              onCloseMobile();
                            }
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: isActive ? '#111827' : 'transparent',
                            color: isActive ? '#ffffff' : '#475569',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 500,
                            transition: 'all 0.12s ease',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Icon size={16} color={isActive ? '#ffffff' : '#64748b'} />
                            <span>{item.label}</span>
                          </div>

                          {item.count && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '1px 7px',
                              borderRadius: '10px',
                              background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#f8fafc',
                              color: isActive ? '#ffffff' : '#64748b',
                              border: isActive ? 'none' : '1px solid #e2e8f0'
                            }}>
                              {item.count}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Testnet mode Bottom Card */}
        <div style={{ padding: '16px' }}>
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Testnet mode
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4, margin: '0 0 10px' }}>
              You are on NEAR testnet. Do not connect agents that control real funds.
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectView('settings');
                if (isMobile && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              style={{
                padding: '5px 12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              Learn more
            </button>
          </div>
        </div>
      </div>
    );

    // Light Sidebar for Redesigned Overview, Connected Agents & Threat Alerts Screens
    return (
      <>
        {/* Desktop Sidebar */}
        <aside
          className="redesign-sidebar-desktop"
          style={{
            width: '240px',
            minWidth: '240px',
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100vh',
            boxSizing: 'border-box'
          }}
        >
          {renderSidebarContent(false)}
        </aside>

        {/* Mobile / Tablet Drawer Backdrop */}
        {mobileOpen && (
          <div
            className="redesign-backdrop"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
        )}

        {/* Mobile / Tablet Drawer */}
        <aside
          className={`redesign-sidebar-mobile ${mobileOpen ? 'open' : ''}`}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            overflowY: 'auto'
          }}
        >
          {renderSidebarContent(true)}
        </aside>
      </>
    );
  }

  // Original Dark Sidebar for Other Screens (Alerts, Approvals, Policies, Threat Intel, Settings)
  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: '#040816',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      <div>
        {/* Brand Header */}
        <div style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid var(--shield-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--shield-cyan)',
            flexShrink: 0
          }}>
            <ShieldIcon size={18} color="var(--shield-cyan)" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              AGENT SHIELD
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Trust, but verify
            </div>
          </div>
        </div>

        {/* 7-Item Flat Active Navigation */}
        <nav style={{ padding: '12px 0', flex: 1 }}>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px', padding: 0, margin: 0 }}>
            {groups.flatMap(g => g.items).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isAlertItem = item.id === 'incidents';
              const isApprovalItem = item.id === 'approvals';

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectView(item.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 16px',
                      background: isActive ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                      color: isActive ? '#f8fafc' : 'var(--text-secondary)',
                      borderLeft: isActive ? '2px solid var(--shield-cyan)' : '2px solid transparent',
                      borderTop: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'all 0.12s ease',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={16} color={isActive ? 'var(--shield-cyan)' : 'var(--text-secondary)'} />
                      <span>{item.label}</span>
                    </div>

                    {item.count && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: isAlertItem ? 'rgba(244, 63, 94, 0.2)' : isApprovalItem ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        color: isAlertItem ? '#f43f5e' : isApprovalItem ? '#f59e0b' : '#f8fafc',
                        border: isAlertItem ? '1px solid rgba(244, 63, 94, 0.4)' : isApprovalItem ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)'
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Testnet mode Bottom Card */}
      <div style={{ padding: '16px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
            Testnet mode
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 10px' }}>
            Connected to NEAR Testnet. Do not connect agents controlling real mainnet funds.
          </p>
          <button
            type="button"
            onClick={() => onSelectView('settings')}
            style={{
              padding: '4px 10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--shield-cyan)',
              cursor: 'pointer'
            }}
          >
            Learn more
          </button>
        </div>
      </div>
    </aside>
  );
}
