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

