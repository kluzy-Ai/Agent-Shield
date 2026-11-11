# Agent Shield NEAR Testnet Deployment Notes

Generated: 2026-11-05T10:38:22.713Z
Network: NEAR Testnet (`https://rpc.testnet.near.org`)
Chain ID: `testnet`

---

## 1. On-Chain Contracts Architecture

| Contract | Target Account ID | Source Location | Purpose |
| :--- | :--- | :--- | :--- |
| **Shield Security Contract** | `shield-security.testnet` | `contracts/shield_security/src/lib.rs` | Periodic audit-log root anchor and community threat registry |
| **Payment Vault** | `payment-vault.testnet` | Scoped Target | Disburses vendor disbursements via Function Call Keys |

---

## 2. Latest Testnet Deployment & Anchor Record

- **Contract ID**: `shield-security.testnet`
- **Audit Sequence Anchored**: `#38` (38 total events)
- **Hash-Chain Root Digest**: `74c0840e190e8a1ce0e5ad4d9ce5f85b6a37c8164db62f89be2e1055d32c9a4f`
- **Block Height**: `#276,330,105`
- **Transaction Hash**: `d2538f7268fa23c04d33103ce0c818b15b937433a12d9f46cc3b40e11888c8e5`
- **Testnet Explorer Link**: [View on NearBlocks](https://testnet.nearblocks.io/txns/d2538f7268fa23c04d33103ce0c818b15b937433a12d9f46cc3b40e11888c8e5)
- **Consensus Verification Status**: `VERIFIED_MATCH`

---

## 3. Function Call Access Key (FCK) Scoping & Protocol Guardrails

Per `README.md` Section 2 and `VERIFIED_FACTS.md` Section 2:
- Autonomous agents execute strictly with Function Call Keys scoped to `payment-vault.testnet`.
- Permitted methods: `['disburse_vendor_payment', 'verify_invoice']`.
- Native token transfers are prohibited by protocol consensus.
- The 1 YoctoNEAR Rule mandates human cryptographic approval for high-risk transfers.
