'use client';

import React, { useState } from 'react';
import {
  ShieldIcon,
  CheckCircleIcon,
  AlertTriangleIcon
} from './icons';

interface LandingPageProps {
  onEnterConsole?: () => void;
  onCreateWorkspace?: () => void;
  onStartOnboarding?: () => void;
  onAddAgent?: () => void;
}

export function LandingPage({
  onEnterConsole,
  onCreateWorkspace,
  onStartOnboarding,
  onAddAgent
}: LandingPageProps) {
  // Accordion state for FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleLaunch = () => {
    if (onEnterConsole) {
      onEnterConsole();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/overview';
    }
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#0f172a', fontFamily: 'inherit' }}>
      {/* ====================================================================
          1. TOP NAVIGATION BAR
          ==================================================================== */}
      <nav
        style={{
          height: '64px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            height: '100%',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleLaunch}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}
            >
              <ShieldIcon size={16} color="#ffffff" strokeWidth={2.2} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
              AGENT SHIELD
            </span>
          </div>

          {/* Center Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <button
              type="button"
              onClick={() => handleScrollTo('threats')}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: '#64748b', cursor: 'pointer', padding: 0 }}
            >
              Threats
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('why-it-stands-out')}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: '#64748b', cursor: 'pointer', padding: 0 }}
            >
              Why it stands out
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('how-it-works')}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: '#64748b', cursor: 'pointer', padding: 0 }}
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('faq')}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 500, color: '#64748b', cursor: 'pointer', padding: 0 }}
            >
              FAQ
            </button>
          </div>

          {/* Right Action */}
          <div>
            <button
              type="button"
              onClick={handleLaunch}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              Launch Agent Shield
            </button>
          </div>
        </div>
      </nav>

      {/* ====================================================================
          2. HERO SECTION
          ==================================================================== */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '60px 24px 50px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '48px',
            alignItems: 'center'
          }}
        >
          {/* Left Column: Headline & Pitch */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '16px'
              }}
            >
              SAFETY GUARD FOR AI AGENTS &middot; BUILT ON NEAR
            </div>

            <h1
              style={{
                fontSize: '44px',
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: '0 0 20px 0'
              }}
            >
              Stop your AI agent
              <br />
              before it sends the
              <br />
              money.
            </h1>

            <p
              style={{
                fontSize: '15px',
                color: '#334155',
                lineHeight: 1.6,
                margin: '0 0 28px 0',
                maxWidth: '480px'
              }}
            >
              AI agents now pay, refund and move funds on their own. One hidden trick in a message can send money to a scammer. Agent Shield checks each action first, stops the risky ones, and tells you why.
            </p>

            {/* Hero CTA Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleLaunch}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Launch Agent Shield
              </button>

              <button
                type="button"
                onClick={() => handleScrollTo('how-it-works')}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 22px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                See how it works
              </button>
            </div>

            {/* Demo Notice Subtext */}
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Testnet demo, no real damage, stored on testnet, no real funds.
            </div>
          </div>

          {/* Right Column: Live Activity Terminal Box */}
          <div>
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '22px',
                boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.25)',
                fontFamily: 'monospace'
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '10px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  LIVE ACTIVITY &middot; 4 treasury agents observed
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#f59e0b',
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}
                >
                  DEMO DATA
                </div>
              </div>

              {/* Monospace Stream Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', lineHeight: 1.5 }}>
                {/* 1. Allowed */}
                <div>
                  <span style={{ color: '#10b981', fontWeight: 700, marginRight: '8px' }}>ALLOWED</span>
                  <span style={{ color: '#e2e8f0' }}>refund_buyer 1.5 NEAR &rarr; customer-4872.testnet</span>
                </div>

                {/* 2. Paused */}
                <div>
                  <span style={{ color: '#f59e0b', fontWeight: 700, marginRight: '8px' }}>PAUSED</span>
                  <span style={{ color: '#e2e8f0' }}>transfer 28.5 NEAR &rarr; new-vendor.testnet (1st-wk payment)</span>
                </div>

                {/* 3. Blocked */}
                <div>
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 700, marginRight: '8px' }}>BLOCKED</span>
                    <span style={{ color: '#e2e8f0' }}>transfer 50.0 NEAR &rarr; attacker-drain.testnet</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', paddingLeft: '4px' }}>
                    Reason: destination on the blocked list. Trick instruction found in page read.
                  </div>
                </div>

                {/* 4. Watch Only */}
                <div>
                  <span style={{ color: '#eab308', fontWeight: 700, marginRight: '8px' }}>WATCH ONLY</span>
                  <span style={{ color: '#e2e8f0' }}>support-bot: data read alerted, cannot be stopped</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. TRUST & VALUE STRIP
          ==================================================================== */}
      <section
        style={{
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '18px 24px',
          marginBottom: '60px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
            Checks actions before they happen
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
            Prevents costly drains
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
            No private keys stored
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
            Never lose track of secret keys
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. SECTION: THREATS (What can go wrong with an AI agent)
          ==================================================================== */}
      <section id="threats" style={{ maxWidth: '1240px', margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#047857', marginBottom: '6px' }}>
            THREATS
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            What can go wrong with an AI agent
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            These are the common ways agents get tricked or misused, and what Agent Shield does about each.
          </p>
        </div>

        {/* Comparison Table */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '25%' }}>
                  THREAT
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '38%' }}>
                  WHAT IT LOOKS LIKE
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '37%' }}>
                  WHAT AGENT SHIELD DOES
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  threat: 'Hidden trick instructions',
                  sub: 'Prompt injection',
                  looksLike: 'A web page or message contains hidden text telling the agent to ignore its rules.',
                  does: 'Flags the trick and stops the action if the agent is connected for protection.'
                },
                {
                  threat: 'Paying the wrong account',
                  sub: 'Drain attack',
                  looksLike: "The agent is persuaded to send funds to an attacker's account.",
                  does: 'Checks the receiving account first and blocks known bad ones.'
                },
                {
                  threat: 'Spending too much',
                  sub: 'Exceeds budget',
                  looksLike: 'A refund or payment far above what is normal.',
                  does: 'Enforces your spending limits and holds big actions for your approval.'
                },
                {
                  threat: 'Leaking private data',
                  sub: 'Data exfiltration',
                  looksLike: 'The agent sends keys, email or customer data to an unknown address.',
                  does: 'Blocks unapproved destinations and hides private details in records.'
                },
                {
                  threat: 'Doing more than allowed',
                  sub: 'Excessive access',
                  looksLike: 'The agent calls tools or keys outside its job.',
                  does: 'Keeps it on limited-access keys so the damage stays small.'
                },
                {
                  threat: 'Going quiet',
                  sub: 'Silent offline',
                  looksLike: 'The agent stops reporting and nobody notices.',
                  does: 'Shows "No longer hearing from this agent" instead of a false all-clear.'
                }
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Threat Name & Subtitle */}
                  <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                      {row.threat}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {row.sub}
                    </div>
                  </td>

                  {/* What it looks like */}
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: '#334155', lineHeight: 1.5, verticalAlign: 'top' }}>
                    {row.looksLike}
                  </td>

                  {/* What Agent Shield does */}
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: '#334155', lineHeight: 1.5, verticalAlign: 'top' }}>
                    {row.does}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====================================================================
          5. SECTION: WHY IT STANDS OUT (Built to be honest, not just impressive)
          ==================================================================== */}
      <section id="why-it-stands-out" style={{ maxWidth: '1240px', margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#047857', marginBottom: '6px' }}>
            WHY IT STANDS OUT
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Built to be honest, not just impressive
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Many tools only send alerts after the damage. Agent Shield is designed to act first, and to tell you the truth about its limits.
          </p>
        </div>

        {/* 6 Numbered Capability Rows */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          {[
            {
              num: '01',
              title: 'Stops actions, not just reports them',
              desc: 'Agents connected through the SDK or proxy are checked before an action runs. A blocked action never goes out.'
            },
            {
              num: '02',
              title: 'Honest about what it cannot stop',
              desc: 'If an agent is "Watch only", the app says so. It never shows "Protected" unless the action was really prevented.'
            },
            {
              num: '03',
              title: 'Low-limit-access keys on NEAR',
              desc: 'Payment agents sign with a key limited to one contract, so a tricked agent cannot touch the rest of the account.'
            },
            {
              num: '04',
              title: 'Extra approval by a person',
              desc: 'Sensitive actions wait for a human to approve them with a full-access key, which an agent does not hold.'
            },
            {
              num: '05',
              title: 'History nobody can quietly edit',
              desc: 'Every entry links to the one before it, and a fingerprint is stored on a NEAR testnet contract so changes can be detected.'
            },
            {
              num: '06',
              title: 'Community threat reports',
              desc: "People report new attacks privately; reviewed, cleaned reports are shared so everyone's agents get safer."
            }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '50px 1.2fr 2fr',
                padding: '20px 0',
                borderBottom: '1px solid #f1f5f9',
                alignItems: 'baseline',
                gap: '16px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>
                {item.num}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          6. SECTION: HOW IT WORKS (Protected in three steps)
          ==================================================================== */}
      <section id="how-it-works" style={{ background: '#f8fafc', padding: '60px 24px', marginBottom: '70px' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#047857', marginBottom: '6px' }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              Protected in three steps
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              No security team needed.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '28px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '12px' }}>
                STEP 1
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Connect your agent
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Add it in a few minutes. The app shows exactly what it can watch and what it can stop.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '28px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '12px' }}>
                STEP 2
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Set your rules
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Choose spending limits, approved accounts and which actions need your OK.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '28px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '12px' }}>
                STEP 3
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                Watch and approve
              </h3>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                Get alerts with plain-English titles, approve or deny held actions, and review the full history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. SECTION: FAQ (Common questions)
          ==================================================================== */}
      <section id="faq" style={{ maxWidth: '1240px', margin: '0 auto 70px', padding: '0 24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#047857', marginBottom: '6px' }}>
            FAQ
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Common questions
          </h2>
        </div>

        {/* Accordion List */}
        <div style={{ borderTop: '1px solid #e2e8f0' }}>
          {[
            {
              q: 'Does it work with any AI agent?',
              a: 'Yes. Any agent that makes HTTP requests, uses NEAR wallets, or runs on frameworks like LangChain, ElizaOS, or custom Python/TypeScript scripts can connect via the SDK, Gateway proxy, or observe-only logs.'
            },
            {
              q: 'Can it really block a payment?',
              a: 'Yes. When connected through the SDK or the Gateway Proxy, Agent Shield intercepts function call transactions before execution. If a policy is violated, the transaction is dropped immediately and never reaches the blockchain.'
            },
            {
              q: 'Is it safe to use with real money?',
              a: 'Currently Agent Shield runs on NEAR testnet for demonstrations and security hackathons. For mainnet deployments, the human approval gate (1 yoctoNEAR) and Function Call Keys ensure that autonomous agents can never access full-access wallet credentials.'
            },
            {
              q: 'What is a limited-access key?',
              a: 'On NEAR, a Function Call Key (FCK) only permits calling specific methods on a specific smart contract within a predefined gas allowance. It cannot transfer raw NEAR or delete accounts, severely containing blast radius if an agent is tricked.'
            },
            {
              q: 'What is shared when I report a threat?',
              a: 'Threat reports are scrubbed of all private keys, customer emails, IP addresses, and workspace names before publishing. Submissions remain private to your workspace unless you explicitly check the public community consent box.'
            },
            {
              q: 'Do I need to be technical?',
              a: 'No. Agent Shield uses human-readable alerts, clear guardrails ("Needs your OK" vs "Stop"), and automated 1-click recommendations so operators and treasury managers can protect funds without deep cryptography knowledge.'
            }
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: '100%',
                    padding: '18px 0',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0f172a'
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#64748b', transition: 'transform 0.15s ease', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                    &#9654;
                  </span>
                  <span>{item.q}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 0 16px 20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================================================
          8. BOTTOM CTA BANNER
          ==================================================================== */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 60px', padding: '0 24px' }}>
        <div
          style={{
            background: '#0f172a',
            borderRadius: '12px',
            padding: '36px 40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
              Put a guard between your agent and your funds.
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Open the app and connect a testnet agent in minutes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Launch Agent Shield
          </button>
        </div>
      </section>

      {/* ====================================================================
          9. FOOTER
          ==================================================================== */}
      <footer
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          padding: '24px 24px'
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11px',
            color: '#64748b'
          }}
        >
          <div>AGENT SHIELD &middot; PUBLIC SECURITY REPOSITORY &middot; ZERO TRUST PROTOCOL</div>
          <div>TESTNET DEMO, 100% COMMUNITY OWNED.</div>
        </div>
      </footer>
    </div>
  );
}
