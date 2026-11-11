# Agent Shield Supported Integrations Guide

This document details the telemetry coverage, runtime enforcement capabilities, minimum cryptographic permissions, failure modes, and setup workflows for autonomous AI agents integrated with **Agent Shield** on NEAR Protocol.

---

## 1. Integration Tiers & Enforcement Taxonomy

Agent Shield enforces honest security boundaries. Runtime guarantees are strictly differentiated based on the integration tier:

| Integration Architecture | Telemetry Coverage | In-Line Blocking Capability | Protection Limits / Gaps |
| :--- | :--- | :--- | :--- |
| **Instrumented SDK (`@agentshield/sdk`)** | Full tool call arguments, outcomes, timing, and local exceptions. | **Active Blocking** (can halt tool execution before dispatch). | Uninstrumented native shell calls or non-wrapped network egress bypass local SDK hooks. |
| **Reverse Proxy / Gateway** | Intercepts HTTP/RPC traffic between agent and NEAR RPC or Web2 APIs. | **Active Blocking** (drops unauthorized requests at proxy layer). | Cannot inspect encrypted agent internal memory or direct peer-to-peer egress. |
| **Outbound Egress Webhook** | Ingests post-facto execution logs and telemetry notifications. | **Observe-Only** (Alerts & Forensic Audit; CANNOT block actions in-line). | Cannot prevent unauthorized transfers before on-chain finality. |
| **On-Chain FCK Contract Barrier** | NEAR Protocol native Function Call Key caps (allowance, receiver ID, methods). | **Cryptographic On-Chain Blocking** enforced by NEAR validators. | Limited to on-chain transaction parameters; cannot inspect Web2 agent prompt interactions. |

---

## 2. Integration 1: Autonomous Refund Support Agent

- **Agent Identity**: `refund-bot.testnet`
- **Target Contract**: `storefront-v2.testnet`
- **Category**: E-Commerce & Customer Service
- **Agent ID**: `agent-02`

### Telemetry Coverage
- **Monitored Tool Calls**: `verify_customer_order`, `calculate_restocking_fee`, `issue_near_refund`.
- **Egress Telemetry**: Outbound RPC calls to `storefront-v2.testnet` for order receipts and return status.
- **Redaction Guarantees**: Customer shipping addresses, credit card tokens, and buyer email headers are automatically scrubbed before ingestion.

### Enforcement Capability
- **Mode**: `ENFORCING` (In-Line via `@agentshield/sdk`)
- **Policies Enforced**:
  - **Single-Transaction Refund Ceiling**: Hard cap at **2.0 NEAR** per refund. Any attempt exceeding 2.0 NEAR is blocked locally.
  - **Destination Allowlist**: Restricted exclusively to customer wallets verified in storefront order receipts. Transfers to blocklisted addresses (e.g. `attacker-drain.testnet`) are immediately rejected.
  - **Prompt Injection Defense**: Evaluates customer chat inputs for delimiter bypasses and override strings.

### Permissions & Key Management
- **NEAR Key Type**: Function Call Access Key (FCK).
- **Receiver ID Restriction**: Strictly scoped to `storefront-v2.testnet`.
- **Allowed Methods**: `["issue_refund", "verify_order"]`.
- **Allowance Budget**: 25.0 NEAR daily replenishable budget.
- **Zero Raw Key Disclosure**: Agent stores only its Function Call Key; Agent Shield ingest credential is authenticated via SHA-256 bearer token.

### Failure Modes & Honest Health Status
- **Heartbeat Timeout (>60s)**: If the agent ceases emitting heartbeats, Agent Shield automatically transitions status from `ACTIVE` to `DEGRADED`, setting enforcement level to `LIMITED_VISIBILITY`. The dashboard marks "Heartbeat Lost (>60s)" and never falsely reports "Monitoring active".
- **Network Disconnection**: If connection token is revoked or network fails, tool calls throw `PolicyBlockedError` or fall back to safe read-only mode.

