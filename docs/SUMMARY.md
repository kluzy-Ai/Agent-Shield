# Agent Shield — System Executive & Technical Summary

> **Agent Shield** is an autonomous security guardrail and real-time threat prevention platform for AI agents operating on the NEAR Protocol. It combines workspace-scoped tenant isolation, scoped ingest credentials, policy-enforcing SDK middleware, and an append-only hash-chained audit log to safeguard on-chain treasury and autonomous workflows.

---

## 1. Executive Overview

As autonomous AI agents receive direct execution authority over blockchain wallets and smart contracts, they expose new attack surfaces: prompt injection overrides, unauthorized contract calls, and counterparty spoofing. 

**Agent Shield** introduces:
1. **In-Line Prevention**: The `@agentshield/sdk` intercepts and validates tool executions before transactions hit the network.
2. **Cryptographic Protection**: Enforces 1 yoctoNEAR human approval on critical calls.
3. **Honest Health Reporting**: An ingestion SLA engine that immediately switches agents from "Monitoring active" to `DEGRADED` / `LIMITED_VISIBILITY` if heartbeats stop for >60 seconds.
4. **show-once, hashed credentials**: Ingest tokens are shown strictly once to operators upon generation or rotation and stored exclusively as SHA-256 hashes.
5. **Tamper-Evident Audit Trails**: An append-only hash-chained cryptographic ledger (`entryHash = SHA-256(...)`) linking all actions back to genesis.

---

## 2. System Architecture & Component Inventory

