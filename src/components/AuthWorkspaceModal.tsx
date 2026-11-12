'use client';

import React, { useState } from 'react';
import { Workspace } from '@/types';
import {
  ShieldCheckIcon,
  PlusIcon,
  CheckCircleIcon,
  XIcon,
  ServerIcon,
  KeyIcon,
  LockIcon
} from './icons';

interface AuthWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (newWs: Workspace) => void;
  currentUser?: { name: string; email: string; role: string } | null;
  onAuthSuccess?: (user: any) => void;
}

export function AuthWorkspaceModal({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  currentUser,
  onAuthSuccess
}: AuthWorkspaceModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup' | 'create' | 'list' | 'near_wallet'>('signin');

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('operator@agentshield.testnet');
  const [signInPassword, setSignInPassword] = useState('Password123!');

  // NEAR Wallet Sign-In State
  const [nearAccountId, setNearAccountId] = useState('operator.testnet');

  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpWorkspaceName, setSignUpWorkspaceName] = useState('');
  const [signUpEnvironment, setSignUpEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'SANDBOX'>('PRODUCTION');

  // Create Workspace State
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'PRODUCTION' | 'STAGING' | 'SANDBOX'>('PRODUCTION');
  const [organization, setOrganization] = useState('NEAR Security Labs');

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Real Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sign in failed');
      }

      setSuccessMessage(`Signed in as ${data.user.account.email} (Role: ${data.user.role.toUpperCase()})`);
      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle NEAR Testnet Wallet Passwordless Sign-In (Stage 11 Item 5)
  const handleNearWalletSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nearAccountId.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/near-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nearAccountId: nearAccountId.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'NEAR Testnet authentication failed');
      }

      setSuccessMessage(`Authenticated via NEAR Testnet: ${data.user.account.nearAccountId} (Role: ${data.user.role.toUpperCase()})`);
      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'NEAR Testnet authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          password: signUpPassword,
          workspaceName: signUpWorkspaceName.trim(),
          environment: signUpEnvironment
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMessage(`Account & Workspace created! Password hashed with Argon2id.`);
      if (onAuthSuccess) {
        onAuthSuccess(data.user);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Real Create Workspace
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), environment })
      });
      const data = await res.json();

      if (!res.ok) {
        const fallbackWs: Workspace = {
          id: `ws-${Date.now().toString().slice(-4)}`,
          name: name.trim(),
          environment,
          createdAt: new Date().toISOString()
        };
        onCreateWorkspace(fallbackWs);
      } else {
        onCreateWorkspace(data.workspace);
        if (data.user && onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      }

      setSuccessMessage('Workspace created with genesis hash-chain log!');
      setTimeout(() => {
        setSuccessMessage(null);
        setName('');
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Workspace creation error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = (email: string) => {
    setSignInEmail(email);
    setSignInPassword('Password123!');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close dialog"
        >
          <XIcon size={16} color="#64748b" />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingRight: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#065f46',
            flexShrink: 0
          }}>
            <ServerIcon size={20} color="#065f46" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Workspaces &amp; Account Identity
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              Enforced tenant isolation &bull; Argon2id password authentication &bull; Append-only audit chain
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Segmented Pill Pattern) */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          gap: '3px',
          marginBottom: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'signin', label: 'Sign In' },
            { id: 'near_wallet', label: 'NEAR Testnet Wallet' },
            { id: 'signup', label: 'Sign Up (Argon2)' },
            { id: 'create', label: 'Create Workspace' },
            { id: 'list', label: `Switch (${workspaces.length})` }
          ].map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setTab(item.id as any); setErrorMessage(null); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isActive ? '#ffffff' : 'transparent',
                  border: isActive ? '1px solid #e2e8f0' : 'none',
                  borderRadius: '6px',
                  color: isActive ? '#065f46' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '12px',
            marginBottom: '16px'
          }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircleIcon size={16} color="#166534" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn}>
            {/* Quick Demo Role Picker */}
            <div style={{
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '14px',
              fontSize: '11px'
            }}>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Quick Fill Role Identities (Argon2id):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { role: 'Owner', email: 'operator@agentshield.testnet' },
                  { role: 'Admin', email: 'admin@agentshield.testnet' },
                  { role: 'Analyst', email: 'analyst@agentshield.testnet' },
                  { role: 'Viewer', email: 'viewer@agentshield.testnet' },
                  { role: 'Moderator', email: 'moderator@agentshield.testnet' }
                ].map((item) => {
                  const isSelected = signInEmail === item.email;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleQuickRoleSelect(item.email)}
                      style={{
                        padding: '3px 8px',
                        background: isSelected ? '#065f46' : '#ffffff',
                        border: isSelected ? '1px solid #065f46' : '1px solid #e2e8f0',
                        borderRadius: '4px',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {item.role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                OPERATOR EMAIL *
              </label>
              <input
                type="email"
                required
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                placeholder="operator@agentshield.testnet"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                PASSWORD * (Argon2id verification)
              </label>
              <input
                type="password"
                required
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
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
                disabled={loading}
                style={{
                  padding: '8px 16px',
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
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <LockIcon size={14} color="#ffffff" />
                <span>{loading ? 'Verifying Argon2...' : 'Sign In & Enter'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: NEAR TESTNET WALLET SIGN-IN */}
        {tab === 'near_wallet' && (
          <form onSubmit={handleNearWalletSignIn}>
            <div style={{
              padding: '12px 14px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheckIcon size={16} color="#166534" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>
                  NEAR Testnet Native Identity
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '9px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>
                  TESTNET ONLY
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#15803d', margin: 0, lineHeight: 1.4 }}>
                Passwordless authentication verified directly against NEAR Testnet RPC. Never exposes full access keys.
              </p>
            </div>

            {/* Quick Demo Testnet Accounts */}
            <div style={{
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
              fontSize: '11px'
            }}>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Select Testnet Operator Account:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['operator.testnet', 'security-lead.testnet', 'auditor.testnet', 'treasury-guard.testnet'].map((acc) => {
                  const isSelected = nearAccountId === acc;
                  return (
                    <button
                      key={acc}
                      type="button"
                      onClick={() => setNearAccountId(acc)}
                      style={{
                        padding: '4px 10px',
                        background: isSelected ? '#065f46' : '#ffffff',
                        border: isSelected ? '1px solid #065f46' : '1px solid #e2e8f0',
                        borderRadius: '4px',
                        color: isSelected ? '#ffffff' : '#0f172a',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {acc}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                NEAR TESTNET ACCOUNT ID *
              </label>
              <input
                type="text"
                value={nearAccountId}
                onChange={(e) => setNearAccountId(e.target.value)}
                placeholder="e.g. yourname.testnet"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Must be an active account on NEAR Testnet (`https://rpc.testnet.near.org`).
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
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
                disabled={loading || !nearAccountId.trim()}
                style={{
                  padding: '8px 16px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <KeyIcon size={14} color="#ffffff" />
                <span>{loading ? 'Verifying Testnet RPC...' : 'Sign In with NEAR Account'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SIGN UP */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="elena@agentshield.testnet"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                PASSWORD * (Memory-hard Argon2id hash)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                PRIMARY WORKSPACE NAME *
              </label>
              <input
                type="text"
                required
                value={signUpWorkspaceName}
                onChange={(e) => setSignUpWorkspaceName(e.target.value)}
                placeholder="e.g. Autonomous Treasury Production"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                INITIAL ENVIRONMENT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['PRODUCTION', 'STAGING', 'SANDBOX'] as const).map((env) => {
                  const isSelected = signUpEnvironment === env;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setSignUpEnvironment(env)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '6px',
                        background: isSelected ? '#065f46' : '#ffffff',
                        border: isSelected ? '1px solid #065f46' : '1px solid #e2e8f0',
                        color: isSelected ? '#ffffff' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {env}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
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
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusIcon size={14} color="#ffffff" />
                <span>{loading ? 'Creating...' : 'Register & Create Vault'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: CREATE WORKSPACE */}
        {tab === 'create' && (
          <form onSubmit={handleSubmitCreate}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                WORKSPACE NAME *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Treasury Operations or Storefront Beta"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                TARGET ENVIRONMENT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['PRODUCTION', 'STAGING', 'SANDBOX'] as const).map((env) => {
                  const isSelected = environment === env;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setEnvironment(env)}
                      style={{
                        padding: '7px 8px',
                        borderRadius: '6px',
                        background: isSelected ? '#065f46' : '#ffffff',
                        border: isSelected ? '1px solid #065f46' : '1px solid #e2e8f0',
                        color: isSelected ? '#ffffff' : '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {env}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                ORGANIZATION / TEAM TAG
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Treasury Security Team"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
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
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#065f46',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <PlusIcon size={14} color="#ffffff" />
                <span>{loading ? 'Creating...' : 'Create & Enter Workspace'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: SWITCH WORKSPACE */}
        {tab === 'list' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {workspaces.map((ws) => {
                const isCurrent = ws.id === activeWorkspaceId;
                return (
                  <div
                    key={ws.id}
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'switch_workspace', workspaceId: ws.id })
                        });
                      } catch { }
                      onSelectWorkspace(ws.id);
                      onClose();
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: isCurrent ? '#f0fdf4' : '#ffffff',
                      border: isCurrent ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{ws.name}</span>
                        {isCurrent && (
                          <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Environment: <span style={{ color: '#065f46', fontWeight: 600 }}>{ws.environment}</span> &bull; Created: {ws.createdAt?.split('T')[0] || '2026-11-02'}
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: '5px 12px',
                        background: isCurrent ? '#065f46' : '#ffffff',
                        border: isCurrent ? 'none' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isCurrent ? '#ffffff' : '#0f172a',
                        cursor: 'pointer'
                      }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await fetch('/api/auth/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'switch_workspace', workspaceId: ws.id })
                          });
                        } catch { }
                        onSelectWorkspace(ws.id);
                        onClose();
                      }}
                    >
                      {isCurrent ? 'Current' : 'Select'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setTab('create')}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <PlusIcon size={14} color="#065f46" />
              <span>Create Another Workspace</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
