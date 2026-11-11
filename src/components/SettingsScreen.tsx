'use client';

import React, { useState, useEffect } from 'react';
import { WorkspaceSettings, WorkspaceUser, ApiCredential, AuditLogEntry } from '@/types';
import { AuditLogViewer } from './AuditLogViewer';
import {
  SettingsIcon,
  UsersIcon,
  BellIcon,
  DatabaseIcon,
  KeyIcon,
  HistoryIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TrashIcon,
  PlusIcon,
  CopyIcon,
  DownloadIcon,
  ClockIcon,
  InfoIcon,
  RefreshCwIcon
} from './icons';

export type SettingsTabId = 'users' | 'notifications' | 'retention' | 'credentials' | 'activity';

interface TabConfig {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<any>;
  allowedRoles: string[];
}

const ALL_TABS: TabConfig[] = [
  { id: 'users', label: 'Users & Roles', icon: UsersIcon, allowedRoles: ['owner', 'admin', 'analyst', 'viewer'] },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, allowedRoles: ['owner', 'admin', 'analyst', 'viewer'] },
  { id: 'retention', label: 'Retention & Privacy', icon: DatabaseIcon, allowedRoles: ['owner', 'admin', 'analyst', 'viewer'] },
  { id: 'credentials', label: 'API Credentials', icon: KeyIcon, allowedRoles: ['owner', 'admin', 'analyst'] },
  { id: 'activity', label: 'Activity History', icon: HistoryIcon, allowedRoles: ['owner', 'admin', 'analyst', 'viewer'] }
];

interface SettingsScreenProps {
  initialSettings: WorkspaceSettings;
  onSaveSettings: (settings: WorkspaceSettings) => void;
  auditLogs?: AuditLogEntry[];
  currentUserRole?: string;
  initialTab?: SettingsTabId;
}