```
+-----------------------------------------------------------------------------------+
|                                  AGENT SHIELD                                     |
|                                                                                   |
|  +--------------------------------+       +------------------------------------+  |
|  |     Next.js 16 (App Router)    |       |      Embedded SQLite Data Layer    |  |
|  |   - Dark Obsidian Design Sys   | <---> |   - node:sqlite Native Storage     |  |
|  |   - Live Activity Timeline     |       |   - Argon2id Password Hashing      |  |
|  |   - Multi-Tenant Isolation     |       |   - Append-Only Hash Chain         |  |
|  |   - Role-Based Access Control  |       |   - Hashed Credentials Store       |  |
|  +--------------------------------+       +------------------------------------+  |
|                  ^                                           ^                    |
|                  | (REST / Auth Session)                     | (DB Access Layer)  |
|                  v                                           v                    |
|  +--------------------------------+       +------------------------------------+  |
|  |       Ingestion & API Layer    |       |     Tenant Access Layer (RBAC)     |  |
|  |   - /api/ingest/telemetry      |       |   - Strict Workspace Isolation     |  |
|  |   - /api/ingest/heartbeat      |       |   - 4 Roles: owner, admin, analyst |  |
|  |   - Rate Limiter (120 req/min) |       |     viewer                         |  |
|  |   - Idempotency Deduplication  |       |   - Dynamic Health State Engine    |  |
|  +--------------------------------+       +------------------------------------+  |
|                  ^                                                                |
|                  | (bearer-token authenticated telemetry & Heartbeat)             |
|                  +----------------------------+                                   |
|                                               |                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                       @agentshield/sdk (TypeScript)                         |  |
|  |   - wrapToolCall Middleware: Intercepts & inspects tool arguments           |  |
|  |   - Spending Ceiling Validation: Enforces max NEAR per transaction          |  |
|  |   - Blocklist & Destination Verification: Intercepts malicious targets      |  |
|  |   - Automatic Payload Redaction: Scrubs ed25519 keys, emails & PII          |  |
|  +-----------------------------------------------------------------------------+  |
|                  ^                            ^                       ^           |
|                  |                            |                       |           |
|  +-----------------------+    +-----------------------+   +--------------------+  |
|  | Mock Agent 1: Refund  |    | Mock Agent 2: Oracle  |   | Mock Agent 3: Pay  |  |
|  | refund-bot.testnet    |    | crawler-01.testnet       |   | treasury-v1.testnet   |  |
|  | Max 2.0 NEAR refund   |    | Spot price feed       |   | Max 5.0 NEAR tx    |  |
|  | Injects drain exploit |    | Emits live heartbeats |   | YoctoNEAR gated    |  |
|  +-----------------------+    +-----------------------+   +--------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Delivery Stages Progress

| Stage | Milestone | Status | Core Deliverables |
| :--- | :--- | :--- | :--- |
| **Stage 0** | Foundation & Architecture | **COMPLETED** | PRD conversion, Design Contract, architectural commitments, licenses, `.env.example`, machine-readable README. |
| **Stage 1** | Architecture & Specifications | **COMPLETED** | Monorepo layout, Next.js App Router setup, embedded SQLite schema design, `@agentshield/sdk` middleware specification, and `/docs/VERIFIED_FACTS.md`. |
| **Stage 2** | Core Screens & Mock Data | **COMPLETED** | Landing page, onboarding flow, 7-part dashboard, agent inventory, 5-step wizard, 6-tab agent detail drawer. |
| **Stage 3** | Security Screens | **COMPLETED** | Threat alerts list, 7-step forensic incident sequence modal, policy manager with dry-run toggle, 1 yoctoNEAR approval queue, audit chain viewer. |
| **Stage 4** | Threat Intel & Settings | **COMPLETED** | Private threat report submission with consent choice gate, moderation console, public threat repository with "This helped" counter, threat trends & Sigma/YARA sharing, incident playbooks, settings. |
| **Stage 5** | Real Data Layer & Isolation | **COMPLETED** | SQLite persistence (`node:sqlite`), RFC 9106 Argon2id password hashing, central tenant isolation access layer, 5 RBAC roles, append-only SHA-256 hash-chained audit log, zero cross-tenant leak proof. |
| **Stage 6** | Real Agent Registration & Ingestion | **COMPLETED** | Full agent CRUD, scoped credentials shown once & stored hashed (SHA-256), `@agentshield/sdk` package, schema-validated/rate-limited ingestion API, honest status transitions (>60s SLA), 3 runnable mock agent scripts, `/docs/INTEGRATIONS.md`. |
| **Stage 7** | Policy Engine, Dual Control Points & Approvals | **COMPLETED** | Modular policy engine (`src/lib/policy-engine`), dual control points (SDK pre-call hook & safe-failure forward proxy), real action-holding approvals queue with 1 yoctoNEAR signing, honest observe-only downgrading, dry-run mode, `/docs/GATEWAY.md`. |
| **Stage 8** | Detection Engine & Baseline Assessment | **COMPLETED** | 9-rule threat detection engine with explicit evidence retention, NEAR AI Cloud LLM classifier with hardware TEE attestation + deterministic fallback, baseline assessment engine with 5 safe non-mutating probes, calibrated 0–100 risk score, `VERIFIED`/`INFERRED`/`UNTESTED` finding labels, and blind spots report. |
| **Stage 9** | Alerts, Incidents, Redaction & Worker | **COMPLETED** | Persisted incident dossiers with discrete 7-step sequence reconstruction, minimum-evidence storage, multi-pass redaction pipeline (tested with planted fake secrets), containment operations (pause agent, revoke credentials, mark false positive), sanitized JSON/PDF exports, autonomous background worker daemon with heartbeat SLAs (>60s DEGRADED, >120s DISCONNECTED), multi-channel notification router (Email, HMAC Webhook, Telegram, Slack), and Daily Morning Incident Summary. |
| **Stage 10** | Threat Intelligence, Moderation & Public Repo | **COMPLETED** | Private-by-default report submission, consent flow, automated hygiene (redaction of planted secrets, attachment scan, duplicate detection), platform-gated moderation (`is_platform_moderator: 1`), rate limits & abuse controls (5 per 10 min), searchable public repository (`/api/threat-intel/public`), mitigation feedback loop ("This helped" with deduplicated upvotes), trend analytics, shared detection rules (DSL, Sigma, YARA), and Incident-to-Report flow converting sanitized incident dossiers into draft threat reports. |
| **Stage 11** | NEAR Integration & On-Chain Anchoring | **COMPLETED** | Multi-signal counterparty check service (ALLOW/WARN/BLOCK from on-chain RPC state, contract vs EOA, and threat blocklist), scoped Function-Call Access Key (FCK) payment agent with 1 yoctoNEAR approval gate and protocol caveats in README, Rust smart contract (`contracts/shield_security/src/lib.rs`), live testnet audit-log hash root anchor & consensus verification, NEAR AI Cloud TEE hardware attestation card with honest fallback disclosure, and passwordless NEAR testnet wallet sign-in. |
| **Stage 12** | Simulation Suite & PRD Acceptance Verification | **COMPLETED** | 7 standalone simulation scripts (`scripts/simulations/`) covering refund abuse, webpage prompt injection, gateway data exfil, overnight autonomous activity + morning summary, research contribution pipeline, Track 06 payment drain stoppage, and observe-only honest disclosure ("observed, not blocked"). Developer experience tooling (`npm run seed`, `npm run demo`). 10 automated E2E tests covering 100% of PRD Section 18 acceptance criteria. |
| **Stage 13** | Final Hardening, Benchmarking & Submission | **COMPLETED** | Route authorization audit across all 40 API routes, automated zero-leak secrets scan, zero-vulnerability dependency audit (`npm audit`), empirical event-to-alert latency benchmark (**9.89ms** total, **61µs** SDK hook overhead), machine-readable `README.md` with Rule Q-005 disclosures and honest mocked vs. real table, 90-second video demo script (`docs/DEMO_SCRIPT.md`), draft X post, and draft submission payload (`docs/SUBMISSION_DRAFT.md`) with local placeholders only. 100/100 tests passing across 43 suites. |
| **Stage 14** | Final Truth & Safety Pass | **COMPLETED** | Platform-level moderation permission (`is_platform_moderator`) refusing workspace owner and admin roles; Proof Pack (`/docs/PROOF.md`) classifying REAL vs. SIMULATED vs. PENDING; wording standardizations; rename all demo accounts to `.testnet`; strip local paths from docs; `/docs/DEPLOY.md` Vercel readiness analysis; 7-item flat nav cleanup with preserved tooltips; 101/101 automated tests passing. |
| **Stage 15** | Open Community Threat Repository & Automated Safeguards | **COMPLETED** | Replaced moderator-based review flow with open community publishing and automated safeguards: public unauthenticated read (`/api/threat-intel/public`), instant publishing with "Community report, not verified" badge when public consent is checked, automated secret redaction, bot rate limits (60 req/min with `X-RateLimit-*`), max submission rates (5 per 10 min, daily cap), plain-text links, field length limits, duplicate detection, 3-flag community auto-hide, platform-owner takedown/confirmation gated by server-side `is_platform_moderator: 1`, and separation rule ensuring unverified reports never feed blocklists; 103/103 tests passing. |

---

## 4. Functional Requirements (FR-01 to FR-15) Implementation Matrix

| ID | Requirement | Status | Verification & Technical Details |
| :--- | :--- | :--- | :--- |
| **FR-01** | Accounts & Workspaces | **REAL** | SQLite-persisted accounts with Argon2id hashing, workspaces, sessions, and memberships across 4 roles (`owner`, `admin`, `analyst`, `viewer`) plus platform-level `is_platform_moderator` gate. |
| **FR-02** | Add, Edit, Pause, Disconnect Agents | **REAL** | Full agent lifecycle endpoints (`/api/agents`, `/api/agents/[id]`) with active enforcement states (`ENFORCING`, `APPROVAL_REQUIRED`, `OBSERVE_ONLY`, `LIMITED_VISIBILITY`). |
| **FR-03** | Record Integration & Scope | **REAL** | Scoped credentials shown once; raw key never stored plaintext. On-chain account mappings (`treasury-v1.testnet`, `refund-bot.testnet`), target contracts, and Function Call Key budgets. |
| **FR-04** | Baseline Security Assessment | **REAL** | 6-part inventory (capabilities, tools, permissions, endpoints, data access, policies), 5 safe non-mutating verification probes (`isSafeNoMutation: true`), calibrated 0–100 risk score, findings labeled strictly as `VERIFIED`, `INFERRED`, or `UNTESTED`, and coverage report with explicit blind spots. |
| **FR-05** | Telemetry Ingestion & Timeline | **REAL** | Real ingestion endpoints (`/api/ingest/telemetry`, `/api/ingest/heartbeat`) with rate limits (120/min), Bearer token validation, idempotency deduplication (`eventId`), and live query `/api/telemetry`. |
| **FR-06** | Detection Engine & Rule Evaluation | **REAL** | 9-rule threat detection engine evaluating unexpected tools, suspicious destinations, permission violations, privilege escalation, unusual data access, repeated failures, config changes, inconsistent high-impact actions, and indirect prompt injection in tool outputs with structured `whyFlagged` and `supportingEvidence`. Confidential LLM classification via NEAR AI Cloud in hardware enclaves (Intel TDX / NVIDIA CC) with remote hardware attestation, and deterministic fallback. |
| **FR-07** | Policy Configuration | **REAL** | Configurable policies for Allowed Tools, Approved Destinations allowlists/blocklists, Sensitive Data scanning (PII, ed25519/secp256k1 keys, prompt injection), Max Spend Limits, and 1 YoctoNEAR cryptographic approval requirements with dry-run mode toggles. |
| **FR-08** | Policy Outcomes (Log, Alert, Require Approval, Pause, Block) | **REAL** | Enforced at two real control points: (1) SDK pre-call hook wrapping tool execution and holding execution until human approval is granted/denied/expired; (2) HTTP forward proxy with safe-failure fail-closed mode (502 Bad Gateway, zero silent bypass). Real agent capability dynamically downgrades observe-only agents to `ALERT`. |
| **FR-09** | Alerts & Incident Records | **REAL** | Complete SQLite persistence in `alerts` and `incidents` tables with status transitions (`OPEN`, `INVESTIGATING`, `CONTAINED`, `FALSE_POSITIVE`, `RESOLVED`), bulk acknowledge, false-positive workflows, and automatic audit-chain logging. |
| **FR-10** | Incident Inspection & Notes | **REAL** | Discrete 7-step sequence reconstruction (Trigger &rarr; Agent Response &rarr; Tool Calls &rarr; Attempted Action &rarr; Policy Decision &rarr; Outcome &rarr; Threat Indicators), minimum-evidence storage with SHA-256 fingerprinting, immutable operator notes timeline, one-click agent pause and credential revocation, and sanitized JSON/PDF export. |
| **FR-11** | Secret & PII Redaction | **REAL** | Deterministic multi-pass scrubbing (`src/lib/redaction`) executed before database storage, export, and sharing. Scrubs: NEAR ed25519 keys, EVM secp256k1 64-hex keys, 12/24-word BIP-39 seed phrases, Bearer/ash_live_/NEAR_AI_/sk- API tokens, customer emails, E.164 phone numbers, and Luhn-validated credit card numbers. |
| **FR-12** | Threat Report Submission | **REAL** | Open community threat report submission with private workspace default, instant publishing when public consent is checked ("Community report, not verified"), plain text fields, automated secret redaction, bot and account rate limits, and Incident-to-Report pre-fill. |
| **FR-13** | Threat Intelligence Moderation | **REPLACED** | Replaced by automatic safeguards and platform-owner takedown: unauthenticated public read (/api/threat-intel/public) with bot rate limits, instant publishing upon consent, secret redaction, plain text links, duplicate detection, 3-flag community auto-hide, and platform-owner takedown/confirmation gated by server-side `is_platform_moderator` flag. Unverified community reports never feed blocklists or SDK policies. |
| **FR-14** | Hash-Chained Audit Log | **REAL** | Append-only ledger linked via `entryHash = SHA-256(...)` from genesis; cryptographic verification detects any SQL tampering. |
| **FR-15** | Coverage & Health Transparency | **REAL** | Dynamic honest status engine: never shows "Monitoring active" if telemetry or heartbeats stopped (>60s SLA). Switches to `DEGRADED` / `LIMITED_VISIBILITY`. |

---

## 5. Security & Cryptographic Model

1. **Authentication & Password Hashing**:
   * Algorithm: **Argon2id** (RFC 9106 compliant).
   * Parameters: Memory Cost: 64 MB (`m=65536`), Time Cost: 3 iterations (`t=3`), Parallelism: 4 threads (`p=4`).
2. **Ingest Token Security**:
   * High-entropy tokens formatted as `ash_live_<random_bytes>`.
   * Stored in SQLite as `token_hash = SHA256(rawToken)`.
   * Displayed **strictly once** to the operator at creation or rotation.
   * UI displays only the non-sensitive preview: `token_prefix = ash_live_abcd...1234`.
3. **Multi-Tenant Isolation**:
   * All queries pass through `TenantAccessLayer`.
   * Strict workspace boundary: every query filters `WHERE workspace_id = ?`.
   * Attempted cross-tenant access immediately throws `TenantIsolationViolationError`.
4. **Append-Only Cryptographic Audit Log**:
   * Chained hash: `entryHash = SHA-256(seq || timestamp || workspaceId || actor || actionType || prevHash || summary)`.
   * First entry anchors to `GENESIS_HASH` (64 zeros).
   * Continuous verification algorithm detects any bit-level modification or re-ordering.
5. **1 yoctoNEAR human approval**:
   * Critical transactions or high-risk actions require a 1 yoctoNEAR (`1e-24 NEAR`) contract deposit check (`assert_one_yocto()`) which protocol rules prohibit Function-Call Keys from signing because FCKs cannot attach deposits, requiring human operator authorization.

---

## 6. Runnable Mock Agents Inventory

All three agents are runnable standalone scripts located in `scripts/mock-agents/` utilizing `@agentshield/sdk`:

| Script | Command | Identity | Target Contract | Guardrails Tested |
| :--- | :--- | :--- | :--- | :--- |
| **Refund Support Agent** | `npm run agent:refund` | `refund-bot.testnet` | `storefront-v2.testnet` | - Enforces 2.0 NEAR maximum refund cap<br>- Intercepts prompt injection drain to `attacker-drain.testnet`<br>- Emits heartbeat and telemetry |
| **Web Research Agent** | `npm run agent:research` | `crawler-01.testnet` | `data-oracle.testnet` | - Harvester cycle committing verified spot rates<br>- Demonstrates honest health degradation when stopped<br>- Emits heartbeats |
| **NEAR Payment Agent** | `npm run agent:payment` | `treasury-v1.testnet` | `payment-vault.testnet` | - Enforces 5.0 NEAR single-tx ceiling<br>- Intercepts unauthorized 50.0 NEAR emergency drain<br>- Appends security event to audit chain |

Run all mock agents sequentially:
```bash
npm run agents:run-all
```

---

## 7. Verification & Automated Test Suites

All **100 unit, integration, security, and acceptance tests** pass cleanly across **43 suites with 0 failures**:

```
> agent-shield@0.1.0 test
> node --test --test-concurrency=1 tests/**/*.test.ts

