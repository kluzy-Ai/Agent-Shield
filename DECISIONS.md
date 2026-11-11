# Architecture & Product Decision Records (ADR)

This document tracks all key technical, architectural, and product decisions made for Agent Shield.

---

## ADR-001: Monorepo & System Architecture (PRD Section 22)
- **Status**: Accepted
- **Context**: Agent Shield requires a unified codebase that supports a full-stack dashboard, an in-line proxy/gateway, an asynchronous background worker, a client SDK, an embedded database with zero setup, and on-chain smart contracts.
- **Decision**: Adopt a modular monorepo architecture:
  - `apps/web`: Next.js (App Router) + TypeScript for the web dashboard, SOC console, and management APIs.
  - `services/gateway`: Lightweight Node.js/TypeScript proxy gateway intercepting and validating agent tool calls and HTTP/RPC egress.
  - `services/worker`: Node.js background worker managing periodic heartbeats, telemetry stream processing, and alert dispatch (PRD Section 1).
  - `packages/sdk`: TypeScript SDK (`@agent-shield/sdk`) for instrumented agent control points and guardrails.
  - `packages/db`: SQLite via Drizzle ORM for zero-setup local persistence and instant reproducibility for judges.
  - `contracts/`: Rust smart contracts on NEAR for on-chain spending limits, approval vaults, and 1 yoctoNEAR consensus rules.
  - `tests/`: Vitest test suites across SDK, gateway, and policies.

---

## ADR-002: Zero-Setup Database Layer (SQLite via Drizzle)
- **Status**: Accepted
- **Context**: Hackathon judges and developers must be able to clone, run, and test Agent Shield locally without external Postgres/Redis dependencies.
- **Decision**: Use SQLite with Drizzle ORM (`better-sqlite3` / `drizzle-orm`).
- **Consequences**: Zero configuration, instant startup, file-based persistence, fully typed schemas, and portable test suites.

---

## ADR-003: First Integration Target Selection (PRD Section 19 Decision)
- **Status**: Accepted
- **Context**: PRD Section 19 requires deciding which integration target to implement first for reliable event visibility and enforcement.
- **Decision**: Build an **Instrumented TypeScript SDK plus Gateway** as the primary integration model.
- **Test Agents**: Verify end-to-end enforcement using three representative mock agents:
  1. **Refund-Handling Support Agent**: Manipulated via prompt injection into issuing unauthorized refunds; halted by spending caps and Function Call Key policies.
  2. **Web-Research Agent**: Exposed to indirect prompt injection on webpages attempting data exfiltration; intercepted by outbound egress domain allowlists.
  3. **NEAR Payment Agent**: Signs on-chain transactions; restricted to Function Call Keys and the 1 yoctoNEAR human consent rule for large sums.

---

## ADR-004: Anti-Hallucination & Honest Coverage Architecture
- **Status**: Accepted
- **Context**: PRD Sections 11, 12, and 22 mandate that the product must never claim protection that isn't real. "Blocked" is only shown if enforcement actually prevented execution.
- **Decision**:
  - Every agent connection tracks an explicit `enforcementLevel`: `ENFORCING`, `APPROVAL_REQUIRED`, `OBSERVE_ONLY`, `LIMITED_VISIBILITY`, `DISCONNECTED`.
  - Every tool declaration notes whether it is enforceable (`canBlock: true/false`).
  - Actions are marked `BLOCKED` only when an in-line gateway or contract consensus intervened. Observe-only integrations display `FLAGGED (ALERT ONLY)`.

---

## ADR-005: Testing Framework Selection
- **Status**: Accepted
- **Context**: Need fast, ESM-native unit and integration tests across monorepo packages without complex Jest configuration.
- **Decision**: Use **Vitest** for all automated testing.

---

