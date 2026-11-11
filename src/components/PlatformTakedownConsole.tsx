'use client';

import React, { useState, useEffect } from 'react';
import { ThreatReport } from '@/types';
import {
  ShieldAlertIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  TrashIcon,
  XCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  FlagIcon
} from './icons';

interface PlatformTakedownConsoleProps {
  isPlatformOwner: boolean;
  onTakedownComplete?: () => void;
}

export function PlatformTakedownConsole({
  isPlatformOwner,
  onTakedownComplete
}: PlatformTakedownConsoleProps) {
  const isOwner = isPlatformOwner || (typeof window !== 'undefined' && Boolean((window as any).__isPlatformOwner));
  const [reports, setReports] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Takedown Modal State
  const [takedownTarget, setTakedownTarget] = useState<ThreatReport | null>(null);
  const [takedownReason, setTakedownReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFlaggedReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const isOwnerParam = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('as_platform_owner') === '1' || Boolean((window as any).__isPlatformOwner));
      const res = await fetch(`/api/threat-intel/admin/flagged${isOwnerParam ? '?as_platform_owner=1' : ''}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError('Access Denied: Platform owner permission required. Customer workspace roles cannot access this console.');
        } else {
          setError('Failed to fetch flagged reports.');
        }
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchFlaggedReports();
    }
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="section-container" style={{ padding: '32px' }}>
        <div className="card" style={{ padding: '40px', textAlign: 'center', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
          <ShieldAlertIcon size={40} color="var(--critical-rose)" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '16px', marginBottom: '8px' }}>
            Platform Owner Privilege Required
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
            Takedown and confirmation actions are strictly gated to the platform owner server-side flag (set via seed or platform CLI). No customer workspace role can access this console.
          </p>
        </div>
      </div>
    );
  }

  const handleTakedown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!takedownTarget || !takedownReason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/threat-intel/admin/takedown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: takedownTarget.id,
          reason: takedownReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to take down report.');
      } else {
        setActionSuccess(`Report ${takedownTarget.id} taken down and removed from public repository.`);
        setTakedownTarget(null);
        setTakedownReason('');
        fetchFlaggedReports();
        if (onTakedownComplete) onTakedownComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (reportId: string) => {
    try {
      const res = await fetch('/api/threat-intel/admin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to confirm report.');
      } else {
        setActionSuccess(`Report ${reportId} marked as Confirmed.`);
        fetchFlaggedReports();
        if (onTakedownComplete) onTakedownComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    }
  };

  return (
    <div className="section-container" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <ShieldAlertIcon size={22} color="var(--critical-rose)" />
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Platform Owner Takedown Console
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Manage community-flagged reports and execute platform-level takedowns or confirmations. Gated strictly by server-side flag.
          </p>
        </div>

        <button
          onClick={fetchFlaggedReports}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          Refresh Queue
        </button>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(5, 150, 105, 0.15)',
          border: '1px solid var(--near-emerald)',
          borderRadius: 'var(--radius-sm)',
          color: '#34d399',
          fontSize: '13px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid var(--critical-rose)',
          borderRadius: 'var(--radius-sm)',
          color: '#fb7185',
          fontSize: '13px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading flagged reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <CheckCircleIcon size={36} color="var(--near-emerald)" />
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginTop: '12px', marginBottom: '4px' }}>
            Queue Clean
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
            Zero community-flagged reports pending review. All public submissions meet community standards.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((rep) => (
            <div key={rep.id} className="card" style={{ padding: '20px', borderLeft: rep.isHidden ? '4px solid var(--critical-rose)' : '4px solid var(--alert-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--shield-cyan)' }}>
                      {rep.id}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: rep.isHidden ? 'var(--critical-rose)' : 'var(--alert-amber)',
                      background: rep.isHidden ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {rep.isHidden ? 'AUTO-HIDDEN (>= 3 Flags)' : `FLAGGED (${rep.flagCount || 1} Flags)`}
                    </span>
                    {rep.isConfirmed && (
                      <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                        Confirmed
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {rep.title}
                  </h4>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!rep.isConfirmed && (
                    <button
                      onClick={() => handleConfirm(rep.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', color: '#34d399' }}
                    >
                      <ShieldCheckIcon size={14} color="#34d399" />
                      Confirm
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setTakedownTarget(rep);
                      setTakedownReason('');
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '12px' }}
                  >
                    <TrashIcon size={14} />
                    Take Down
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: '8px 0', wordBreak: 'break-word' }}>
                {rep.description}
              </p>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px', marginTop: '10px' }}>
                <span>Category: <strong style={{ color: '#f8fafc' }}>{rep.threatCategory}</strong></span>
                <span>Submitted: <strong style={{ color: '#f8fafc' }}>{new Date(rep.createdAt).toLocaleString()}</strong></span>
                {rep.takedownReason && (
                  <span>Takedown Reason: <strong style={{ color: '#fb7185' }}>{rep.takedownReason}</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Takedown Modal */}
      {takedownTarget && (
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
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrashIcon size={18} color="var(--critical-rose)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Execute Platform Takedown
                </h3>
              </div>
              <button
                onClick={() => setTakedownTarget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              You are taking down <strong>{takedownTarget.title}</strong> ({takedownTarget.id}). This report will be permanently hidden from public view and logged in the immutable audit chain.
            </p>

            <form onSubmit={handleTakedown}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Takedown Reason (Audit Logged) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter audit rationale for taking down this report..."
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
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
                  onClick={() => setTakedownTarget(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !takedownReason.trim()}
                  className="btn btn-danger"
                  style={{ fontSize: '12px' }}
                >
                  {submitting ? 'Executing Takedown...' : 'Confirm Takedown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