▶ PRD Section 18: End-to-End Acceptance Criteria Verification
  ✔ Criterion 18.1: A new user can create a workspace and connect an agent using documented method
  ✔ Criterion 18.2: The product clearly displays what it can and cannot observe or control for that agent
  ✔ Criterion 18.3: A test event appears in the activity timeline with correct agent identity and timestamp
  ✔ Criterion 18.4: A configured policy violation creates an alert and incident record
  ✔ Criterion 18.5: Where the integration supports enforcement, a high-risk action is paused or blocked before execution
  ✔ Criterion 18.6: Where enforcement is unavailable, the UI clearly says the event is only observed and alerted
  ✔ Criterion 18.7: The user receives an alert while not actively viewing the dashboard
  ✔ Criterion 18.8: The incident page explains what happened, why flagged, action taken, and remediation
  ✔ Criterion 18.9: A report can be submitted privately; public sharing is not automatic
  ✔ Criterion 18.10: Secrets and personal data are not exposed in logs, exports, or public threat records

▶ STAGE 11: NEAR Protocol Integration Suite
  ▶ 1. Counterparty Check Service (Item 1)
    ✔ returns ALLOW for declared target contract / verified counterparties
    ✔ returns WARN for unverified / first-interaction counterparties
    ✔ returns BLOCK for known malicious addresses on threat blocklist
  ▶ 2. SDK Enforcement Gate & 1 YoctoNEAR Approval Routing (Item 1 & 2)
    ✔ refuses to sign on BLOCK and throws PolicyBlockedError
    ✔ routes WARN to human approvals queue and resumes on 1-yoctoNEAR approval
  ▶ 3. On-Chain Audit-Log Anchoring & Threat Registry (Item 3)
    ✔ anchors workspace audit root to NEAR Testnet with valid sequence and tx hash
    ✔ cryptographically verifies on-chain anchor against testnet consensus
    ✔ registers sanitized published threat intelligence on-chain
  ▶ 4. NEAR AI Cloud Classifier & TEE Attestation (Item 4)
    ✔ runs deterministic fallback when NEAR_AI_API_KEY is missing with honest disclosure
    ✔ correctly classifies benign operations as BENIGN
  ▶ 5. NEAR Testnet Wallet Passwordless Sign-In (Item 5)
    ✔ authenticates valid NEAR testnet account and issues secure session
    ✔ rejects invalid account IDs that do not conform to NEAR account format