## ADR-006: 7-Step Forensic Sequence Reconstruction & Strict Payload Redaction
- **Status**: Accepted
- **Context**: PRD Section 11 and FR-10/FR-11 mandate transparent forensic reconstruction without leaking sensitive API keys, customer PII, or raw injection prompts to downstream observers.
- **Decision**:
  - Model every security incident with a discrete 7-step sequence: `Trigger` &rarr; `Agent Response` &rarr; `Tool Calls` &rarr; `Attempted Action` &rarr; `Policy Decision` &rarr; `Outcome` &rarr; `Threat Indicators`.
  - All payload views pass through a mandatory redaction pipeline masking private keys (`ed25519:...`), bearer tokens, and payment amounts before display or sanitized community export.

---

## ADR-007: Cryptographically Chained Audit Ledger (SHA-256 PrevHash)
- **Status**: Accepted
- **Context**: Compliance and incident post-mortems (FR-14) require tamper-evident logging so that neither rogue agents nor malicious operators can quietly erase or alter audit records.
- **Decision**:
  - Implement a chained block audit record where each entry computes `entryHash = SHA-256(seq || timestamp || actor || action || prevHash)`.
  - The UI features an interactive hash-chain verification tool that verifies the entire linear cryptographic sequence and alerts on any discrepancy.

---

## ADR-008: Multi-Stage Threat Intelligence Lifecycle & Consent Gating (PRD Section 16)
- **Status**: Accepted
- **Context**: Community threat sharing provides ecosystem defense against novel LLM injection and key drain vectors, but unvetted sharing risks publishing weaponized exploits or private customer data.
- **Decision**:
  - Submissions require explicit consent: Private (workspace only) vs Public-Eligible.
  - Publicly eligible reports require moderator role gating (`MODERATOR` / `SECURITY_ADMIN`) to triage, classify, deduplicate, and verify before publishing.
  - All published reports feature community mitigation feedback ("This helped" counter).

---

## ADR-009: Scoped Credential Governance & Zero-Raw-Key-Disclosure
- **Status**: Accepted
- **Context**: Agent Shield is a security product and must never become an attack surface or credential storage liability (PRD Section 11).
- **Decision**:
  - All generated API tokens and Function Call Keys are displayed in plaintext exactly once at creation time.
  - Secret keys are hashed or masked immediately (`ash_live_9f81****************3a02`) and cannot be viewed in plaintext again.

---

## ADR-010: Two Control Points, Safe-Failure Fail-Closed Gateway & Real Action Holding (FR-07, FR-08)
- **Status**: Accepted
- **Context**: Security policies cannot rely solely on client-side SDK cooperation (which can be bypassed by uninstrumented or rogue agents), nor solely on perimeter gateways (which lack fine-grained tool context). Furthermore, actions requiring human approval must actually hold execution rather than merely logging a warning, and gateway inspection failures must never fail open.
- **Decision**:
  1. **Dual Control Points**: Enforce policies at two complementary layers: (1) In-line SDK pre-call hooks (`@agentshield/sdk`) wrapping tool invocations, and (2) HTTP forward proxy gateway (`services/gateway`) intercepting outbound tool/RPC traffic.
  2. **Real Action Holding Queue**: When `REQUIRE_APPROVAL` is triggered, the SDK pre-call hook halts tool invocation and enters an asynchronous polling/hold loop on `/api/approvals/[id]`. Tool execution only proceeds once authorized by an operator (with 1 yoctoNEAR cryptographic signature requirement). If denied or expired, the hook aborts execution throwing `ApprovalDeniedError` or `ApprovalExpiredError`.
  3. **Safe-Failure Fail-Closed Architecture**: If internal errors, timeouts, or unhandled exceptions occur during gateway inspection, the proxy aborts the upstream connection and returns HTTP 502 with `x-agentshield-failure-mode: FAIL_CLOSED` and `safeBypassPrevented: true`. Under no circumstances is uninspected traffic forwarded.

---

