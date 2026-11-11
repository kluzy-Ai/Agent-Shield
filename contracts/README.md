# NEAR Smart Contracts: /contracts

This directory contains the on-chain security contracts for Agent Shield on NEAR Protocol.

## Architecture & Responsibilities

1. **`shield_vault` Contract**:
   - Holds treasury funds and receives payment requests from autonomous agents.
   - Enforces spending caps (max NEAR per transaction and max NEAR per hour).
   - Validates that caller is holding an authenticated Function Call Key.
   - **Enforces 1 YoctoNEAR Rule**: Any withdrawal or recipient modification requires an attached deposit of exactly `1 yoctoNEAR`, forcing full wallet prompt confirmation from human admins.

2. **`threat_registry` Contract**:
   - An on-chain registry of reported malicious agent counterparties and prompt injection attack vectors.
   - Allows agents to query whether a receiver address is flagged prior to signing.