▶ Scope Change: Open Community Threat Repository & Automated Safeguards
  ▶ 1. Public Read & Bot Rate Limiting
    ✔ public threat intelligence is readable without authentication
    ✔ bot rate limiter returns 429 and Retry-After header after 60 requests per minute
  ▶ 2. Submit & Instant Publishing vs Private Workspace
    ✔ unchecked public consent = private to workspace only, never in public feed
    ✔ checked public consent = published immediately, labeled "Community report, not verified"
  ▶ 3. Automated Safeguards (Redaction, HTML, Field Caps, Attachments)
    ✔ redaction pipeline scrubs planted secrets before storage and in public text
    ✔ strips HTML from all report fields to prevent injection
    ✔ enforces maximum field lengths
    ✔ strictly prohibits file attachments
  ▶ 4. Rate Limits & Duplicate Detection
    ✔ enforces 5 submissions per 10 minutes and daily cap
    ✔ rejects exact and near duplicates with DuplicateReportError
  ▶ 5. Community Flagging & Auto-Hide After 3 Flags
    ✔ signed-in readers can flag a report; after 3 distinct accounts it auto-hides
  ▶ 6. Platform Owner Takedown & Confirmed Badge
    ✔ customer workspace roles (owner/admin/analyst) are refused takedown & confirm actions
    ✔ platform owner can execute takedown, logging reason in audit chain
    ✔ platform owner can mark report as Confirmed
  ▶ 7. Separation Rule: Unverified Reports Never Feed Blocklists
    ✔ unverified community report cannot change counterparty blocking decisions
    ✔ unverified community report cannot be registered on-chain
  ▶ 8. Mitigation Feedback & Incident Conversion
    ✔ "This helped" increments count and prevents duplicate votes per user
    ✔ converts incident dossier into pre-filled threat report draft

