# Agent Shield: Feature-to-Stage Delivery Map

This document establishes the definitive delivery roadmap mapping every Functional Requirement (**FR-01 through FR-15**) and every core capability from **PRD Section 6** to explicit project stages.

---

## 1. Master Stage Roadmap Overview

| Stage | Name | Focus / Primary Deliverables | PRD Section 6 Capabilities | Functional Requirements |
| :---: | :--- | :--- | :--- | :--- |
| **Stage 0** | **Foundation & Architecture** | Source of truth documents, monorepo scaffold, verification facts, database schemas, machine-readable README, MIT license. | 6.1 (Architecture), 6.5 (Contracts) | Architectural baseline |
| **Stage 1** | **Core Database & Background Worker** | SQLite + Drizzle models, background monitoring worker, telemetry ingestion engine, heartbeat daemon. | 6.3 (Continuous Monitoring) | **FR-01**, **FR-05**, **FR-14**, **FR-15** |
| **Stage 2** | **Instrumented SDK & Gateway Proxy** | `@agent-shield/sdk` wrapper, in-line Gateway proxy, execution interceptors, secret redaction filter. | 6.1 (Onboarding), 6.5 (Action Controls), 6.7 (Threat Forensics) | **FR-02**, **FR-03**, **FR-08**, **FR-11** |
| **Stage 3** | **Policy Engine & NEAR FCK Enforcement** | Rule evaluation engine, spending caps, destination allowlists, 1 yoctoNEAR consensus rule, Rust contracts in `/contracts`. | 6.5 (Policy Engine & Controls) | **FR-06**, **FR-07**, **FR-08** |
| **Stage 4** | **Counterparty Scoring & Attack Vectors** | Signals 1-4 (Account Age, Code Hash Freshness, Prior Interactions, Shared Blocklist), three mock test agents, prompt injection attack demo. | 6.2 (Security Assessment), 6.4 (Threat Detection) | **FR-04**, **FR-06**, **FR-10** |
| **Stage 5** | **Alerts, Incidents & SOC UI** | Alerts feed, incident investigation drawer, honest coverage transparency card, multi-agent status console. | 6.6 (Alerts & Incidents), 6.9 (Multi-Agent Dashboard) | **FR-09**, **FR-10**, **FR-15** |
| **Stage 6** | **Threat Intelligence & Hackathon Prep** | Sanitized community reporting form, verified threat database, automated tests (Vitest), end-to-end reproducible verification. | 6.8 (Threat Intel & Community Reporting) | **FR-12**, **FR-13**, **FR-14** |

---

## 2. Detailed Mapping by PRD Section 6 Capabilities

### 6.1 Agent Onboarding and Connection
- **Scope**: Guided registration, declared purpose, tools inventory, minimum permissions, connection tests.
- **Delivery**: **Stage 0** (Schema/Types), **Stage 2** (SDK & Gateway Registration), **Stage 5** (UI Flow).
- **Requirements**: **FR-02**, **FR-03**.

### 6.2 Agent Security Assessment
- **Scope**: Baseline vulnerability assessment, risk scoring (0-100), transparent evidence, distinguishing verified from untested areas.
- **Delivery**: **Stage 4** (Assessment Engine), **Stage 5** (UI Posture Cards).
- **Requirements**: **FR-04**.

### 6.3 Continuous Monitoring
- **Scope**: Timestamped activity timeline, tool calls, egress destinations, background worker operating independently of the browser dashboard.
- **Delivery**: **Stage 1** (Worker & SQLite Ingestion), **Stage 5** (Live Feed UI).
- **Requirements**: **FR-05**, **FR-15**.

### 6.4 Threat and Anomaly Detection
- **Scope**: Prompt injection indicators, unusual tool calls, privilege escalation, suspicious egress, counterparty signals.
- **Delivery**: **Stage 3** (Heuristic Rules), **Stage 4** (Counterparty Signals 1-4).
- **Requirements**: **FR-06**.

### 6.5 Policy Engine and Action Controls
- **Scope**: Allowed tools, spending caps, destination allowlists, 1 yoctoNEAR human consent gate, enforceable blocking vs observe-only alerting.
- **Delivery**: **Stage 2** (Gateway Interceptor), **Stage 3** (Policy Engine & Rust Contract).
- **Requirements**: **FR-07**, **FR-08**.

### 6.6 Alerts and Incident Response
- **Scope**: Categorized alerts by severity, incident timeline, mitigation recommendations, acknowledgement workflow.
- **Delivery**: **Stage 1** (Worker Dispatch), **Stage 5** (Incident Views).
- **Requirements**: **FR-09**, **FR-10**.

### 6.7 Threat Forensics
- **Scope**: Sequence reconstruction, triggering input, agent tool formulation, raw redacted payloads, sanitized export.
- **Delivery**: **Stage 2** (Payload Redaction), **Stage 5** (Forensic Inspector Modal).
- **Requirements**: **FR-10**, **FR-11**.

### 6.8 Threat Intelligence and Community Reporting
- **Scope**: Public/private threat report submission, automated hygiene, community repository, mitigations sharing.
- **Delivery**: **Stage 6** (Submission API, Moderation Workflow, Public View).
- **Requirements**: **FR-12**, **FR-13**.

### 6.9 Multi-Agent Dashboard
- **Scope**: Central SOC overview, filtering by agent and severity, honest status indicators (`ENFORCING`, `APPROVAL_REQUIRED`, `OBSERVE_ONLY`, `LIMITED_VISIBILITY`).
- **Delivery**: **Stage 5** (Console UI).
- **Requirements**: **FR-15**.

---

## 3. Detailed Mapping by Functional Requirement (FR-01..FR-15)

| Requirement ID | Summary Description | Assigned Stage | Verification Method |
| :--- | :--- | :---: | :--- |
| **FR-01** | Account & workspace boundaries | **Stage 1** | SQLite schema & workspace isolation tests. |
| **FR-02** | Add, edit, pause, disconnect agent lifecycle | **Stage 2** | SDK heartbeat & status transition tests. |
| **FR-03** | Record integration type, purpose, declared tools | **Stage 2** | Agent manifest validation in Gateway. |
| **FR-04** | Baseline security assessment & severity findings | **Stage 4** | Automated assessment unit tests. |
| **FR-05** | Ingest telemetry & display activity timeline | **Stage 1** | Background worker ingestion benchmark. |
| **FR-06** | Detection engine evaluating rules & injection heuristics | **Stage 3 & 4** | Prompt injection attack test vector. |
| **FR-07** | Configurable guardrail policies (spend, allowlist, yoctoNEAR) | **Stage 3** | Policy evaluation unit tests. |
| **FR-08** | Policy outcomes: log, alert, pause, block | **Stage 2 & 3** | Gateway interception test suite. |
| **FR-09** | Generate alerts and persistent incident records | **Stage 1 & 5** | Database record creation & UI check. |
| **FR-10** | Inspect incident details, acknowledge, notes | **Stage 5** | Interactive forensic inspector modal. |
| **FR-11** | Automatic secret & PII redaction | **Stage 2** | Regex & tokenization sanitization tests. |
| **FR-12** | Threat report submission with consent gating | **Stage 6** | API endpoint submission with consent flag. |
| **FR-13** | Threat intelligence classification & verified publication | **Stage 6** | Moderation pipeline test suite. |
| **FR-14** | Audit log of security actions | **Stage 1** | Append-only ledger in SQLite database. |
| **FR-15** | Honest coverage, heartbeat, and blind spots disclosure | **Stage 5** | Coverage transparency card verification. |
