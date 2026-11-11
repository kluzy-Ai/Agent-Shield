# Agent Shield Feature Status Matrix

This file tracks every product capability, requirement, and integration depth across **REAL**, **SIMULATED**, and **PENDING** implementations per the **Final Truth and Safety Pass**.

---

## 1. Functional Requirements Matrix (PRD Section 9)

| ID | Requirement | Status | Classification Details / Scope |
| :--- | :--- | :--- | :--- |
| **FR-01** | Accounts & Workspaces | **REAL** | Workspace-scoped tenant isolation with RFC 9106 Argon2id password hashing, sessions, workspaces, and memberships across 4 roles (`owner`, `admin`, `analyst`, `viewer`) plus platform-level `is_platform_moderator` gate. |
| **FR-02** | Add, Edit, Pause, Disconnect Agents | **REAL** | Real agent lifecycle flows. Scoped per-agent ingest credentials shown once and stored hashed (SHA-256). Rotate & revoke credentials via `/api/agents/[id]/credentials`. |
| **FR-03** | Record Integration & Scope | **SIMULATED ON-CHAIN / REAL IN SDK** | Scoped Function Call Keys modeled in database and enforced by `@agentshield/sdk` middleware. On-chain `AddKey` transactions have not been broadcast to testnet validators. |
| **FR-04** | Baseline Security Assessment | **REAL** | Inventories 6 dimensions, runs 5 safe non-mutating verification probes (`isSafeNoMutation: true`), calibrates 0–100 risk score, labels findings strictly as `VERIFIED`, `INFERRED`, or `UNTESTED`, and generates coverage reports with explicit blind spots. |
| **FR-05** | Telemetry Ingestion & Timeline | **REAL** | Real ingestion endpoints (`/api/ingest/telemetry`, `/api/ingest/heartbeat`) with bearer token authentication, rate limiting (120/min), idempotency deduplication (`eventId`), payload sanitization, and live timeline queries (`/api/telemetry`). |
| **FR-06** | Detection Engine & Rule Evaluation | **REAL (HEURISTIC) / SIMULATED (TEE)** | Comprehensive 9-rule detection engine. TEE remote attestation operates in deterministic fallback mode because `NEAR_AI_API_KEY` is not present in `.env`. |
| **FR-07** | Policy Configuration | **REAL** | Comprehensive policy engine (`src/lib/policy-engine`) supporting Allowed Tools, Approved Destinations allowlists/blocklists, Sensitive Data scanning, Transaction Limits (spending ceilings & approval thresholds), and Dry-Run simulation toggles. |
| **FR-08** | Policy Outcomes (Log, Alert, Require Approval, Pause, Block) | **REAL** | Dual control points: In-line SDK pre-call hook (`@agentshield/sdk`) and HTTP forward proxy (`services/gateway`). Stops actions for agents connected through the SDK or proxy; other agents are watch-only. |
| **FR-09** | Alerts & Incident Records | **REAL** | Complete SQLite persistence in `alerts` and `incidents` tables with status transitions (`OPEN`, `INVESTIGATING`, `CONTAINED`, `FALSE_POSITIVE`, `RESOLVED`), bulk acknowledge, false-positive workflows, and automatic audit-chain logging. |
| **FR-10** | Incident Inspection & Notes | **REAL** | Discrete 7-step sequence reconstruction, minimum-evidence storage with SHA-256 fingerprinting, immutable operator notes timeline, one-click agent pause and credential revocation, and sanitized JSON/PDF export. |
| **FR-11** | Secret & PII Redaction | **REAL** | Multi-pass scrubbing (`src/lib/redaction`) executed before database storage, export, and sharing. Scrubs: NEAR ed25519 keys, EVM secp256k1 keys, BIP-39 seed phrases, Bearer tokens, emails, phone numbers, and payment card numbers. |
| **FR-12** | Threat Report Submission | **REAL** | Open community threat report submission with private workspace default, instant publishing when public consent is checked ("Community report, not verified"), plain text fields, automated secret redaction, bot and account rate limits, and Incident-to-Report pre-fill. |
| **FR-13** | Threat Intelligence Moderation | **REPLACED** | Replaced by automatic safeguards and platform-owner takedown: public unauthenticated read (/api/threat-intel/public) with bot rate limits, instant publishing upon consent, secret redaction, plain text links, duplicate detection, 3-flag community auto-hide, and platform-owner takedown/confirmation gated by server-side `is_platform_moderator` flag. Unverified community reports never feed blocklists or SDK policies. |
| **FR-14** | Audit Log & Hash Chaining | **REAL (LOCAL CHAIN) / SIMULATED (ON-CHAIN ANCHOR)** | Append-only hash-chained ledger (`entryHash = SHA-256(...)`) is REAL and cryptographically verified. The periodic anchor to NEAR testnet uses live block height but computes simulated transaction hashes without on-chain broadcast. |
| **FR-15** | Coverage & Health Transparency | **REAL** | Never shows "Monitoring active" if telemetry or heartbeats stopped (>60s SLA). Dynamically degrades status to `DEGRADED` / `LIMITED_VISIBILITY`. |