▶ Stage 9: Alerts, Incidents, Forensics, Redaction & Background Worker
  ▶ 1. Redaction Pipeline (FR-11) with Planted Fake Secrets
    ✔ validates card-like numbers using the Luhn algorithm
    ✔ scrubs planted NEAR ed25519 private keys
    ✔ scrubs planted EVM secp256k1 64-hex private keys
    ✔ scrubs planted 12-word and 24-word BIP-39 mnemonic seed phrases
    ✔ scrubs customer email addresses and phone numbers
    ✔ scrubs planted credit card numbers with valid Luhn checks
    ✔ scrubs API tokens (Bearer, ash_live_, NEAR_AI_, sk-)
    ✔ deeply redacts nested JSON objects and arrays
  ▶ 2. Forensic Timeline Builder with Minimum-Evidence Storage
    ✔ constructs discrete 7-step sequence reconstruction adhering to ADR-006
    ✔ creates minimum-evidence storage record without unbounded raw payload retention
  ▶ 3. Incident Records, Notes, Containment & False Positive Workflows
    ✔ creates and retrieves incident dossier with tenant isolation
    ✔ adds operator notes to incident and updates status
    ✔ pauses agent execution directly from incident containment flow
    ✔ revokes agent credentials and disconnects agent from incident flow
    ✔ marks incident as false positive with operator justification
  ▶ 4. Sanitized Incident Export (JSON and PDF)
    ✔ generates sanitized JSON export with cryptographic integrity digest
    ✔ generates valid binary PDF-1.4 export with standard structure
  ▶ 5. Background Worker: Heartbeat Monitoring & Notifications
    ✔ detects stale heartbeats (>60s) and transitions agent to DEGRADED
    ✔ detects lost heartbeats (>120s), marks agent DISCONNECTED and raises automated alert
    ✔ dispatches alerts across configured multi-channel router (Email, Webhook, Telegram, Slack)
    ✔ generates 24-hour Morning Incident Summary aggregating threats, drains, and fleet health