### Setup Steps
1. Navigate to **Connected Agents** &rarr; click **Add an Agent Wizard**.
2. Select **Instrumented SDK** and enter Identity `refund-bot.testnet`.
3. Configure target contract `storefront-v2.testnet` and FCK allowance `25.0 NEAR`.
4. Copy the raw ingestion token `ash_live_...` generated upon registration.
5. In your agent codebase:
   ```typescript
   import { AgentShield } from '@agentshield/sdk';

   const shield = new AgentShield({
     agentId: 'agent-02',
     ingestToken: process.env.AGENT_SHIELD_INGEST_TOKEN!,
     endpointUrl: 'http://localhost:3000/api/ingest',
     nearAccountId: 'refund-bot.testnet',
     targetContractId: 'storefront-v2.testnet',
     maxNearPerTransaction: 2.0
   });

   // Wrap refund dispatch
   const issueRefund = shield.wrapToolCall(
     'issue_refund',
     'storefront-v2.testnet',
     async (args) => { /* On-chain call */ }
   );
   ```
6. Run the agent script:
   ```bash
   npm run agent:refund
   ```

---

## 3. Integration 2: Web Research & Data Harvester Agent

- **Agent Identity**: `crawler-01.testnet`
- **Target Contract**: `data-oracle.testnet`
- **Category**: Market Intelligence & Oracle Price Feeds
- **Agent ID**: `agent-03`

### Telemetry Coverage
- **Monitored Tool Calls**: `crawl_market_data`, `verify_feed_consensus`, `publish_oracle_price`.
- **Egress Telemetry**: Outbound HTTP queries to public price APIs (`api.coingecko.com`, `binance.com`).
- **Telemetry Type**: Outbound egress metrics, scrape latencies, payload sizes, and consensus drift ratios.

### Enforcement Capability
- **Mode**: `LIMITED_VISIBILITY` / `OBSERVE_ONLY`
- **Policies Enforced**:
  - **Oracle Deviation Ceiling**: Detects rate fluctuations >10% between consecutive block heights.
  - **Egress Domain Allowlist**: Restricts outbound scraping to approved financial data endpoints.
  - **Honest Labeling**: Because Web2 web scraping occurs outside smart contract boundaries, Agent Shield displays a prominent **"Enforcement Unavailable for External Egress"** indicator, ensuring operators understand that external web scraping cannot be halted by NEAR validator consensus.

### Permissions & Key Management
- **NEAR Key Type**: Function Call Access Key (FCK).
- **Receiver ID Restriction**: `data-oracle.testnet`.
- **Allowed Methods**: `["commit_price_feed", "record_oracle_round"]`.
- **Allowance Budget**: 5.0 NEAR for on-chain storage and transaction gas.

### Failure Modes & Honest Health Status
- **Consensus Partition**: If multi-source consensus fails, the agent flags an observation anomaly in the activity timeline.
- **Heartbeat Lost**: Transitions to `DEGRADED` if the crawler goes offline for >60 seconds.

### Setup Steps
1. Register agent in Agent Shield console under **Autonomous Market Researcher** workspace.
2. Store the generated ingest credential securely in `.env`.
3. Wrap oracle publishing tools with `@agentshield/sdk`:
   ```typescript
   import { AgentShield } from '@agentshield/sdk';

   const shield = new AgentShield({
     agentId: 'agent-03',
     ingestToken: process.env.AGENT_SHIELD_INGEST_TOKEN!,
     nearAccountId: 'crawler-01.testnet',
     targetContractId: 'data-oracle.testnet'
   });

   const publishPrice = shield.wrapToolCall(
     'publish_oracle_price',
     'data-oracle.testnet',
     async (args) => { /* Commit price */ }
   );
   ```
4. Run crawler script:
   ```bash
   npm run agent:research
   ```

---

## 4. Integration 3: Treasury NEAR Payment Agent

- **Agent Identity**: `treasury-v1.testnet`
- **Target Contract**: `payment-vault.testnet`
- **Category**: High-Value Treasury & Supplier Settlement
- **Agent ID**: `agent-01`

### Telemetry Coverage
- **Monitored Tool Calls**: `verify_vendor_invoice`, `disburse_vendor_payment`, `rebalance_liquidity_pool`, `emergency_treasury_drain`.
- **Egress Telemetry**: On-chain transfer parameters, recipient account age, codehash changes, and counterparty reputation scores.

### Enforcement Capability
- **Mode**: `ENFORCING` & `APPROVAL_REQUIRED`
- **Policies Enforced**:
  - **FCK Single-Transaction Ceiling**: Hard limit at **5.0 NEAR**. Transfers exceeding 5.0 NEAR are halted before broadcast.
  - **1 YoctoNEAR Rule (Cryptographic Human Sign-off Gate)**: Transfers exceeding 10.0 NEAR or targeting newly created contracts require an attached deposit of **1 yoctoNEAR**, which cannot be generated autonomously by Function Call Keys and mandates human ledger signature.
  - **Counterparty Freshness & Blocklist Verification**: Prevents transfers to accounts created within 24 hours or flagged in shared threat intelligence.

