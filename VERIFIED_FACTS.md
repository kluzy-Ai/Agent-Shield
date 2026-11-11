# Verified Facts & Technical Sources of Truth

This file records verified technical facts, endpoints, contract conventions, package versions, and SDK details verified directly against official documentation. Per Anti-Hallucination Rule #1, every external integration fact is verified and logged here before use.

---

## 1. Hackathon Details
- **Event**: NEAR HACKATHON
- **Website**: https://nearhackathon.com
- **Track**: `security` (AI Security & Defense)
- **Track Tagline**: *"Trust, but verify"*
- **Track Description**: Build spending limits, policy engines, sandboxed wallets, reputation and scam detection. Give AI money without giving it the keys to everything.
- **Track Hints**: AGENT SECURITY, FUNCTION CALL KEYS, TEE ATTESTATION
- **Track 06 Prompt Link**: https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/06-security.md
- **Submission API**: `POST https://nearhackathon.com/api/applications`
- **Submission Window**: 2026-11-01T00:00:00Z to 2026-11-14T23:59:00Z
- **Sources**:
  - `HACKATHON.md`
  - `https://raw.githubusercontent.com/nearai/near-hackathon-prompt-examples/main/tracks/06-security.md`

---

## 2. NEAR Protocol & Access Key Model
- **Official Docs**: https://docs.near.org/protocol/accounts-contracts/access-keys
- **Access Key Types**:
  1. **Full Access Keys**: Unrestricted account control, transfers, key rotation, contract deployment. Agents must NEVER be granted Full Access Keys for autonomous execution.
  2. **Function Call Keys (FCK)**:
     - Scoped strictly to one contract account (`receiver_id`).
     - Optional list of permitted method names (`method_names`).
     - Specific gas and transaction fee budget (`allowance` in NEAR).
     - Consensus-enforced restriction: CANNOT transfer native NEAR tokens out of the account.
- **Function Call Key Protocol Caveats (Crucial Security Limits)**:
  - An account holding only function-call keys cannot transfer NEAR or add new keys.
  - An account can **lock itself out** if the gas allowance runs out.
  - FCK transactions cannot attach deposits greater than 0 without triggering wallet/full-access approval.
- **The 1 YoctoNEAR Rule**:
  - Protocol Consensus: Because Function Call Keys are prohibited by consensus from transferring native NEAR tokens, attaching an explicit deposit of `1 yoctoNEAR` (`1e-24 NEAR`) guarantees that the transaction cannot be signed autonomously by an FCK.
  - It forces the transaction to prompt for full human wallet sign-off, making it an unbypassable cryptographic approval gate.
- **Sources**:
  - https://docs.near.org/concepts/basics/accounts/access-keys
  - https://nomicon.io/DataStructures/AccessKey

---

## 3. NEAR AI Cloud API & TEE Attestation Verification
- **Official Portal**: https://cloud.near.ai
- **Official Docs**: https://docs.near.ai/ & https://docs.near.ai/cloud/verification
- **Hardware Enclaves**: AI models execute inside Trusted Execution Environments (TEEs) on Intel TDX CPUs and NVIDIA Confidential Computing GPUs.
- **Cryptographic Attestation**:
  - Every inference response can return a hardware-signed attestation quote (e.g., NVIDIA Remote Attestation Service NRAS or Intel TDX quote).
  - Proves that the code running in the enclave matches the expected image hash and has not been tampered with or inspected by the host provider.
  - Verification toolkit: `nearai-cloud-verifier` for Python/TypeScript allows verifying attestation reports independently.
- **Source**: https://docs.near.ai/cloud/verification

---

## 4. OutLayer: Verifiable Execution & Agent Custody
- **Official URL**: https://app.outlayer.ai / https://outlayer.ai
- **Official Docs**: https://app.outlayer.ai/docs/getting-started
- **Agent Custody & Wallets**:
  - Multi-chain wallet management across 35+ chains (including NEAR) for autonomous AI agents.
  - Keys live exclusively inside hardware-enforced TEEs (Intel TDX).
  - Built-in policy engines enforce transfer and swap constraints.
- **Verifiable Compute**:
  - Logic executes as WebAssembly (WASM) modules inside TEE enclaves.
  - Produces verifiable cryptographic TEE attestations proving inputs and code execution.
- **Contract Key Derivation (CKD)**: Master signing keys are derived inside the enclave, ensuring no human or operator can access raw private keys.
- **Source**: https://app.outlayer.ai/docs/getting-started & https://skills.outlayer.ai/agent-custody/SKILL.md

---

## 5. near-api-js & NEAR Testnet Account Creation
- **Official Docs**: https://docs.near.org/tools/near-api-js/quick-reference
- **Verified Package**: `near-api-js@7.4.0`
- **Network Endpoints**:
  - Testnet RPC: `https://rpc.testnet.near.org`
  - Testnet Archival RPC: `https://archival-rpc.testnet.near.org`
  - Helper Service: `https://helper.testnet.near.org`
- **Key Generation & Account Creation**:
  ```javascript
  import { connect, KeyPair, keyStores, utils } from 'near-api-js';
  const keyPair = KeyPair.fromRandom('ed25519');
  const publicKey = keyPair.getPublicKey().toString();
  // Created on-chain via creator account with initial testnet funding:
  await creatorAccount.createAccount(newAccountId, publicKey, utils.format.parseNearAmount('0.1'));
  ```
- **Source**: https://docs.near.org/tools/near-api-js/quick-reference

---

## 6. Local Persistence & Cryptographic Hashing
- **Argon2 Password Hashing**:
  - Package: `argon2` v0.45.1
  - Verified default variant: `argon2id` (RFC 9106 recommended, resistant against side-channel and GPU-assisted brute-force attacks).
  - Methods: `argon2.hash(password)` and `argon2.verify(hash, password)`.
  - Source: https://www.npmjs.com/package/argon2 & RFC 9106.
- **Node.js Native Embedded SQLite (`node:sqlite`)**:
  - Native module in Node.js v22/24: `import { DatabaseSync } from 'node:sqlite';`
  - High performance synchronous SQLite engine with zero third-party C++ build prerequisites.
  - Source: https://nodejs.org/api/sqlite.html