---

## 2. Infrastructure & Environment Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Next.js App Framework** | **REAL** | Next.js 16.4.4 (Turbopack) on `http://localhost:3000` |
| **Design System & Visual Styling** | **REAL** | Dark Obsidian Slate, HSL tokens, glassmorphism panels, flat active-nav indicator |
| **Custom SVG Icon Library** | **REAL** | Pixel-perfect 24x24 stroke rounded icons matching Hugeicons design aesthetic |
| **NEAR Testnet RPC Connection** | **REAL** | Live queries to `https://rpc.testnet.near.org` for block height and `view_account` |
| **NEAR Wallet Sign-In** | **REAL (RPC VIEW_ACCOUNT)** | Uses `view_account` query against NEAR Testnet RPC. NEP-413 off-chain signatures marked PENDING. |
| **NEAR AI Cloud TEE Remote Attestation** | **SIMULATED (FALLBACK)** | Runs in local deterministic fallback mode; `NEAR_AI_API_KEY` is not provisioned |
| **Rust Smart Contract Deployment** | **SIMULATED** | Rust contract source exists in `contracts/shield_security/src/lib.rs`; testnet deployment to `shield-security.testnet` is unallocated |
| **1-YoctoNEAR Human Approvals** | **SIMULATED ON-CHAIN / REAL IN UI** | Enforced in UI Approvals Queue; real wallet broadcast is simulated |
| **SQLite Embedded Database** | **REAL** | Node.js native `DatabaseSync` (`node:sqlite`) with zero-setup embedded storage in `data/agent-shield.db` |
| **Argon2 Password Hasher** | **REAL** | `argon2` v0.45.1 memory-hard Argon2id (RFC 9106, 64MB memory, 3 passes, 4 lanes) |
| **Autonomous Background Worker** | **REAL** | Independent daemon (`services/worker/src/index.ts`) managing heartbeats, SLA evaluations, and multi-channel notifications |

---

## 3. Stage Progression History

- **Stage 1 (Completed)**: Architecture, PRD Specification & Foundation
  - Converted PRD to `/docs/PRD.md` and established architectural commitments.
  - Defined monorepo layout, Next.js App Router, embedded SQLite data layer, and `@agentshield/sdk`.
  - Authored `/docs/DESIGN_CONTRACT.md`, `/docs/VERIFIED_FACTS.md`, and `/docs/FEATURE_STAGE_MAP.md`.
  - Added initial seed specifications and license.

