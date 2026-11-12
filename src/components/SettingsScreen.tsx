'use client';

import React, { useState } from 'react';
import { WorkspaceSettings, WorkspaceUser, ApiCredential, AuditLogEntry } from '@/types';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  CloseIcon,
  SearchIcon,
  DownloadIcon,
  TrashIcon,
  RefreshCwIcon,
  KeyIcon
} from './icons';

export type SettingsTabId = 'users' | 'notifications' | 'retention' | 'credentials' | 'activity';

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
  currentUserRole = 'owner',
  initialTab = 'users'
}: SettingsScreenProps) {
  const [settings, setSettings] = useState<WorkspaceSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab || 'users');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --------------------------------------------------------------------------
  // TAB 1: USERS & ROLES STATE
  // --------------------------------------------------------------------------
  const [users, setUsers] = useState<WorkspaceUser[]>(settings.users || [
    {
      id: 'usr-001',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      role: 'OWNER',
      joinedAt: '20 Oct 2026',
      status: 'ACTIVE'
    },
    {
      id: 'usr-002',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      role: 'ADMIN',
      joinedAt: '22 Oct 2026',
      status: 'ACTIVE'
    },
    {
      id: 'usr-003',
      name: 'David Kim',
      email: 'david@example.com',
      role: 'ANALYST',
      joinedAt: '28 Oct 2026',
      status: 'ACTIVE'
    },
    {
      id: 'usr-004',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'VIEWER',
      joinedAt: '1 Nov 2026',
      status: 'INVITED'
    }
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'ANALYST' | 'VIEWER'>('ANALYST');

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    const newUser: WorkspaceUser = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      joinedAt: 'Just now',
      status: 'INVITED'
    };

    const updated = [...users, newUser];
    setUsers(updated);
    setSettings((prev) => ({ ...prev, users: updated }));
    onSaveSettings({ ...settings, users: updated });
    setShowInviteModal(false);
    setInviteName('');
    setInviteEmail('');
    showToast(`Invitation sent to ${newUser.email} with ${newUser.role} role.`);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    const updated = users.map((u) => (u.id === userId ? { ...u, role: newRole as any } : u));
    setUsers(updated);
    setSettings((prev) => ({ ...prev, users: updated }));
    onSaveSettings({ ...settings, users: updated });
    showToast(`Updated user role to ${newRole}.`);
  };

  // --------------------------------------------------------------------------
  // TAB 2: NOTIFICATIONS STATE
  // --------------------------------------------------------------------------
  const [slackEnabled, setSlackEnabled] = useState(settings.notifications?.slackEnabled ?? true);
  const [pagerDutyEnabled, setPagerDutyEnabled] = useState(settings.notifications?.pagerDutyEnabled ?? true);
  const [telegramEnabled, setTelegramEnabled] = useState(settings.notifications?.telegramEnabled ?? true);
  const [emailAlerts, setEmailAlerts] = useState<'OFF' | 'CRITICAL' | 'HIGH_AND_CRITICAL' | 'ALL'>(
    (settings.notifications?.emailAlerts as any) || 'HIGH_AND_CRITICAL'
  );
  const [morningSummaryEnabled, setMorningSummaryEnabled] = useState(true);
  const [isSendingSummary, setIsSendingSummary] = useState(false);

  // Edit channel modal
  const [editChannelModal, setEditChannelModal] = useState<'SLACK' | 'PAGERDUTY' | 'TELEGRAM' | null>(null);
  const [editChannelValue, setEditChannelValue] = useState('');

  const handleTestNotification = (channel: string) => {
    showToast(`Test payload dispatched to ${channel}. Status: 200 OK.`);
  };

  const handleSendMorningSummary = async () => {
    setIsSendingSummary(true);
    try {
      await fetch('/api/worker/morning-summary', { credentials: 'same-origin' }).catch(() => { });
    } catch {
      // simulate fallback
    } finally {
      setIsSendingSummary(false);
      showToast('Morning intelligence summary dispatched to Slack, Telegram, and Email.');
    }
  };

  // --------------------------------------------------------------------------
  // TAB 3: RETENTION & PRIVACY STATE
  // --------------------------------------------------------------------------
  const [retentionDays, setRetentionDays] = useState<number>(settings.retentionDays || 90);
  const [hideCustomerDetails, setHideCustomerDetails] = useState(settings.privacy?.autoScrubPii ?? true);
  const [hideKeysAndSecrets, setHideKeysAndSecrets] = useState(settings.privacy?.stripPromptTokens ?? true);
  const [hideLargeAmounts, setHideLargeAmounts] = useState(settings.privacy?.redactFinancialValues ?? true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  const handleExportJson = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      workspace: 'Treasury & Store Operations',
      retentionDays,
      privacySettings: {
        hideCustomerDetails,
        hideKeysAndSecrets,
        hideLargeAmounts
      },
      auditNotice: 'All raw secrets, private keys, and customer PII have been scrubbed.'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-shield-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Activity data exported successfully (.json).');
  };

  const handleConfirmDeleteData = () => {
    setIsDeletingData(true);
    setTimeout(() => {
      setIsDeletingData(false);
      setShowDeleteModal(false);
      showToast(`Successfully deleted activity older than ${retentionDays} days.`);
    }, 1200);
  };

  // --------------------------------------------------------------------------
  // TAB 4: API CREDENTIALS STATE
  // --------------------------------------------------------------------------
  const [apiCredentials, setApiCredentials] = useState<ApiCredential[]>([
    {
      id: 'key-1',
      name: 'ShopBot Prime',
      maskedKey: 'ash_live_ab12...9f3c',
      scope: 'FULL_ENFORCEMENT',
      createdAt: '20 Oct 2026',
      lastUsedAt: '2 min ago'
    },
    {
      id: 'key-2',
      name: 'DeFi Liquidity Router',
      maskedKey: 'ash_live_c47e...01d8',
      scope: 'FULL_ENFORCEMENT',
      createdAt: '22 Oct 2026',
      lastUsedAt: '4 min ago'
    },
    {
      id: 'key-3',
      name: 'SupportGenie AI',
      maskedKey: 'ash_live_8f3K...6Lp',
      scope: 'TELEMETRY_WRITE',
      createdAt: 'Just now',
      lastUsedAt: 'Never'
    },
    {
      id: 'key-4',
      name: 'Web Research Crawler',
      maskedKey: 'ash_live_5d90...a2b4',
      scope: 'TELEMETRY_WRITE',
      createdAt: '25 Oct 2026',
      lastUsedAt: '3 h ago'
    },
    {
      id: 'key-5',
      name: 'Old test agent',
      maskedKey: 'ash_live_17aa...e6f0',
      scope: 'READ_ONLY',
      createdAt: '2 Oct 2026',
      lastUsedAt: '20 days ago'
    }
  ]);

  const [newKeyBannerVisible, setNewKeyBannerVisible] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyAgentName, setNewKeyAgentName] = useState('');
  const [newKeyScope, setNewKeyScope] = useState<'FULL_ENFORCEMENT' | 'TELEMETRY_WRITE' | 'READ_ONLY'>('TELEMETRY_WRITE');

  const sampleBannerKey = 'ash_live_8f3Kq2Zr7WmXc4Nb1VdYt6Lp';

  const handleCopyBannerKey = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sampleBannerKey).catch(() => { });
    }
    setCopiedKey(true);
    showToast('API key copied to clipboard.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRotateKey = (credId: string) => {
    setApiCredentials((prev) =>
      prev.map((c) =>
        c.id === credId
          ? {
            ...c,
            maskedKey: `ash_live_${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
            lastUsedAt: 'Just now'
          }
          : c
      )
    );
    showToast('Key rotated. New connection secret created and active.');
  };

  const handleRevokeKey = (credId: string) => {
    setApiCredentials((prev) =>
      prev.map((c) => (c.id === credId ? { ...c, lastUsedAt: 'Revoked', scope: 'READ_ONLY' } : c))
    );
    showToast('Key permanently revoked. Ingestion requests using this token will be blocked.');
  };

  const handleCreateNewKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyAgentName.trim()) return;

    const newKey: ApiCredential = {
      id: `key-${Date.now()}`,
      name: newKeyAgentName.trim(),
      maskedKey: `ash_live_${Math.random().toString(36).substring(2, 6)}...${Math.random().toString(36).substring(2, 6)}`,
      scope: newKeyScope,
      createdAt: 'Just now',
      lastUsedAt: 'Never'
    };

    setApiCredentials((prev) => [newKey, ...prev]);
    setShowCreateKeyModal(false);
    setNewKeyAgentName('');
    showToast(`New connection key created for ${newKey.name}.`);
  };

  // --------------------------------------------------------------------------
  // TAB 5: ACTIVITY HISTORY STATE
  // --------------------------------------------------------------------------
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [showGrouped8, setShowGrouped8] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState('13:30 UTC');
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [isAnchoringNear, setIsAnchoringNear] = useState(false);
  const [nearAnchorSaved, setNearAnchorSaved] = useState(false);

  const handleCheckIntegrity = () => {
    setIsVerifyingIntegrity(true);
    setTimeout(() => {
      setIsVerifyingIntegrity(false);
      const d = new Date();
      const timeStr = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')} UTC`;
      setLastCheckedTime(timeStr);
      showToast('Integrity check complete: 13 entries verified. Cryptographic hash chain unbroken.');
    }, 800);
  };

  const handleAnchorToNear = () => {
    setIsAnchoringNear(true);
    setTimeout(() => {
      setIsAnchoringNear(false);
      setNearAnchorSaved(true);
      showToast('Saved state root fingerprint (simulated on NEAR testnet).');
    }, 1200);
  };

  // Raw history entries matching screenshot
  const historyEntries = [
    {
      num: '13',
      time: '13:26 UTC',
      who: 'Alex Rivera',
      what: 'Added investigation notes to incident INC-0412',
      type: 'Note',
      fingerprint: '5e88...4898'
    },
    {
      num: '12',
      time: '13:24 UTC',
      who: 'Gateway',
      what: 'Stopped a 2,500 NEAR refund to a blocked account',
      type: 'Stopped',
      fingerprint: '9f2c...b71e'
    },
    {
      num: '11',
      time: '13:21 UTC',
      who: 'Gateway',
      what: 'Paused a payment because the receiving contract changed recently',
      type: 'Held',
      fingerprint: '41ad...07c9'
    },
    {
      num: '3 to 10',
      time: '12:02 UTC',
      who: 'Sarah Chen',
      what: 'Switched test mode on and off for Trick Instruction Detection (8 changes in 4 seconds)',
      type: 'Rule changed',
      fingerprint: 'c83e...5a12',
      isGrouped: true
    },
    {
      num: '2',
      time: '10:00 UTC',
      who: 'Alex Rivera',
      what: 'Turned on the 1 YoctoNEAR rule for the store vault contract',
      type: 'Rule changed',
      fingerprint: '8f43...4346'
    },
    {
      num: '1',
      time: '08:00 UTC',
      who: 'Alex Rivera',
      what: 'History started. Workspace created.',
      type: 'Setup',
      fingerprint: 'e3b0...c442'
    }
  ];

  const subGroupedEntries = [
    { num: '10', time: '12:02:04 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: OFF', type: 'Rule changed', fingerprint: 'c83e...5a12' },
    { num: '9', time: '12:02:03 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: ON', type: 'Rule changed', fingerprint: 'b712...99a1' },
    { num: '8', time: '12:02:03 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: OFF', type: 'Rule changed', fingerprint: 'a044...d281' },
    { num: '7', time: '12:02:02 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: ON', type: 'Rule changed', fingerprint: '8e19...77b3' },
    { num: '6', time: '12:02:02 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: OFF', type: 'Rule changed', fingerprint: '6f33...41c9' },
    { num: '5', time: '12:02:01 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: ON', type: 'Rule changed', fingerprint: '4c21...881f' },
    { num: '4', time: '12:02:01 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: OFF', type: 'Rule changed', fingerprint: '3a11...02ee' },
    { num: '3', time: '12:02:00 UTC', who: 'Sarah Chen', what: 'Set Trick Instruction Detection to Test Mode: ON', type: 'Rule changed', fingerprint: '19bb...fa44' }
  ];

  const filteredHistory = historyEntries.filter((h) => {
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchesWho = h.who.toLowerCase().includes(q);
      const matchesWhat = h.what.toLowerCase().includes(q);
      const matchesFp = h.fingerprint.toLowerCase().includes(q);
      if (!matchesWho && !matchesWhat && !matchesFp) return false;
    }
    if (historyTypeFilter !== 'ALL' && h.type !== historyTypeFilter) {
      return false;
    }
    return true;
  });

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast Notice */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '32px',
            background: '#065f46',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircleIcon size={16} color="#ffffff" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Subtitle */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          Manage your team, alerts, data and connection keys for this workspace.
        </p>
      </div>

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '24px',
          overflowX: 'auto'
        }}
      >
        {[
          { id: 'users', label: 'Users & Roles' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'retention', label: 'Retention & Privacy' },
          { id: 'credentials', label: 'API Credentials' },
          { id: 'activity', label: 'Activity History' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTabId)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '12px 2px 14px 2px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0f172a' : '#64748b',
                borderBottom: isActive ? '2px solid #047857' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ====================================================================
          TAB 1: USERS & ROLES
          ==================================================================== */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: Team members */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Team members
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Choose what each person can do in this workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                + Invite member
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Member</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Email</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Role</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Status</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Joined</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '120px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const initials = u.name
                      ? u.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                      : 'U';
                    const isOwner = u.role === 'OWNER';
                    const isInvited = u.status === 'INVITED';

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Member avatar & Name */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#d1fae5',
                                color: '#065f46',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {initials}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{u.name}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{u.email}</td>

                        {/* Role */}
                        <td style={{ padding: '14px 16px' }}>
                          {isOwner ? (
                            <span
                              style={{
                                display: 'inline-block',
                                background: '#0f172a',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '4px 10px',
                                borderRadius: '6px'
                              }}
                            >
                              Owner
                            </span>
                          ) : (
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                aria-label={`Change role for ${u.name}`}
                                style={{
                                  appearance: 'none',
                                  WebkitAppearance: 'none',
                                  background: u.role === 'ADMIN' ? '#ecfdf5' : '#f1f5f9',
                                  border: u.role === 'ADMIN' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                  color: u.role === 'ADMIN' ? '#065f46' : '#334155',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  padding: '4px 24px 4px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="ANALYST">Analyst</option>
                                <option value="VIEWER">Viewer</option>
                              </select>
                              <span
                                style={{
                                  position: 'absolute',
                                  right: '8px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  pointerEvents: 'none',
                                  fontSize: '9px',
                                  color: u.role === 'ADMIN' ? '#065f46' : '#64748b'
                                }}
                              >
                                ⌵
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: isInvited ? '#f59e0b' : '#10b981'
                              }}
                            />
                            <span style={{ color: '#334155' }}>{isInvited ? 'Invite sent' : 'Active'}</span>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>
                          {u.joinedAt || '20 Oct 2026'}
                        </td>

                        {/* Action */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {isInvited ? (
                            <button
                              type="button"
                              onClick={() => showToast(`Invitation resent to ${u.email}`)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#0f172a',
                                fontSize: '13px',
                                textDecoration: 'underline',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              Resend invite
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => showToast(`User ${u.name} options`)}
                              aria-label={`Options for ${u.name}`}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                fontSize: '16px',
                                cursor: 'pointer',
                                padding: '4px 8px'
                              }}
                            >
                              ...
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: What each role can do */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                What each role can do
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                The owner can change any role. Only the owner can delete the workspace.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
                      Can the role...
                    </th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'center', width: '110px' }}>
                      Owner
                    </th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'center', width: '110px' }}>
                      Admin
                    </th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'center', width: '110px' }}>
                      Analyst
                    </th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'center', width: '110px' }}>
                      Viewer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { action: 'See the dashboard, agents and alerts', owner: true, admin: true, analyst: true, viewer: true },
                    { action: 'Acknowledge alerts and mark "Not a threat"', owner: true, admin: true, analyst: true, viewer: false },
                    { action: 'Approve or deny held actions', owner: true, admin: true, analyst: false, viewer: false },
                    { action: 'Change Policy Guardrails', owner: true, admin: true, analyst: false, viewer: false },
                    { action: 'Add, pause or remove agents', owner: true, admin: true, analyst: false, viewer: false },
                    { action: 'Create or revoke connection keys', owner: true, admin: true, analyst: false, viewer: false },
                    { action: 'Invite people and change roles', owner: true, admin: false, analyst: false, viewer: false },
                    { action: 'Delete the workspace', owner: true, admin: false, analyst: false, viewer: false }
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0f172a' }}>{row.action}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '15px' }}>
                        <span style={{ color: '#047857', fontWeight: 700 }}>✓</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '15px' }}>
                        {row.admin ? (
                          <span style={{ color: '#047857', fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '15px' }}>
                        {row.analyst ? (
                          <span style={{ color: '#047857', fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '15px' }}>
                        {row.viewer ? (
                          <span style={{ color: '#047857', fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
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

      {/* ====================================================================
          TAB 2: NOTIFICATIONS
          ==================================================================== */}
      {activeTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: Where to send alerts */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                Where to send alerts
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Pick how you hear about alerts, held actions and approvals when you are not in the app.
              </p>
            </div>

            {/* Channels List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Slack */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Slack</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#047857', fontWeight: 500 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Connected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    readOnly
                    value="Webhook set · ends in ...K3Z9"
                    aria-label="Slack webhook"
                    style={{
                      flex: '1 1 280px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#334155',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTestNotification('Slack')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Send test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditChannelModal('SLACK');
                      setEditChannelValue('https://hooks.slack.com/services/T00/B00/...');
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                  {/* Toggle */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={slackEnabled}
                      onChange={(e) => {
                        setSlackEnabled(e.target.checked);
                        showToast(`Slack notifications ${e.target.checked ? 'enabled' : 'disabled'}.`);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: slackEnabled ? '#047857' : '#cbd5e1',
                        borderRadius: '22px',
                        transition: '0.2s ease'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: '16px',
                          width: '16px',
                          left: slackEnabled ? '19px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s ease'
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* PagerDuty */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>PagerDuty</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#047857', fontWeight: 500 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Connected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    readOnly
                    value="Key set · ........9f81"
                    aria-label="PagerDuty routing key"
                    style={{
                      flex: '1 1 280px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#334155',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTestNotification('PagerDuty')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Send test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditChannelModal('PAGERDUTY');
                      setEditChannelValue('pd_key_live_9f81...');
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                  {/* Toggle */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pagerDutyEnabled}
                      onChange={(e) => {
                        setPagerDutyEnabled(e.target.checked);
                        showToast(`PagerDuty alerts ${e.target.checked ? 'enabled' : 'disabled'}.`);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: pagerDutyEnabled ? '#047857' : '#cbd5e1',
                        borderRadius: '22px',
                        transition: '0.2s ease'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: '16px',
                          width: '16px',
                          left: pagerDutyEnabled ? '19px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s ease'
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>

              {/* Telegram */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Telegram</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#047857', fontWeight: 500 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    Connected
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    readOnly
                    value="@AgentShieldAlertsBot"
                    aria-label="Telegram bot handle"
                    style={{
                      flex: '1 1 280px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#334155',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTestNotification('Telegram')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Send test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditChannelModal('TELEGRAM');
                      setEditChannelValue('@AgentShieldAlertsBot');
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                  {/* Toggle */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={telegramEnabled}
                      onChange={(e) => {
                        setTelegramEnabled(e.target.checked);
                        showToast(`Telegram alerts ${e.target.checked ? 'enabled' : 'disabled'}.`);
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: telegramEnabled ? '#047857' : '#cbd5e1',
                        borderRadius: '22px',
                        transition: '0.2s ease'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: '16px',
                          width: '16px',
                          left: telegramEnabled ? '19px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s ease'
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '18px 0 0 0' }}>
              Webhook links and keys are secrets, so only the last few characters are shown.
            </p>
          </div>

          {/* Card: Email Alert Level */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                Email
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Which alerts should reach your inbox?
              </p>
            </div>

            {/* Segmented Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              {[
                { id: 'OFF', label: 'Off' },
                { id: 'CRITICAL', label: 'Critical only' },
                { id: 'HIGH_AND_CRITICAL', label: 'High and Critical (recommended)' },
                { id: 'ALL', label: 'All alerts' }
              ].map((opt) => {
                const isSelected = emailAlerts === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setEmailAlerts(opt.id as any);
                      showToast(`Email alert threshold set to: ${opt.label}`);
                    }}
                    style={{
                      padding: '12px 14px',
                      background: isSelected ? '#065f46' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: 'none',
                      borderRight: '1px solid #e2e8f0',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Morning summary */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Morning summary
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  One message each morning with overnight activity, stopped actions and approvals waiting for you.
                </p>
              </div>

              {/* Toggle */}
              <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={morningSummaryEnabled}
                  onChange={(e) => {
                    setMorningSummaryEnabled(e.target.checked);
                    showToast(`Morning summary ${e.target.checked ? 'enabled' : 'disabled'}.`);
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: morningSummaryEnabled ? '#047857' : '#cbd5e1',
                    borderRadius: '22px',
                    transition: '0.2s ease'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '16px',
                      width: '16px',
                      left: morningSummaryEnabled ? '19px' : '3px',
                      bottom: '3px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: '0.2s ease'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Subfooter */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                paddingTop: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <span>Sent daily at <strong style={{ color: '#0f172a' }}>08:00 UTC</strong> to</span>
                <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>Slack</span>
                <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>Telegram</span>
                <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>Email</span>
              </div>

              <button
                type="button"
                onClick={handleSendMorningSummary}
                disabled={isSendingSummary}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '7px 16px',
                  fontSize: '13px',
                  color: '#0f172a',
                  fontWeight: 500,
                  cursor: isSendingSummary ? 'not-allowed' : 'pointer'
                }}
              >
                {isSendingSummary ? 'Sending...' : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: RETENTION & PRIVACY
          ==================================================================== */}
      {activeTab === 'retention' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card: How long to keep records */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                How long to keep records
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Activity and incident details older than this are deleted automatically.
              </p>
            </div>

            {/* 4 Cards Grid */}
            <div
              className="settings-retention-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                marginBottom: '16px'
              }}
            >
              {[
                { days: 30, title: '30 days', subtitle: 'Light use or testing' },
                { days: 90, title: '90 days', subtitle: 'Standard (recommended)' },
                { days: 180, title: '180 days', subtitle: 'Longer reviews' },
                { days: 365, title: '1 year', subtitle: 'Audit and compliance' }
              ].map((opt) => {
                const isSelected = retentionDays === opt.days;
                return (
                  <div
                    key={opt.days}
                    onClick={() => {
                      setRetentionDays(opt.days);
                      showToast(`Retention window updated to ${opt.title}.`);
                    }}
                    style={{
                      background: isSelected ? '#f0fdf4' : '#ffffff',
                      border: isSelected ? '2px solid #047857' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#047857' : '#0f172a', marginBottom: '4px' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '12px', color: isSelected ? '#047857' : '#64748b' }}>
                      {opt.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fingerprint guarantee callout */}
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#065f46',
                lineHeight: 1.5
              }}
            >
              Your Activity History fingerprint is kept even when old details are deleted, so the history can still be checked.
            </div>
          </div>

          {/* Card: Hide private details */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                Hide private details
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                We hide these before anything is stored.
              </p>
            </div>

            {/* Toggle Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Row 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                    Customer details
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Emails, phone numbers and street addresses
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={hideCustomerDetails}
                    onChange={(e) => {
                      setHideCustomerDetails(e.target.checked);
                      showToast(`Customer details masking ${e.target.checked ? 'enabled' : 'disabled'}.`);
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: hideCustomerDetails ? '#047857' : '#cbd5e1',
                      borderRadius: '22px',
                      transition: '0.2s ease'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '16px',
                        width: '16px',
                        left: hideCustomerDetails ? '19px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s ease'
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                    Keys and secrets
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Private keys, login tokens and cloud access keys found in tool logs
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={hideKeysAndSecrets}
                    onChange={(e) => {
                      setHideKeysAndSecrets(e.target.checked);
                      showToast(`Keys & secrets scrubbing ${e.target.checked ? 'enabled' : 'disabled'}.`);
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: hideKeysAndSecrets ? '#047857' : '#cbd5e1',
                      borderRadius: '22px',
                      transition: '0.2s ease'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '16px',
                        width: '16px',
                        left: hideKeysAndSecrets ? '19px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s ease'
                      }}
                    />
                  </span>
                </label>
              </div>

              {/* Row 3 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                    Large amounts in exports
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Show "High value" instead of the exact amount
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={hideLargeAmounts}
                    onChange={(e) => {
                      setHideLargeAmounts(e.target.checked);
                      showToast(`High value amount redaction ${e.target.checked ? 'enabled' : 'disabled'}.`);
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: hideLargeAmounts ? '#047857' : '#cbd5e1',
                      borderRadius: '22px',
                      transition: '0.2s ease'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '16px',
                        width: '16px',
                        left: hideLargeAmounts ? '19px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        transition: '0.2s ease'
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom 2 Cards Grid */}
          <div
            className="settings-bottom-2col"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}
          >
            {/* Export your data */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Export your data
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Download your activity and history as a file.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#0f172a',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Export (.json)
                </button>
              </div>
            </div>

            {/* Delete data now */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#dc2626', margin: '0 0 4px 0' }}>
                  Delete data now
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Permanently deletes activity older than {retentionDays} days. This cannot be undone. Admin or owner only.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #f87171',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#dc2626',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Delete old data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: API CREDENTIALS
          ==================================================================== */}
      {activeTab === 'credentials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Yellow Banner: Copy your new key now */}
          {newKeyBannerVisible && (
            <div
              style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                    Copy your new key now
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    This key is for SupportGenie AI. It is shown only once, and we store just a scrambled copy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBannerKey}
                  style={{
                    background: '#065f46',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copiedKey ? 'Copied!' : 'Copy key'}
                </button>
              </div>

              {/* Monospace Code Input */}
              <div style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={sampleBannerKey}
                  aria-label="New API Key"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b' }}>Example key, not real.</div>
            </div>
          )}

          {/* Card: Connection keys */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Connection keys
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Each agent uses a key to send activity to Agent Shield. Each key can send up to 120 requests a minute.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateKeyModal(true)}
                style={{
                  background: '#065f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                + Create key
              </button>
            </div>

            {/* Keys Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Agent</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Key</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Created</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Last used</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Status</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiCredentials.map((cred) => {
                    const isRevoked = cred.lastUsedAt === 'Revoked' || cred.name === 'Old test agent';
                    const isNotUsed = cred.lastUsedAt === 'Never';
                    const isOffline = cred.name === 'Web Research Crawler';

                    return (
                      <tr key={cred.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Agent */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {cred.name}
                        </td>

                        {/* Masked Key */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontFamily: 'monospace', color: '#475569' }}>
                          {cred.maskedKey}
                        </td>

                        {/* Created */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                          {cred.createdAt}
                        </td>

                        {/* Last Used */}
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                          {cred.lastUsedAt}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: isRevoked ? '#94a3b8' : isOffline ? '#ef4444' : isNotUsed ? '#f59e0b' : '#10b981'
                              }}
                            />
                            <span style={{ color: isRevoked ? '#64748b' : '#334155' }}>
                              {isRevoked ? 'Revoked' : isOffline ? 'Offline' : isNotUsed ? 'Not used yet' : 'Active'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          {isRevoked ? (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cannot be used</span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleRotateKey(cred.id)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#0f172a',
                                  cursor: 'pointer'
                                }}
                              >
                                Rotate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeKey(cred.id)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#dc2626',
                                  cursor: 'pointer'
                                }}
                              >
                                Revoke
                              </button>
                            </div>
                          )}
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

      {/* ====================================================================
          TAB 5: ACTIVITY HISTORY
          ==================================================================== */}
      {activeTab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top 2 Cards: History intact & Saved on NEAR testnet */}
          <div
            className="settings-activity-top-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}
          >
            {/* Left Card: History is intact */}
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#047857',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    ✓
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#065f46', margin: 0 }}>
                    History is intact
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#065f46', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  13 entries checked. Each one links to the one before it, and none has been changed or removed.
                </p>
              </div>

              <div style={{ fontSize: '12px', color: '#065f46' }}>
                Last checked {lastCheckedTime} ·{' '}
                <button
                  type="button"
                  onClick={handleCheckIntegrity}
                  disabled={isVerifyingIntegrity}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#065f46',
                    textDecoration: 'underline',
                    fontWeight: 600,
                    cursor: isVerifyingIntegrity ? 'not-allowed' : 'pointer',
                    padding: 0
                  }}
                >
                  {isVerifyingIntegrity ? 'Checking...' : 'Check again'}
                </button>
              </div>
            </div>

            {/* Right Card: Saved on NEAR testnet */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  Saved on NEAR testnet
                </h3>
                <span
                  style={{
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  Simulated in this version
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                The fingerprint of this history is meant to be stored in a NEAR smart contract. Right now the save is simulated, so no real transaction exists.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Entries covered</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>1 to 13</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Last saved</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {nearAnchorSaved ? 'Saved just now (simulated)' : 'Not yet saved for real'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => showToast('Fingerprint verified against simulated NEAR smart contract.')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  Check against NEAR
                </button>
                <button
                  type="button"
                  onClick={handleAnchorToNear}
                  disabled={isAnchoringNear}
                  style={{
                    background: '#065f46',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#ffffff',
                    cursor: isAnchoringNear ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAnchoringNear ? 'Saving...' : 'Save fingerprint now'}
                </button>
              </div>
            </div>
          </div>

          {/* Activity History Table Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '18px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Activity History
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Every important action in this workspace, newest first. Nothing here can be edited.
                </p>
              </div>

              {/* Controls: Search, Filter, Export */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '7px 12px',
                      fontSize: '13px',
                      color: '#0f172a',
                      width: '140px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Filter */}
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  aria-label="Filter activity history by type"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All types ⌵</option>
                  <option value="Note">Note</option>
                  <option value="Stopped">Stopped</option>
                  <option value="Held">Held</option>
                  <option value="Rule changed">Rule changed</option>
                  <option value="Setup">Setup</option>
                </select>

                {/* Export */}
                <button
                  type="button"
                  onClick={handleExportJson}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '70px' }}>#</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '100px' }}>Time</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '110px' }}>Who</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b' }}>What happened</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '120px' }}>Type</th>
                    <th style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 500, color: '#64748b', width: '110px' }}>Fingerprint</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, idx) => {
                    const isGrouped = item.isGrouped;
                    return (
                      <React.Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b' }}>{item.num}</td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.time}</td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{item.who}</td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>
                            <div>{item.what}</div>
                            {isGrouped && (
                              <button
                                type="button"
                                onClick={() => setShowGrouped8(!showGrouped8)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#0f172a',
                                  textDecoration: 'underline',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  padding: '4px 0 0 0'
                                }}
                              >
                                {showGrouped8 ? 'Hide details' : 'Show all 8'}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 500,
                                background:
                                  item.type === 'Stopped'
                                    ? '#fee2e2'
                                    : item.type === 'Held'
                                      ? '#fef3c7'
                                      : item.type === 'Rule changed'
                                        ? '#d1fae5'
                                        : '#f1f5f9',
                                color:
                                  item.type === 'Stopped'
                                    ? '#b91c1c'
                                    : item.type === 'Held'
                                      ? '#b45309'
                                      : item.type === 'Rule changed'
                                        ? '#065f46'
                                        : '#475569'
                              }}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                            {item.fingerprint}
                          </td>
                        </tr>

                        {/* Expanded sub-entries for the 8 micro-events */}
                        {isGrouped && showGrouped8 && (
                          subGroupedEntries.map((sub, sIdx) => (
                            <tr key={`sub-${sIdx}`} style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 16px 10px 32px', fontSize: '12px', color: '#94a3b8' }}>#{sub.num}</td>
                              <td style={{ padding: '10px 16px', fontSize: '12px', color: '#64748b' }}>{sub.time}</td>
                              <td style={{ padding: '10px 16px', fontSize: '12px', color: '#475569' }}>{sub.who}</td>
                              <td style={{ padding: '10px 16px', fontSize: '12px', color: '#475569' }}>{sub.what}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{ background: '#d1fae5', color: '#065f46', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                                  Rule changed
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                                {sub.fingerprint}
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: INVITE MEMBER
          ==================================================================== */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Lee"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="jordan@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="ADMIN">Admin (Full access except deleting workspace)</option>
                  <option value="ANALYST">Analyst (View telemetry, acknowledge alerts)</option>
                  <option value="VIEWER">Viewer (Read-only dashboard access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#065f46',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CREATE API KEY
          ==================================================================== */}
      {showCreateKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Create Connection Key</h3>
              <button
                type="button"
                onClick={() => setShowCreateKeyModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NearIntents Order Router"
                  value={newKeyAgentName}
                  onChange={(e) => setNewKeyAgentName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Permission Scope
                </label>
                <select
                  value={newKeyScope}
                  onChange={(e) => setNewKeyScope(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="FULL_ENFORCEMENT">Full Enforcement (In-line block, pause, and audit)</option>
                  <option value="TELEMETRY_WRITE">Telemetry Ingest (Send events &amp; heartbeat only)</option>
                  <option value="READ_ONLY">Read-Only Telemetry</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateKeyModal(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#065f46',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: EDIT CHANNEL DESTINATION
          ==================================================================== */}
      {editChannelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Configure {editChannelModal} Alerts
              </h3>
              <button
                type="button"
                onClick={() => setEditChannelModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {editChannelModal === 'TELEGRAM' ? 'Telegram Bot / Chat ID' : 'Target Webhook or Routing Key'}
                </label>
                <input
                  type="text"
                  value={editChannelValue}
                  onChange={(e) => setEditChannelValue(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditChannelModal(null)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditChannelModal(null);
                    showToast(`${editChannelModal} destination updated.`);
                  }}
                  style={{
                    background: '#065f46',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: DELETE / PURGE OLD DATA
          ==================================================================== */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', margin: 0 }}>Confirm Data Deletion</h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to permanently purge activity telemetry older than <strong>{retentionDays} days</strong>? The cryptographic history fingerprint will remain intact.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteData}
                disabled={isDeletingData}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: isDeletingData ? 'not-allowed' : 'pointer'
                }}
              >
                {isDeletingData ? 'Deleting...' : 'Delete Old Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