### Permissions & Key Management
- **NEAR Key Type**: Scoped Function Call Access Key with zero Full Access Key capabilities.
- **Receiver ID**: `payment-vault.testnet`.
- **Allowance Budget**: 50.0 NEAR monthly limit.
- **Revocation Endpoint**: Instant key revocation via `/api/agents/agent-01/credentials`.

### Failure Modes & Honest Health Status
- **High-Value Attempt Without Approval**: If the agent attempts a transfer exceeding limits without human cryptographic co-signature, the transaction is placed into the **Approvals Queue** with an expiration timer. If unapproved, the action expires safely without executing.

### Setup Steps
1. Register `Treasury Near Payment Agent` in the **Treasury & Store Operations** workspace.
2. Scope permissions to `payment-vault.testnet` with 5.0 NEAR max per transaction.
3. Configure the `@agentshield/sdk` client:
   ```typescript
   import { AgentShield } from '@agentshield/sdk';

   const shield = new AgentShield({
     agentId: 'agent-01',
     ingestToken: process.env.AGENT_SHIELD_INGEST_TOKEN!,
     nearAccountId: 'treasury-v1.testnet',
     targetContractId: 'payment-vault.testnet',
     maxNearPerTransaction: 5.0,
     blockedDestinations: ['attacker-drain.testnet', 'untrusted-drain.testnet']
   });
   ```
4. Run settlement execution:
   ```bash
   npm run agent:payment
   ```

---

## 5. Ingest Credential Security Architecture

1. **Generation**: Generated randomly using 32 bytes of cryptographic entropy (`ash_live_<64_hex_chars>`).
2. **Display**: Shown to the operator **exactly once** upon initial registration or rotation.
3. **Storage**: Only the **SHA-256 cryptographic digest** is stored in the database (`agent_credentials.token_hash`). Raw tokens are never persisted in plaintext.
4. **Masking**: For UI display, tokens are formatted as `ash_live_xxxx****************yyyy`.
5. **Rotation & Revocation**:
   - Rotating a token invalidates all prior credentials for that agent and issues a new secret.
   - Revoking a token immediately denies all subsequent ingestion calls with `401 Unauthorized`.

---

## 6. OutLayer: Verifiable Compute & Hardware-Enforced Agent Custody

Per `VERIFIED_FACTS.md` (Section 4), Agent Shield integrates with **OutLayer** for autonomous agents that require absolute key isolation:

### Custody Architecture & Contract Key Derivation (CKD)
- **Zero Raw Key Access**: Agent signing keys are derived dynamically inside Intel TDX Trusted Execution Environments (TEEs). Neither the bot developer, the cloud host, nor Agent Shield operators can extract raw private keys.
- **Hardware-Enforced Execution**: Agent logic executes as WebAssembly (WASM) modules inside TEE enclaves.
- **Cryptographic Attestation**: OutLayer produces hardware-signed attestation reports (NRAS / Intel TDX quotes) proving exact code measurement hashes before authorizing on-chain signing.

### Multi-Chain Policy Constraints
- OutLayer’s embedded enclave policy engine enforces spending limits across 35+ chains (including NEAR Protocol).
- When paired with Agent Shield's `@agentshield/sdk`, outbound function-call requests are pre-screened by Agent Shield's counterparty check before OutLayer signs inside the enclave.

---

## 7. NEAR Testnet Native Identity & Passwordless Wallet Sign-In

Agent Shield supports passwordless operator authentication directly using NEAR Testnet named accounts (e.g. `operator.testnet`):

### Cryptographic Sign-In Flow
1. Operator inputs their NEAR Testnet account ID into the **Auth & Workspace** dialog (`NEAR Testnet Wallet` tab).
2. Agent Shield queries NEAR Testnet RPC (`https://rpc.testnet.near.org`) via `view_account` to verify account existence on testnet consensus.
3. Automatically provisions or binds a tenant session with `role: admin`.
4. Issues an HTTP-only secure session cookie (`agent_shield_session`) with 30-day expiration.
5. All wallet sign-in events are logged to the immutable SHA-256 audit log (`SESSION_AUTHENTICATED`).