▶ Stage 8: Detection Rules Engine & Baseline Security Assessment (FR-04, FR-06)
  ▶ 1. Detection Rules Engine (FR-06)
    ✔ Rule 1: detects unexpected tool use not declared in agent manifest
    ✔ Rule 2: detects suspicious counterparty destinations and unverified drain hosts
    ✔ Rule 3: detects permission violations exceeding Function Call Key scopes
    ✔ Rule 4: detects privilege escalation attempts altering keys or deploying code
    ✔ Rule 5: detects unusual data access and bulk exfiltration attempts
    ✔ Rule 6: detects repeated failures within a sliding 5-minute time window
    ✔ Rule 7: detects unauthorized config change attempts by agents
    ✔ Rule 8: detects high-impact actions inconsistent with declared agent purpose
    ✔ Rule 9: detects prompt-injection indicators in tool output stream
  ▶ 2. NEAR AI Cloud LLM Classifier & Deterministic Fallback
    ✔ uses deterministic fallback when NEAR_AI_API_KEY is not configured
    ✔ deterministic classifier correctly identifies benign routine operations
  ▶ 3. Baseline Security Assessment (FR-04)
    ✔ inventories capabilities, tools, permissions, endpoints, data access and policies
    ✔ executes safe non-mutating verification tests without modifying state
    ✔ labels each finding strictly as VERIFIED, INFERRED, or UNTESTED with severity and fixes
    ✔ computes calibrated risk score (0-100) and produces coverage report with blind spots
  ▶ 4. Alerts Persistence & False Positive Workflows
    ✔ persists alerts in SQLite database and enforces workspace tenant isolation
    ✔ supports bulk acknowledgment and false positive workflows with audit logging

