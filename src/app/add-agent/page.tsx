'use client';

import React from 'react';
import { AddAgentCardsOverview } from '@/components/AddAgentCardsOverview';
import { Navigation } from '@/components/Navigation';
import { Header } from '@/components/Header';
import { useRouter } from 'next/navigation';

export default function AddAgentPage() {
  const router = useRouter();

  return (
    <div className="app-layout redesign-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Navigation
        currentView="add-agent"
        onSelectView={(v) => {
          if (v === 'overview') router.push('/overview');
          else if (v === 'agents') router.push('/agents');
          else if (v === 'incidents' || v === 'alerts') router.push('/alerts');
          else if (v === 'approvals') router.push('/approvals');
          else if (v === 'policies') router.push('/policies');
          else if (v === 'intel' || v === 'threat-intel') router.push('/threat-intel');
          else if (v === 'settings') router.push('/settings');
          else router.push(`/${v}`);
        }}
        pendingApprovalsCount={2}
        alertCount={3}
      />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', minHeight: '100vh', minWidth: 0 }}>
        <Header
          currentView="add-agent"
          currentViewTitle="Add Agent"
          alertCount={3}
          onNavigateToIncidents={() => router.push('/alerts')}
          onAddAgent={() => {}}
        />

        <main className="content-body redesign-content-padding" style={{ background: '#f8fafc', padding: '24px 32px', flex: 1, minWidth: 0 }}>
          <AddAgentCardsOverview
            onNavigateBack={() => router.push('/agents')}
          />
        </main>
      </div>
    </div>
  );
}