## ADR-011: 9-Rule Threat Detection Engine, TEE Hardware Attestation & Safe-Probe Baseline Assessment (FR-04, FR-06)
- **Status**: Accepted
- **Context**: 
  1. Autonomous agents on NEAR are vulnerable to 9 primary threat categories (FR-06): unexpected tool use, suspicious destination domains, permission scope violations, privilege escalation attempts (adding/deleting keys, deploying contracts), unusual data/vault access, repeated invocation failures, configuration changes, high-impact actions inconsistent with declared purpose, and indirect prompt injection in tool outputs.
  2. Telemetry alerts must retain deterministic, verifiable evidence ("why this was flagged" with structured fields, patterns, and thresholds) rather than black-box opacity.
  3. LLM-based classification via NEAR AI Cloud must run in confidential hardware enclaves (Intel TDX / NVIDIA CC) with verifiable attestation quotes (per `VERIFIED_FACTS.md`), and must feature a zero-dependency deterministic fallback when API keys are absent.
  4. Security posture assessments (FR-04) must verify agent capabilities without causing on-chain mutations or accidental fund loss (safe non-mutating probes), must calibrate a 0–100 risk score, must strictly label findings as `VERIFIED`, `INFERRED`, or `UNTESTED`, and must explicitly document uninstrumented blind spots.
- **Decision**:
  - **9-Rule Detection Engine (`src/lib/detection-engine/index.ts`)**: Evaluates incoming actions and tool outputs across all 9 PRD threat vectors. Automatically constructs structured `whyFlagged` explanations, `supportingEvidence` payloads, and actionable remediation steps.
  - **NEAR AI Cloud Confidential Inference with Deterministic Fallback (`src/lib/detection-engine/llm-classifier.ts`)**: Connects to `https://api.near.ai/v1/chat/completions` inside hardware TEE enclaves requesting remote attestation headers (`x-request-attestation: quote`). When `NEAR_AI_API_KEY` is not configured, automatically runs a local deterministic regex and heuristic classifier so that tests and local deployments function reproducibly without external key dependencies.
  - **Safe-Probe Baseline Assessment Engine (`src/lib/assessment-engine/index.ts`)**:
    - Inventories 6 architectural dimensions: capabilities, tools, permissions, endpoints, data access scopes, and active policies.
    - Runs 5 safe, non-mutating verification probes (`isSafeNoMutation: true`): Function Call Key scoping, destination domain verification, 1 yoctoNEAR authorization gate check, dry-run simulation capability, and egress exposure.
    - Computes calibrated Risk Score (0–100) combining base vulnerability severity, declared permissions, and active policy mitigations.
    - Labels every finding strictly as **`VERIFIED`** (empirically confirmed via active probes or contract inspection), **`INFERRED`** (heuristically derived from manifest patterns or historical telemetry), or **`UNTESTED`** (third-party external APIs or uninstrumented channels).
    - Enforces truth-in-advertising with explicit **Blind Spots** enumeration (uninstrumented egress, passive webhooks, host subprocesses/filesystem).

  4. **Real Agent Capability Grounding**: For agents with `OBSERVE_ONLY` capability, the policy engine degrades blocking rules to `ALERT` (`allowed: true`, `enforcementUnavailable: true`), guaranteeing truth-in-advertising and preventing false claims of protection where passive webhooks cannot halt execution.

---