▶ Stage 7: Policy Engine, Real Control Points & Approvals Queue (FR-07, FR-08)
  ▶ 1. Approvals Queue & Real Action Holding
    ✔ refund over limit is held for approval, and resumes when approved
    ✔ refund over limit throws ApprovalDeniedError when operator denies the action
  ▶ 2. Gateway Forward Proxy & Safe-Failure Mode
    ✔ transfer to an unapproved destination is blocked at the gateway with HTTP 403
    ✔ enforces safe-failure mode: fails closed with 502 Bad Gateway upon inspection error
    ✔ allows forwarding when destination is approved
  ▶ 3. Observe-Only Real Capability Constraint (FR-15 & PRD Section 21)
    ✔ an observe-only agent is only alerted when triggering a block rule and execution is not halted
    ✔ SDK wrapToolCall does not throw PolicyBlockedError for observe-only agent and emits FLAGGED/ALERT
    ✔ verifies TenantAccessLayer returns isEnforceable: false with clear warning for observe-only policies
  ▶ 4. Dry-Run Mode Simulation
    ✔ permits execution in dry-run mode while logging the would-be action

▶ Stage 6: Real Agent Registration, Ingest Credentials, Heartbeats & Telemetry
  ▶ 1. Agent Registration & Lifecycle Flows (FR-02, FR-03)
    ✔ creates an agent with scoped credentials shown once and stored hashed
  ▶ 2. Ingestion Security & Validation (Schema, Token Auth, Idempotency, Rate Limiting)
    ✔ authenticates valid tokens and rejects revoked tokens
    ✔ enforces idempotency and deduplicates telemetry events by eventId
    ✔ enforces rate limiting per credential bucket
  ▶ 3. Heartbeat & Integration Health (Honest Status Transitions FR-15)
    ✔ never shows "Monitoring active" if telemetry or heartbeats stopped
  ▶ 4. @agentshield/sdk Client Execution & Policy Interception
    ✔ intercepts and blocks exploit attempts targeting blocklisted destinations
    ✔ enforces single-transaction NEAR spend ceiling

▶ Tenant Isolation, RBAC & Hash-Chained Audit Log (Stage 5)
  ▶ 1. Argon2id Password Hashing & Session Authentication
    ✔ hashes passwords using Argon2id with memory-hard parameters per RFC 9106
    ✔ successfully signs up user, creates workspace, and establishes authenticated session
  ▶ 2. Multi-Tenant Isolation & Cross-Tenant Read Blocking
    ✔ proves that cross-tenant reads fail via the central access layer
  ▶ 3. Role-Based Access Control (RBAC): owner, admin, analyst, viewer
    ✔ enforces fine-grained role constraints across mutations and queries
  ▶ 4. Append-Only Hash-Chained Audit Log (FR-01, FR-14)
    ✔ verifies valid cryptographic chain from genesis to head
    ✔ detects cryptographic tampering and breaks verification if an attacker mutates data in place

▶ Agent Shield Security Policies & In-Line Enforcement
  ✔ enforces the 1 YoctoNEAR consensus rule on critical calls
  ✔ blocks known exploit receivers via gateway check
  ✔ allows benign routine actions within policy limits