- **Stage 2 (Completed)**: Core Screens & Mock Data Shell
  - Built Landing Page screen with PRD Section 21 messaging guardrail.
  - Built Auth & Workspace modal with role mappings and environment switches.
  - Built Onboarding Flow with 5 user personas and control matrix.
  - Built 7-item Dashboard framework, Connected Agents list, and Add Agent Wizard.

- **Stage 3 (Completed)**: Security Screens & Detections
  - Threat Alerts list with severity filtering, bulk acknowledge, and false-positive workflows.
  - Incident Detail modal with 7-step sequence reconstruction, root cause, and operator notes.
  - Policies Manager with spending limits, destination allowlists, and dry-run toggles.
  - Approvals Queue with 1-yoctoNEAR human signature requirement and countdown timer.
  - Audit Log viewer with SHA-256 hash chaining and tamper-detection indicator.

- **Stage 4 (Completed)**: Community Defense & Threat Intelligence
  - Private Threat Report submission with explicit opt-in community consent toggle.
  - Moderation Console with triage, deduplication, verification, and publication workflows.
  - Searchable Public Intelligence Repository with MITRE ATLAS categories and mitigation feedback.

- **Stage 5 (Completed)**: SQLite Data Layer, Argon2id & Audit Ledger
  - Embedded SQLite database schema via Node.js native `DatabaseSync`.
  - Workspace-scoped tenant isolation via `TenantAccessLayer`.
  - Cryptographic append-only hash chain linking all entries to genesis block.

- **Stage 6 (Completed)**: Real Agent Registration, Ingest Credentials & SLA
  - Real agent lifecycle mutations (add, pause, disconnect, remove).
  - Show-once ingest credentials stored exclusively as SHA-256 hashes.
  - Ingestion endpoints (`/api/ingest/telemetry`, `/api/ingest/heartbeat`) with rate limits and deduplication.
  - Honest status transitions: switches to `DEGRADED` / `LIMITED_VISIBILITY` if heartbeats stop >60s.

- **Stage 7 (Completed)**: In-Line Policy Engine, Approvals Queue & Forward Proxy Gateway
  - Dual control points: `@agentshield/sdk` pre-call hook and fail-closed HTTP forward proxy.
  - Approvals queue persistence with 1-yoctoNEAR authorization routing.
  - Observe-only downgrade: dynamically sets `enforcementUnavailable: true` without blocking.

- **Stage 8 (Completed)**: 9-Rule Detection Engine & Baseline Assessment
  - 9-vector detection framework covering unexpected tools, prompt injection, and privilege escalation.
  - Baseline security assessment engine with 5 safe non-mutating verification probes.
  - Finding classification strictly as `VERIFIED`, `INFERRED`, or `UNTESTED`.

- **Stage 9 (Completed)**: Timeline Builder, Redaction Pipeline & Worker Daemon
  - Discrete 7-step forensic sequence builder and minimum evidence storage.
  - Deterministic redaction pipeline stripping 100% of planted keys and PII.
  - Autonomous background worker daemon evaluating heartbeats and dispatching morning summaries.

- **Stage 10 (Completed)**: Threat Intelligence Pipeline & Hygiene
  - Multi-pass automated hygiene scrubbing planted secrets from threat reports.
  - Attachment security scanning rejecting active scripts and shell code.
  - Duplicate detection engine with SHA-256 fingerprints and Jaccard similarity.

- **Stage 11 (Completed)**: NEAR Protocol Integration & Smart Contract
  - Counterparty Check Service querying live NEAR Testnet RPC (`view_account`).
  - Authored Rust smart contract (`contracts/shield_security/src/lib.rs`).
  - Implemented `AnchorService` querying live testnet block info and generating testnet anchor proofs.

- **Stage 12 (Completed)**: Production Simulations & PRD Section 18 E2E Verification
  - Automated 6 core simulation scenarios plus observe-only demo (`scripts/simulations/`).
  - 10/10 PRD Section 18 end-to-end acceptance tests passing.