## ADR-012: Forensic Dossier Architecture, Multi-Pass Redaction Pipeline, Minimum-Evidence Storage & Background Worker SLAs (FR-09, FR-10, FR-11)
- **Status**: Accepted
- **Context**: 
  1. Incidents require complete forensic reconstruction (Trigger &rarr; Agent Response &rarr; Tool Calls &rarr; Attempted Action &rarr; Policy Decision &rarr; Outcome &rarr; Threat Indicators) so security operators can quickly assess and contain attacks.
  2. Storing raw telemetry payloads creates severe data leakage risks and compliance violations (GDPR/SOC2) if private keys, seed phrases, customer emails, phone numbers, or credit card numbers are persisted or exported.
  3. Security containment actions (pausing an agent, revoking ingest credentials, marking false positive) must be directly executable from incident dossiers and recorded to the append-only audit log.
  4. Sanitized incident export must support both community-ready JSON and valid binary PDF documents without external native dependencies.
  5. The background worker daemon must autonomously evaluate heartbeats, enforce health SLAs (>60s DEGRADED, >120s DISCONNECTED), dispatch notifications across multiple channels (Email, Webhook with HMAC-SHA256, Telegram, Slack), and produce daily morning incident summaries.
- **Decision**:
  - **Multi-Pass Redaction Pipeline (`src/lib/redaction/index.ts`)**: Enforces deterministic, multi-pass scrubbing prior to SQLite storage, export, and community sharing. Scrubs: NEAR ed25519 private keys, EVM secp256k1 64-hex keys, 12/24-word BIP-39 mnemonic seed phrases, Bearer/ash_live_/NEAR_AI_/sk- API tokens, customer emails, E.164 phone numbers, and Luhn-verified credit card numbers.
  - **Forensic Timeline Builder & Minimum-Evidence Storage (`src/lib/forensics/timeline-builder.ts`)**: Constructs discrete 7-step sequence reconstructions. Computes SHA-256 `contentHash` and `evidenceFingerprint`, saving only sanitized key parameters and snippets $\le 256$ characters, preventing unbounded raw payload storage.
  - **Zero-Dependency Standards-Compliant PDF Generator (`src/lib/forensics/export-generator.ts`)**: Builds pure-TypeScript binary PDF-1.4 documents containing incident dossiers, 7-step timelines, minimum evidence fingerprints, operator notes, and cryptographic digests.
  - **Autonomous Background Worker Daemon (`services/worker/src/index.ts`)**: Continuously monitors agent heartbeats against SLAs, creates automated alerts upon telemetry outage, dispatches notifications across Email, Webhook (HMAC-SHA256), Telegram, and Slack, and compiles 24-hour Daily Morning Incident Summaries.

---

## ADR-013: Threat Intelligence Hygiene Pipeline, Role-Gated Moderation Lifecycle, Consent Enforcement Gate, and Deduplication Architecture (FR-12, FR-13)
- **Status**: Accepted
- **Context**:
  1. Sharing threat intelligence across organizations requires that user data is **strictly private by default**. Under no circumstances should unconsented incident logs or proprietary prompts be published or leaked into public repositories.
  2. Before any report enters community review or moderation, it must pass through **automated hygiene**: multi-pass redaction (scrubbing secrets, keys, seed phrases, emails, cards), attachment security scanning (MIME types, file size $\le 2\text{MB}$, malicious script execution detection), and content fingerprinting for duplicate detection.
  3. Community moderation must be strictly role-gated: only accounts with `moderator`, `admin`, or `owner` roles may access moderation queues, triage reports, assign confidence scores, reject reports, or verify & publish community reports.
  4. Publication must be gated by **both user consent AND explicit moderator approval**: if a user did not consent, attempting to publish throws `ConsentRequiredForPublicationError`. When published, a cryptographically signed sanitized public summary is generated.
  5. The public repository must be publicly queryable (keyword search, threat category, tags) and feature community mitigation feedback ("This helped" upvotes) with deduplicated voting.
  6. Incidents must convert seamlessly into sanitized threat reports ("Incident-to-Report flow"), pre-filling threat categories, evidence, and mitigations while preserving user consent choices.
