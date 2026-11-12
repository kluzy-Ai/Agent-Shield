'use client';

import React, { useState, useEffect } from 'react';
import { ThreatReport } from '@/types';
import {
  ShieldAlertIcon,
  ShieldCheckIcon,
  TrashIcon,
  CheckCircleIcon
} from './icons';

interface PlatformTakedownConsoleProps {
  isPlatformOwner: boolean;
  onTakedownComplete?: () => void;
}

export function PlatformTakedownConsole({ isPlatformOwner, onTakedownComplete }: PlatformTakedownConsoleProps) {
  const [reports, setReports] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [takedownTarget, setTakedownTarget] = useState<ThreatReport | null>(null);
  const [takedownReason, setTakedownReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = isPlatformOwner;

  const fetchFlaggedReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/threat-intel/admin/flagged');
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden: Platform owner permission required.');
        }
        throw new Error('Failed to load flagged reports.');
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
      <div style={{ padding: '32px' }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #fee2e2',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <ShieldAlertIcon size={40} color="#dc2626" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '16px', marginBottom: '8px' }}>
            Platform Owner Privilege Required
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Platform Owner Takedown Console
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Manage community-flagged reports and execute platform-level takedowns or confirmations. Gated strictly by server-side flag.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchFlaggedReports}
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
          Refresh Queue
        </button>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontSize: '16px' }}
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Loading flagged reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{
          padding: '48px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <CheckCircleIcon size={36} color="#16a34a" />
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '12px', marginBottom: '4px' }}>
            Queue Clean
          </h4>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Zero community-flagged reports pending review. All public submissions meet community standards.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                borderLeft: rep.isHidden ? '4px solid #dc2626' : '4px solid #d97706',
                padding: '20px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#065f46', fontWeight: 700 }}>
                      {rep.id}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: rep.isHidden ? '#b91c1c' : '#92400e',
                      background: rep.isHidden ? '#fee2e2' : '#fef3c7',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {rep.isHidden ? 'AUTO-HIDDEN (>= 3 Flags)' : `FLAGGED (${rep.flagCount || 1} Flags)`}
                    </span>
                    {rep.isConfirmed && (
                      <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                        Confirmed
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {rep.title}
                  </h4>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!rep.isConfirmed && (
                    <button
                      type="button"
                      onClick={() => handleConfirm(rep.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#166534',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldCheckIcon size={14} color="#166534" />
                      <span>Confirm</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setTakedownTarget(rep);
                      setTakedownReason('');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#b91c1c',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <TrashIcon size={14} color="#b91c1c" />
                    <span>Take Down</span>
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '8px 0', wordBreak: 'break-word' }}>
                {rep.description}
              </p>

              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '16px', marginTop: '10px' }}>
                <span>Category: <strong style={{ color: '#0f172a' }}>{rep.threatCategory}</strong></span>
                <span>Submitted: <strong style={{ color: '#0f172a' }}>{new Date(rep.createdAt).toLocaleString()}</strong></span>
                {rep.takedownReason && (
                  <span>Takedown Reason: <strong style={{ color: '#b91c1c' }}>{rep.takedownReason}</strong></span>
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
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrashIcon size={18} color="#dc2626" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Execute Platform Takedown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTakedownTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', lineHeight: 1.5 }}>
              Permanently hide report <strong>{takedownTarget.id}</strong> (&ldquo;{takedownTarget.title}&rdquo;) from the public feed. Takedown rationale will be cryptographically anchored to the immutable audit chain.
            </p>

            <form onSubmit={handleTakedown}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  Takedown Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
                  placeholder="Specify violation (e.g. offensive language, fake report, private keys exposed)..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTakedownTarget(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !takedownReason.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Removing...' : 'Confirm Takedown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