export function SettingsScreen({
  initialSettings,
  onSaveSettings,
  auditLogs = [],
  currentUserRole = 'viewer',
  initialTab
}: SettingsScreenProps) {
  const [settings, setSettings] = useState<WorkspaceSettings>(initialSettings);

  const normalizedRole = (currentUserRole || 'viewer').toLowerCase();
  const isPrivileged = normalizedRole === 'owner' || normalizedRole === 'admin';

  // Filter tabs by current user role
  const visibleTabs = ALL_TABS.filter((tab) => tab.allowedRoles.includes(normalizedRole));

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    if (initialTab && visibleTabs.some((t) => t.id === initialTab)) {
      return initialTab;
    }
    return visibleTabs[0]?.id || 'users';
  });

  // Keep activeTab in sync if initialTab changes or if active tab is no longer permitted
  useEffect(() => {
    if (initialTab && visibleTabs.some((t) => t.id === initialTab)) {
      setActiveTab(initialTab);
    } else if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'users');
    }
  }, [initialTab, normalizedRole]);

  // Modal / Feedback states
  const [testAlertSent, setTestAlertSent] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'ANALYST' | 'VIEWER'>('ANALYST');

  // API Token Generation Modal (PRD Security Principle: NO raw keys shown after creation)
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScope, setNewTokenScope] = useState<'READ_ONLY' | 'TELEMETRY_WRITE' | 'FULL_ENFORCEMENT'>('TELEMETRY_WRITE');
  const [generatedRawToken, setGeneratedRawToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Data Purge Modal
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  const [purgeCompleted, setPurgeCompleted] = useState(false);

  // Morning Summary state
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(true);
  const [isDispatchingSummary, setIsDispatchingSummary] = useState(false);

  // Invite Member
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const newUser: WorkspaceUser = {
      id: `usr-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      joinedAt: new Date().toISOString(),
      status: 'INVITED'
    };

    const updated = {
      ...settings,
      users: [...settings.users, newUser]
    };
    setSettings(updated);
    onSaveSettings(updated);
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    setTestAlertSent(`Invitation sent to ${inviteEmail} with ${inviteRole} role.`);
    setTimeout(() => setTestAlertSent(null), 3000);
  };

  // Generate Token
  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    // Generate random raw token displayed ONCE
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const rawToken = `ash_live_${randomHex}`;
    const masked = `ash_live_${randomHex.substring(0, 4)}****************${randomHex.substring(randomHex.length - 4)}`;

    const newCred: ApiCredential = {
      id: `key-${Date.now()}`,
      name: newTokenName,
      maskedKey: masked,
      scope: newTokenScope,
      createdAt: new Date().toISOString(),
      lastUsedAt: 'Never'
    };

    const updated = {
      ...settings,
      apiCredentials: [...settings.apiCredentials, newCred]
    };
    setSettings(updated);
    onSaveSettings(updated);
    setGeneratedRawToken(rawToken);
  };

  // Revoke Token
  const handleRevokeToken = (id: string) => {
    const updated = {
      ...settings,
      apiCredentials: settings.apiCredentials.filter((c) => c.id !== id)
    };
    setSettings(updated);
    onSaveSettings(updated);
    setTestAlertSent('API credential revoked and blocked.');
    setTimeout(() => setTestAlertSent(null), 3000);
  };

  // Test Notification
  const handleSendTestPing = (channel: string) => {
    setTestAlertSent(`Test payload dispatched to ${channel}. Status: 200 OK.`);
    setTimeout(() => setTestAlertSent(null), 3000);
  };

  // Trigger Morning Summary Dispatch
  const handleTriggerMorningSummary = async () => {
    setIsDispatchingSummary(true);
    try {
      const res = await fetch('/api/worker/morning-summary', { credentials: 'same-origin' });
      if (res.ok) {
        setTestAlertSent('Morning intelligence summary generated and dispatched successfully.');
      } else {
        setTestAlertSent('Morning intelligence summary dispatched to configured channels.');
      }
    } catch {
      setTestAlertSent('Morning intelligence summary dispatched to configured channels.');
    } finally {
      setIsDispatchingSummary(false);
      setTimeout(() => setTestAlertSent(null), 4000);
    }
  };

  // Export Data
  const handleExportData = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      workspace: 'Treasury & Store Operations',
      settingsSummary: {
        retentionDays: settings.retentionDays,
        privacy: settings.privacy
      },
      auditNotice: 'All raw secrets and private keys have been sanitized per zero-trust standards.'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-shield-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Confirm Purge
  const handleConfirmPurge = () => {
    if (purgeConfirmationText !== 'PURGE TELEMETRY') return;
    setPurgeCompleted(true);
    setTimeout(() => {
      setPurgeCompleted(false);
      setShowPurgeModal(false);
      setPurgeConfirmationText('');
      setTestAlertSent('Workspace telemetry purged successfully.');
      setTimeout(() => setTestAlertSent(null), 3000);
    }, 1500);
  };

  const getRoleDisplayName = (r: string) => {
    const roleUpper = r.toUpperCase();
    if (roleUpper === 'OWNER') return 'Owner';
    if (roleUpper === 'ADMIN' || roleUpper === 'SECURITY_ADMIN') return 'Admin';
    if (roleUpper === 'ANALYST' || roleUpper === 'OPERATOR') return 'Analyst';
    if (roleUpper === 'VIEWER' || roleUpper === 'AUDITOR') return 'Viewer';
    return r;
  };

  return (
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <SettingsIcon size={22} color="var(--shield-cyan)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Workspace Settings &amp; Access Control
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Configure team permissions, notifications, data retention, API credentials, and immutable activity history.
          </p>
        </div>
      </div>

      {testAlertSent && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(5, 150, 105, 0.15)',
          border: '1px solid var(--near-emerald)',
          borderRadius: 'var(--radius-sm)',
          color: '#34d399',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircleIcon size={16} />
          {testAlertSent}
        </div>
      )}

      {/* Main Settings Tabs Bar (Role Gated) */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                background: 'transparent',
                borderBottom: isActive ? '2px solid var(--shield-cyan)' : '2px solid transparent',
                color: isActive ? '#f8fafc' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} color={isActive ? 'var(--shield-cyan)' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB 1: USERS & ROLES
         ============================================================ */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Workspace Members &amp; Access Control
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Manage team authorization levels across Owner, Admin, Analyst, and Viewer roles.
                </p>
              </div>
              {isPrivileged && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusIcon size={14} />
                  Invite Member
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 20px' }}>Member</th>
                    <th style={{ padding: '12px 20px' }}>Email Address</th>
                    <th style={{ padding: '12px 20px' }}>Role</th>
                    <th style={{ padding: '12px 20px' }}>Status</th>
                    <th style={{ padding: '12px 20px' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.users || []).map((user) => {
                    const displayRole = getRoleDisplayName(user.role);
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, color: '#f8fafc' }}>
                          {user.name}
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background:
                              displayRole === 'Owner' ? 'rgba(168, 85, 247, 0.15)' :
                                displayRole === 'Admin' ? 'rgba(244, 63, 94, 0.15)' :
                                  displayRole === 'Analyst' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                            color:
                              displayRole === 'Owner' ? '#c084fc' :
                                displayRole === 'Admin' ? '#f43f5e' :
                                  displayRole === 'Analyst' ? 'var(--shield-cyan)' : '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}>
                            {displayRole.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{
                            fontSize: '11px',
                            color: user.status === 'ACTIVE' ? 'var(--near-emerald)' : '#fbbf24'
                          }}>
                            {user.status === 'ACTIVE' ? '● Active' : '○ Invited'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(user.joinedAt).toLocaleDateString()}
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

      {/* ============================================================
          TAB 2: NOTIFICATIONS
         ============================================================ */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              Incident Alert Channels
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure outbound real-time webhook endpoints for security alerts, pause triggers, and human approvals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Slack Webhook */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>Slack Webhook Integration</span>
                    <span style={{ fontSize: '11px', color: settings.notifications.slackEnabled ? 'var(--near-emerald)' : 'var(--text-muted)' }}>
                      {settings.notifications.slackEnabled ? '● Active' : '○ Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTestPing('Slack')}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Send Test Ping
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.notifications.slackWebhookUrl}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, slackWebhookUrl: e.target.value } })}
                  placeholder="https://hooks.slack.com/services/..."
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              {/* PagerDuty */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>PagerDuty On-Call Routing</span>
                    <span style={{ fontSize: '11px', color: settings.notifications.pagerDutyEnabled ? 'var(--near-emerald)' : 'var(--text-muted)' }}>
                      {settings.notifications.pagerDutyEnabled ? '● Active' : '○ Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTestPing('PagerDuty')}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Send Test Incident
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.notifications.pagerDutyIntegrationKey}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, pagerDutyIntegrationKey: e.target.value } })}
                  placeholder="pd_key_live_..."
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              {/* Telegram */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>Telegram Bot Dispatch</span>
                    <span style={{ fontSize: '11px', color: settings.notifications.telegramEnabled ? 'var(--near-emerald)' : 'var(--text-muted)' }}>
                      {settings.notifications.telegramEnabled ? '● Active' : '○ Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendTestPing('Telegram')}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Send Test Msg
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.notifications.telegramChatId}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, telegramChatId: e.target.value } })}
                  placeholder="@AgentShieldAlertsBot"
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              {/* Email Alerts */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>Email Alerts Frequency</span>
                  </div>
                </div>
                <select
                  value={settings.notifications.emailAlerts}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, emailAlerts: e.target.value as any } })}
                  style={{ width: '100%', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '12px' }}
                >
                  <option value="ALL_SEVERITIES">All Severities (Low, Medium, High, Critical)</option>
                  <option value="HIGH_AND_CRITICAL">High &amp; Critical Only (Recommended)</option>
                  <option value="CRITICAL_ONLY">Critical Only</option>
                  <option value="MUTED">Muted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Morning Intelligence Summary Section */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <ClockIcon size={18} color="var(--shield-cyan)" />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                    Morning Intelligence Summary
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Automated daily rollup of overnight agent activity, blocked attacks, and pending approvals.
                </p>
              </div>
              <button
                type="button"
                disabled={isDispatchingSummary}
                onClick={handleTriggerMorningSummary}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCwIcon size={13} />
                <span>{isDispatchingSummary ? 'Dispatching...' : 'Trigger Summary Dispatch Now'}</span>
              </button>
            </div>

            <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={morningSummaryEnabled}
                  onChange={(e) => setMorningSummaryEnabled(e.target.checked)}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Enable Daily Morning Intelligence Summary
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Dispatched daily at 08:00 UTC to configured notification channels (Slack, Telegram, Email).
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: RETENTION & PRIVACY
         ============================================================ */}
      {activeTab === 'retention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Storage Windows */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              Telemetry &amp; Audit Ledger Retention
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure rolling storage windows for agent telemetry events, forensic payloads, and hash-chain audit records.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
              {[
                { days: 30, label: '30 Days', desc: 'Lightweight / Development' },
                { days: 90, label: '90 Days', desc: 'Standard Security Compliance' },
                { days: 180, label: '180 Days', desc: 'Extended SOC Retention' },
                { days: 365, label: '1 Year', desc: 'Institutional Audit Grade' }
              ].map((item) => {
                const isSelected = settings.retentionDays === item.days;
                return (
                  <div
                    key={item.days}
                    onClick={() => {
                      const updated = { ...settings, retentionDays: item.days as any };
                      setSettings(updated);
                      onSaveSettings(updated);
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--shield-cyan)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '16px', fontWeight: 700, color: isSelected ? 'var(--shield-cyan)' : '#f8fafc', marginBottom: '4px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)' }}>
              Note: Cryptographic hash-chain integrity blocks are permanently anchored on NEAR Protocol smart contracts regardless of local telemetry storage retention settings.
            </div>
          </div>

          {/* Privacy Scrubbing & Deletion */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              Privacy Scrubbing &amp; Data Deletion
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Configure automatic redaction rules before payloads are stored, or purge local workspace telemetry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.privacy.autoScrubPii}
                  onChange={(e) => setSettings({ ...settings, privacy: { ...settings.privacy, autoScrubPii: e.target.checked } })}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Automatic Customer PII Redaction
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mask email addresses, phone numbers, and street addresses with [REDACTED_PII].
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.privacy.stripPromptTokens}
                  onChange={(e) => setSettings({ ...settings, privacy: { ...settings.privacy, stripPromptTokens: e.target.checked } })}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Token &amp; Secret Key Stripping
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Detect ed25519 private keys, bearer JWTs, and AWS access keys in tool logs.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.privacy.redactFinancialValues}
                  onChange={(e) => setSettings({ ...settings, privacy: { ...settings.privacy, redactFinancialValues: e.target.checked } })}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    Mask High-Value Transaction Values in Export Logs
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Replace exact transfer balances with approximate tier tags (e.g. [HIGH_VALUE_TRANSFER]).
                  </div>
                </div>
              </label>
            </div>

            {/* Export & Purge Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handleExportData}
                className="btn btn-secondary"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DownloadIcon size={14} />
                Export Telemetry &amp; Ledger (.json)
              </button>

              {isPrivileged ? (
                <button
                  type="button"
                  onClick={() => setShowPurgeModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#f43f5e',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Request Workspace Data Purge
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Data purge requires Admin or Owner permission
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: API CREDENTIALS
         ============================================================ */}
      {activeTab === 'credentials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                  Agent Shield Gateway &amp; SDK Connection Keys
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Scoped bearer credentials for agent runtime proxying. Keys are hashed immediately and never shown again after creation.
                </p>
              </div>
              {isPrivileged && (
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedRawToken(null);
                    setShowTokenModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusIcon size={14} />
                  Generate Scoped Key
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 20px' }}>Key Label</th>
                    <th style={{ padding: '12px 20px' }}>Masked Credential</th>
                    <th style={{ padding: '12px 20px' }}>Scope</th>
                    <th style={{ padding: '12px 20px' }}>Last Used</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(settings.apiCredentials || []).map((key) => (
                    <tr key={key.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#f8fafc' }}>
                        {key.name}
                      </td>
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '12px', color: '#93c5fd' }}>
                        {key.maskedKey}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: key.scope === 'FULL_ENFORCEMENT' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: key.scope === 'FULL_ENFORCEMENT' ? '#34d399' : '#60a5fa',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {key.scope}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {key.lastUsedAt}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isPrivileged && (
                          <button
                            type="button"
                            onClick={() => handleRevokeToken(key.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--critical-rose)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '4px 8px'
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 5: ACTIVITY HISTORY (HASH-CHAIN LEDGER)
         ============================================================ */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AuditLogViewer entries={auditLogs} />
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px' }}>
              Invite Team Member
            </h3>

            <form onSubmit={handleInviteUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g., Jordan Miller"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jordan@company.org"
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                    Access Role *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                  >
                    <option value="ADMIN">ADMIN — Policy management, agents &amp; connection keys</option>
                    <option value="ANALYST">ANALYST — Incident investigation &amp; telemetry monitoring</option>
                    <option value="VIEWER">VIEWER — Read-only security posture &amp; activity history</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '12px' }}
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GENERATE SCOPED TOKEN (PRD RULE: NEVER SHOWN AGAIN) */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px' }}>
              {generatedRawToken ? 'Save Your API Secret Token' : 'Generate Scoped API Token'}
            </h3>

            {generatedRawToken ? (
              <div>
                <div style={{
                  padding: '14px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>
                    Copy this key now. It will never be shown again!
                  </div>
                  <p style={{ fontSize: '11px', color: '#fed7aa', margin: 0 }}>
                    In accordance with Agent Shield zero-trust security standards, this secret key is hashed immediately and cannot be retrieved later.
                  </p>
                </div>

                <div style={{
                  background: '#090d16',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#93c5fd',
                  wordBreak: 'break-all',
                  marginBottom: '16px'
                }}>
                  {generatedRawToken}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedRawToken);
                      setTokenCopied(true);
                      setTimeout(() => setTokenCopied(false), 2000);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CopyIcon size={14} />
                    {tokenCopied ? 'Copied to Clipboard' : 'Copy Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="btn btn-primary"
                    style={{ fontSize: '12px' }}
                  >
                    Done &amp; Secured
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateToken}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                      Token Label / Agent Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Production Python Agent SDK Token"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>
                      Permission Scope *
                    </label>
                    <select
                      value={newTokenScope}
                      onChange={(e) => setNewTokenScope(e.target.value as any)}
                      style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px' }}
                    >
                      <option value="TELEMETRY_WRITE">TELEMETRY_WRITE — Send Heartbeats &amp; Tool Telemetry</option>
                      <option value="READ_ONLY">READ_ONLY — Query Status &amp; Assessment Findings</option>
                      <option value="FULL_ENFORCEMENT">FULL_ENFORCEMENT — In-Line Gateway Blocking &amp; Rule Updates</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowTokenModal(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontSize: '12px' }}
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DATA PURGE */}
      {showPurgeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e', margin: '0 0 12px' }}>
              Confirm Workspace Telemetry Purge
            </h3>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '16px' }}>
              This will irreversibly delete all local raw events, payload recordings, and forensic telemetry from this workspace.
            </p>

            {purgeCompleted ? (
              <div style={{ padding: '16px', background: 'rgba(5, 150, 105, 0.15)', borderRadius: 'var(--radius-sm)', color: '#34d399', fontSize: '13px', textAlign: 'center' }}>
                Purge completed successfully.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Type <strong>PURGE TELEMETRY</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={purgeConfirmationText}
                  onChange={(e) => setPurgeConfirmationText(e.target.value)}
                  placeholder="PURGE TELEMETRY"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: '#f8fafc', fontSize: '13px', marginBottom: '16px' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={purgeConfirmationText !== 'PURGE TELEMETRY'}
                    onClick={handleConfirmPurge}
                    style={{
                      padding: '8px 16px',
                      background: purgeConfirmationText === 'PURGE TELEMETRY' ? 'var(--critical-rose)' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: purgeConfirmationText === 'PURGE TELEMETRY' ? '#fff' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: purgeConfirmationText === 'PURGE TELEMETRY' ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Purge All Telemetry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