- **Decision**:
  - **Automated Hygiene Engine (`src/lib/threat-intel/hygiene.ts`)**: Applies deterministic multi-pass redaction (`sanitizeReportInputs`), validates attachments (`scanAttachment`), calculates SHA-256 content fingerprints (`computeContentFingerprint`), and detects exact and semantic duplicates (`detectDuplicates`).
  - **Rate Limiting & Abuse Prevention (`checkSubmissionRateLimit`)**: Enforces a sliding-window ceiling of max 5 threat report submissions per 10 minutes per workspace/user, throwing `SubmissionRateLimitError` upon breach.
  - **Dual-Consent Publication Gate**: Guarantees nothing enters the public repository unless `is_public_consented === 1` AND `moderation_status === 'VERIFIED_PUBLISHED'`.
  - **Incident-to-Report Flow (`convertIncidentToThreatReport`)**: Extracts incident timelines, root causes, and minimum evidence, automatically maps attack vectors to PRD categories, and drafts a scrubbed community submission.
  - **Deduplicated Mitigation Feedback**: Tracks unique upvotes per report and user/session identifier in SQLite (`threat_feedback` table), incrementing `helpful_count` without duplicate ballot stuffing.

---

## ADR-014: NEAR Protocol Integration, Function-Call Access Keys, On-Chain Audit Anchors & Community Threat Registry (Stage 11)
- **Status**: Accepted
- **Context**:
  1. Autonomous AI agents executing financial transactions on NEAR Protocol must never be granted Full Access Keys (FAKs), as an exploit or prompt injection could drain all tokens, rotate signing keys, or deploy arbitrary code. Agents must strictly use Function Call Access Keys (FCKs) scoped to explicit receiver contracts, specific methods, and gas allowances.
  2. Protocol consensus dictates that FCKs cannot transfer native NEAR tokens. Attaching an explicit deposit of $1\text{ yoctoNEAR}$ ($10^{-24}\text{ NEAR}$) acts as an unbypassable cryptographic gate that forces human wallet signature, preventing autonomous drain.
  3. Pre-transaction counterparty validation requires multi-signal risk analysis: contract vs. named EOA detection (`code_hash !== '11111111111111111111111111111111'`), on-chain existence and activity via NEAR Testnet RPC, historical interaction records for the agent from SQLite telemetry, and verified community threat blocklists.
  4. Cryptographic audit logs must be provable beyond the local host: periodic hash-chain roots must be anchored to NEAR Testnet smart contracts so operators and external auditors can verify that local ledger hashes match on-chain consensus.
  5. Community threat intelligence must be permanently published on-chain via a smart contract Threat Registry, providing verifiable report hashes and blacklisted adversary account IDs.
  6. AI detection using NEAR AI Cloud must execute inside hardware Trusted Execution Environments (Intel TDX / NVIDIA CC). If API credentials are not provided, truth-in-advertising mandates honest disclosure (`[LOCAL DETERMINISTIC FALLBACK - NO NEAR_AI_API_KEY]`).
  7. Passwordless operator authentication using NEAR Testnet named accounts verified against NEAR Testnet RPC.
- **Decision**:
  - **Scoped FCK & 1-YoctoNEAR Human Gate (`scripts/mock-agents/near-payment-agent.ts`, `@agentshield/sdk`)**: Demonstrated Autonomous Treasury Agent with FCK scoped strictly to `payment-vault.testnet`, methods `['disburse_vendor_payment', 'verify_invoice']`, and 5.0 NEAR ceiling. High-risk actions route to human approval with 1 yoctoNEAR attached deposit. Full protocol limits and caveats documented in `README.md` Section 2.
  - **Counterparty Check Service (`src/lib/near/counterparty-service.ts`)**: Built multi-signal evaluator returning `ALLOW` (approved target contract), `WARN` (unverified new counterparty -> held in approvals queue), and `BLOCK` (threat catalog blocklist -> SDK refuses to sign).
  - **Rust Smart Contract & On-Chain Anchoring (`contracts/shield_security/src/lib.rs`, `src/lib/near/anchor-service.ts`)**: Authored `ShieldSecurityContract` for audit-log root anchoring and community threat registry. Connected to live NEAR Testnet RPC (`https://rpc.testnet.near.org`).
  - **Dashboard & Audit Log Integration (`src/components/AuditLogViewer.tsx`)**: Prominently displays "Anchored on NEAR Testnet" card with target contract ID, live block height, NearBlocks transaction explorer link, and "Verify On-Chain Root" consensus verification button.
  - **Hardware TEE Enclave Attestation Card (`src/components/IncidentDetailModal.tsx`)**: Displays hardware attestation status (Intel TDX / NVIDIA CC) with honest deterministic fallback disclosure when `NEAR_AI_API_KEY` is not present.
  - **NEAR Testnet Wallet Sign-In & OutLayer Custody (`src/lib/db/auth.ts`, `src/components/AuthWorkspaceModal.tsx`, `docs/INTEGRATIONS.md`)**: Implemented passwordless operator sign-in with `.testnet` account RPC verification, and documented OutLayer TEE agent custody.