- **Stage 13 (Completed)**: Hardening, Benchmarking & Video Pack
  - Route authorization audit on all 40 API routes; secrets scan (0 found); dependency audit (0 vulnerabilities).
  - High-precision latency benchmarks: SDK pre-call hook runs in 61 microseconds; end-to-end event-to-alert latency is 9.89 ms.
  - Authored machine-readable `README.md`, 90-second demo script, and draft submission payload.

- **Stage 14 (Completed)**: Final Truth and Safety Pass
  - **Platform-Level Moderation**: Moderation gated strictly by `is_platform_moderator: 1` set via server-side CLI (`scripts/set-platform-moderator.ts`); workspace owner and admin roles are refused.
  - **NEAR Proof Pack**: Created `/docs/PROOF.md` with complete, transparent disclosure of all on-chain claims (REAL vs SIMULATED vs PENDING).
  - **Wording Standardizations**: Replaced "cryptographic tenant isolation" &rarr; "workspace-scoped tenant isolation", "Zero-Knowledge Credential Handling" &rarr; "show-once, hashed credentials", "Signed HTTP Telemetry" &rarr; "bearer-token authenticated telemetry", removed "flash loan drains", "1 YoctoNEAR Consensus Gate" &rarr; "1 yoctoNEAR human approval", removed "preventing autonomous private key extraction", "verifies against testnet consensus" &rarr; "reads the anchored hash from NEAR testnet and compares it", and "guaranteeing... halted" &rarr; "stops actions for agents connected through the SDK or proxy; other agents are watch-only".
  - **Account Renaming**: Renamed all demo accounts to `.testnet` (`treasury-v1.testnet`, `crawler-01.testnet`, `refund-bot.testnet`, etc.) and eliminated all `.near` demo accounts.
  - **Zero Local Paths & Secrets**: Stripped all local usernames (`Promise`) and machine directories from documentation. Secrets scan confirmed 0 leaks.
  - **UI Cleanup & Tooltips**: Standardized 7-item sidebar, removed UI State switcher and TRACK badge, DEMO_MODE-only simulation trigger, flat active-nav style, and preserved tooltips (`?`) on Forensic records, Policy Guardrails, Manage All, Function Call Keys, 1 YoctoNEAR rule, and Blocking Enabled.
  - **Deployment Readiness**: Authored `/docs/DEPLOY.md` detailing Vercel compatibility and PostgreSQL/Redis migration architecture.

- **Stage 15 (Completed)**: Scope Change: Open Community Threat Repository & Automated Safeguards
  - **Removed Moderator Role & Console**: Completely removed the moderation tab, moderation API routes, and `moderator` workspace role.
  - **Public Read Access**: Publicly accessible threat repository without sign-in (`/api/threat-intel/public`) with bot-friendly rate limiting (60 req/min with `X-RateLimit-*` and `Retry-After`).
  - **Open Community Submission**: Any authenticated user can submit threat reports. Reports with public consent are published immediately with "Community report, not verified" badge; reports without consent remain private to the submitter's workspace.
  - **Automated Safeguards**: Planted secret and PII redaction prior to storage, strict rate limits (5 per 10 min, daily cap), link plain-text rendering (no clickable links), HTML stripping, and field length constraints.
  - **Community Flagging & Auto-Hide**: Signed-in readers can flag reports with a reason. Upon 3 flags from distinct accounts, reports are automatically hidden from the public feed and queued for platform owner review.
  - **Platform Owner Takedown & Confirmation**: Single takedown and confirmation actions in admin console gated strictly to server-side `is_platform_moderator: 1`. Every takedown is logged to the hash-chained audit ledger.
  - **Separation Rule**: Unverified community reports never feed the platform blocklist, counterparty checks, SDK policy engine, or on-chain threat registry.
  - **Full Test Coverage**: Expanded test suite to **103 passing tests across 43 suites** with 0 failures, preserving PRD Section 18 acceptance criteria 18.9 and 18.10.