ℹ tests 103
ℹ suites 43
ℹ pass 103
ℹ fail 0
```

* **Type Safety**: `npm run typecheck` (`tsc --noEmit`) passes with **0 errors**.
* **End-to-End Simulation Demo**: `npm run demo` executes all 7 scenarios with 100% pass rate.
* **PRD Acceptance Criteria**: `node --test tests/acceptance-criteria-e2e.test.ts` passes 10/10 criteria (18.1 through 18.10).
* **Dependency Audit**: `npm audit` reports **0 vulnerabilities**.
* **Secrets Scan**: Automated scan across all files confirms **0 secrets leaked**.

---

## 8. Quick-Start Guide ("Do X, See Y")

1. **One-Command Master Demo (`scripts/simulations/run-all-scenarios.ts`)**:
   ```bash
   npm run demo
   ```
   * *See*: All 7 PRD scenarios execute sequentially in the terminal, demonstrating in-line refund holding, prompt injection blocks, gateway exfiltration interception, overnight autonomous defense, threat intel sanitization, the Track 06 payment agent drain prevention, and observe-only transparency. Prints formatted execution matrix: `ALL 7 SCENARIOS PASSED (100%)`.

2. **Database Reset & Seeding**:
   ```bash
   npm run seed
   ```
   * *See*: SQLite database reset and provisioned with 6 accounts, 4 workspaces, 6 agents, active policies, and 47 hash-chained audit blocks.

3. **Performance & Latency Benchmark**:
   ```bash
   npm run benchmark
   ```
   * *See*: Automated 100-iteration benchmark outputting empirical latency measurements:
     - Ingestion Pipeline: **2.26 ms**
     - 9-Rule Detection Engine: **0.72 ms**
     - In-Line SDK Pre-Call Guardrail Hook: **0.06 ms** (61 microseconds)
     - Total End-to-End Event-to-Alert Latency: **9.89 ms** average

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   * *See*: Next.js server starts on `http://localhost:3000`.

5. **Run End-to-End Test Suite**:
   ```bash
   npm test
   npm run typecheck
   ```
   * *See*: All 103 tests across 43 suites pass with 0 failures, and TypeScript type-checks cleanly.

---

## 9. Performance & Latency Benchmark Metrics (Stage 13)

Measured across 100 iterations per component using `scripts/benchmarks/latency-benchmark.ts`:

| Component / Pipeline Stage | Avg Latency | Median (p50) | 95th Percentile (p95) | Min / Max |
| :--- | :--- | :--- | :--- | :--- |
| **Ingestion Pipeline** (`/api/ingest/telemetry`) | 2.260 ms | 0.485 ms | 5.728 ms | 0.380 ms / 28.540 ms |
| **9-Rule Detection Engine** (`evaluateDetectionRules`) | 0.723 ms | 0.280 ms | 3.447 ms | 0.210 ms / 7.890 ms |
| **In-Line SDK Pre-Call Hook** (`wrapToolCall`) | **0.061 ms** (61 µs) | **0.007 ms** (7 µs) | 0.158 ms | 0.005 ms / 1.120 ms |
| **Total Event-to-Alert Latency** (End-to-End) | **9.891 ms** | **4.810 ms** | 34.589 ms | 4.120 ms / 78.430 ms |

> [!NOTE]
> The `@agentshield/sdk` pre-call hook executes in an average of **61 microseconds**, imposing virtually zero overhead on autonomous agent tool execution; stops actions for agents connected through the SDK or proxy; other agents are watch-only.

---

## 10. Submission & Video Demo Artifacts (Stage 13)

In accordance with Hackathon Rule Q-005 and negative submission constraints, all submission collateral has been prepared locally for human operator review:

* **90-Second Video Demo Script**: [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) &mdash; Second-by-second pacing (0:00 to 1:30) opening with the enterprise treasury problem, demonstrating the live Track 06 payment drain interception, explaining NEAR's Function-Call Keys and 1-yoctoNEAR gate, and providing clear verification steps.
* **Draft Public X (Twitter) Demo Post**: [`docs/SUBMISSION_DRAFT.md`](./docs/SUBMISSION_DRAFT.md) &mdash; Compliant draft tagging `@NEARProtocol` and `#NEARHackathon`, leading with the autonomous agent problem and highlighting NEAR's concrete role.
* **API Submission Payload (Draft with Placeholders Only)**: [`docs/SUBMISSION_DRAFT.md`](./docs/SUBMISSION_DRAFT.md) &mdash; Formatted JSON for `POST https://nearhackathon.com/api/applications` with local placeholders only (`[PLACEHOLDER_*]`).
* **Stage 13 Verification Report**: [`stage13_report.md`](./docs/stage13_report.md) &mdash; Comprehensive verification report detailing route authorization, secrets scan, dependency audit, benchmarks, and compliance.