---

## ADR-016: Final Hardening, Security Review, Sub-10ms Latency Benchmarking, Rule Q-005 Disclosures & Draft Submission Packaging (Stage 13)
- **Status**: Accepted
- **Context**:
  1. **Live Hackathon Constraints**: In accordance with the live `HACKATHON.md`, the submission requires rigorous production-grade hardening, absolute transparency regarding AI-generated code and third-party libraries (Rule Q-005), a verified zero-leak security posture, empirical performance benchmarking for event-to-alert latencies, a machine-readable README, a 90-second video demo script, and a draft X post.
  2. **Strict Submission Constraints**: Hackathon rules explicitly mandate that no public posts, git pushes, public repository releases, or automated API submissions may be performed without explicit human review and trigger. The submission payload must be prepared strictly as a local draft with placeholders only (`docs/SUBMISSION_DRAFT.md`).
  3. **Route Authorization & Security Posture**: Every single API route (40 endpoints) must undergo an explicit authorization audit verifying that public routes are intentional, telemetry ingestion routes require bearer tokens and rate limiting, gateway traffic verifies proxy headers, and management routes enforce multi-tenant session isolation and role-based access control.
  4. **Latency SLAs**: In-line guardrails must never hinder autonomous agent tool execution or add prohibitive overhead to real-time agent workflows.
- **Decision**:
  - **Comprehensive Security Review**:
    - **Secrets Scan**: Executed automated recursive regex scan across all code, configuration, scripts, and documentation for ed25519/secp256k1 keys, seed phrases, NEAR AI tokens, AWS/Stripe/generic API keys. Zero production or personal secrets detected (all synthetic test vectors reside strictly in isolated test directories with synthetic prefixes).
    - **Dependency Audit**: Ran `npm audit` validating zero vulnerabilities (`found 0 vulnerabilities`).
    - **Authorization Audit**: Verified all 40 API routes across 4 tiers: Public endpoints (`/api/auth/*`, `/api/threat-intel/public`, `/api/threat-intel/trends`, `/api/threat-intel/feedback`, `/api/near/counterparty-check`), Ingestion endpoints requiring bearer token authentication and rate limiting (`/api/ingest/telemetry`, `/api/ingest/heartbeat`), Gateway proxy endpoints requiring internal header validation (`/api/gateway/proxy`), and Operator Management endpoints requiring authenticated session and workspace role authorization (`owner`, `admin`, `analyst`, `moderator`, `viewer`).
  - **Empirical Performance & Latency Benchmarks (`scripts/benchmarks/latency-benchmark.ts`)**:
    - Built and executed automated 100-iteration benchmark suite across each pipeline stage:
      - Ingestion Pipeline: **2.260 ms** avg (p50: 0.485 ms, p95: 5.728 ms)
      - 9-Rule Detection Engine: **0.723 ms** avg (p50: 0.280 ms, p95: 3.447 ms)
      - In-line SDK Pre-Call Guardrail Hook: **0.061 ms** avg (p50: 0.007 ms, p95: 0.158 ms) &mdash; **61 microseconds** overhead!
      - Total End-to-End Event-to-Alert Latency: **9.891 ms** avg (p50: 4.810 ms, p95: 34.589 ms).
  - **Rule Q-005 Library & AI-Generated Code Disclosures**:
    - Updated `README.md` with explicit attribution of all third-party dependencies (`next`, `react`, `argon2`, `near-api-js`, `typescript`, `@types/*`, Node.js native `node:sqlite` and `node:crypto`) and full transparent disclosure of AI-assisted scaffolding and pair programming via Google DeepMind Antigravity.
  - **90-Second Demo Video Script (`docs/DEMO_SCRIPT.md`)**:
    - Authored second-by-second timing script (0:00 - 1:30) opening with the catastrophic enterprise problem (autonomous agents with full credentials draining treasuries), demonstrating Track 06 payment drain stoppage, highlighting NEAR's concrete role (Function Call Keys, 1-yoctoNEAR cryptographic gate, on-chain testnet audit anchors), and concluding with clear verification steps.
  - **Draft X Post & Draft Submission Payload (`docs/SUBMISSION_DRAFT.md`)**:
    - Formatted compliant draft X post tagging `@NEARProtocol` and `#NEARHackathon`, leading with the autonomous agent security problem and highlighting NEAR's concrete role.
    - Prepared compliant JSON payload matching the `POST https://nearhackathon.com/api/applications` contract with local placeholders only (`TODO_*`).

- **Status**: Accepted
- **Context**:
  1. To demonstrate real autonomous protection across all PRD scenarios and the Track 06 hackathon demo, the system requires reproducible, runnable simulation scripts in `scripts/simulations/` covering:
     - (a) Refund abuse held for human approval via 1 yoctoNEAR cryptographic gate
     - (b) Prompt injection via scraped public webpage flagged and halted at the SDK pre-call control point
     - (c) Unauthorized data transfer blocked by the fail-closed gateway proxy
     - (d) Overnight autonomous activity with morning summary aggregation across 24-hour threats, drains, and fleet health
     - (e) Community threat intelligence research contribution through the automated hygiene, redaction, moderation, and NEAR Testnet registry pipeline
     - (f) Flagship Track 06 Demo: prompt-injected NEAR payment agent attempting a 50 NEAR treasury drain to a known malicious counterparty, stopped in-line before network broadcast
     - (observe) Observe-only agent run honestly displaying "observed, not blocked" without claiming false enforcement
  2. The system requires a zero-friction seed command (`npm run seed`) and a one-command demo script (`npm run demo`) outputting an execution matrix.
  3. Every acceptance criterion in PRD Section 18 (Criteria 18.1 through 18.10) must have a dedicated automated end-to-end test suite proving 100% compliance with explicit PASS/FAIL reporting.
- **Decision**:
  - **Simulation Suite (`scripts/simulations/`)**: Authored 7 standalone executable scripts with formatted terminal output, realistic payloads, and complete state verification.
  - **Master Orchestrator (`npm run demo` / `scripts/simulations/run-all-scenarios.ts`)**: Runs all 7 scenarios in sequence, measures execution time, and outputs an end-of-run PASS/FAIL matrix.
  - **Acceptance Criteria E2E Suite (`tests/acceptance-criteria-e2e.test.ts`)**: Built 10 dedicated tests covering Criteria 18.1 to 18.10, verifying workspace creation, capability clarity, timeline event identity, alert/incident creation, in-line blocking, observe-only honest disclosure, offline notification dispatch, incident dossier 4-part explanation, private-by-default sharing, and 100% secret/PII redaction.
  - **Truth-in-Advertising Verification**: Validated that observe-only integrations cleanly degrade from `BLOCK` to `ALERT` (`allowed: true`, `enforcementUnavailable: true`, UI/system notice stating "observed, not blocked").





