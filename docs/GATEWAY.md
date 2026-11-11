# Agent Shield Security Gateway & Forward Proxy Architecture (Stage 7)

## 1. Overview & Control Point Positioning

Agent Shield enforces security guardrails at two distinct, non-overlapping control points:
1. **Control Point 1 (In-Line SDK Pre-Call Hook)**: Wraps agent tool functions via `@agentshield/sdk`, evaluating parameters and holding execution for human approval before tools invoke contracts or outbound endpoints.
2. **Control Point 2 (Security Gateway / Forward Proxy)**: An HTTP forward proxy (`services/gateway/`) intercepting tool and outbound network traffic (e.g. NEAR RPC JSON-RPC calls, third-party APIs, and webhooks).

```
[ Autonomous AI Agent ]
         |
         | (1. Pre-Call Hook: @agentshield/sdk)
         +---> Evaluates local & remote policies
         |     Holds execution if REQUIRE_APPROVAL is triggered
         |
         v
[ Outbound Tool / RPC Request ]
         |
         v
[ Agent Shield Gateway / Forward Proxy ] (Port 3001 or /api/gateway/proxy)
   ├── A. Policy Engine (Allowed tools, Approved destinations, Spend caps)
   ├── B. Threat Intelligence Blocklist Check
   └── C. SAFE-FAILURE MODE ENFORCER
         │
         ├── [Passed] ----> Forwarded to Upstream (NEAR RPC, Storefront, etc.)
         ├── [Violation] -> HTTP 403 Forbidden (Blocked & Logged)
         └── [Error] -----> HTTP 502/503 Fail-Closed (NO SILENT BYPASS)
```

---

## 2. Documented Safe-Failure Mode (No Silent Bypass)

The Agent Shield Gateway strictly implements a **Fail-Closed** security architecture:

### Principles:
* **Fail-Closed by Default**: If an internal error, unhandled exception, database connection loss, or policy evaluation timeout occurs during inspection, the gateway immediately aborts the connection and returns HTTP `502 Bad Gateway` or `503 Service Unavailable`.
* **Zero Silent Bypass**: Under no circumstance does the gateway forward an uninspected, malformed, or errored request upstream. A system failure must never become a security vulnerability.
* **Audit & Forensic Logging**: Every fail-closed event generates a high-severity alert and is recorded in the immutable audit log with header `x-agentshield-safe-bypass-prevented: true`.

### Error Response Schema:
```http
HTTP/1.1 502 Bad Gateway
Content-Type: application/json
x-agentshield-failure-mode: FAIL_CLOSED
x-agentshield-safe-bypass-prevented: true

{
  "error": "GATEWAY_FAIL_CLOSED_ERROR",
  "message": "Agent Shield Gateway policy inspection failed; failing closed to prevent silent bypass.",
  "details": "<underlying reason>",
  "safeBypassPrevented": true
}
```

---

## 3. Destination Enforcement Rules

The Gateway inspects outbound destinations extracted from:
* The `x-target-destination` HTTP header.
* The HTTP request target URL / `Host` header.
* Inbound JSON bodies (e.g., `receiver_id`, `destination`, or `targetContractId`).

### Policy Evaluation:
1. **Blocklisted Destinations**:
   * If the target is in the community threat intelligence blocklist (e.g., `attacker-drain.testnet`, `untrusted-drain.testnet`), the gateway immediately rejects the call with HTTP `403 Forbidden` (`BLOCKED_BY_GATEWAY_POLICY`).
2. **Approved Allowlist**:
   * If an allowlist is defined for the agent or workspace, destinations not matching the allowlist are rejected with HTTP `403 Forbidden`.
3. **Approved Destinations**:
   * Allowed traffic is forwarded to the upstream destination, streaming the response back to the agent client.

---

## 4. Approvals Queue Integration (Real Action Holding)

When a policy rule with outcome `REQUIRE_APPROVAL` is triggered (e.g., transactions exceeding autonomous limits or triggering the 1 yoctoNEAR cryptographic gate):
* The action is placed on hold in the backend `approvals` table.
* The SDK or Gateway client holds execution, polling `/api/approvals/[id]`.
* An operator in the dashboard reviews the hold, verifying parameters and counterparty risk.
* **On Approval**: The operator submits a 1 yoctoNEAR deposit authorization. The holding loop detects approval and unblocks the action.
* **On Denial**: The operator rejects the action. The holding loop unblocks and throws `ApprovalDeniedError`.
* **On Expiry**: If unaddressed within the configured timeout window, the hold expires and throws `ApprovalExpiredError`.

---

## 5. Observe-Only Real Capability Constraint

Per PRD Section 21 and FR-15:
* If an agent is connected via passive webhooks or has status `OBSERVE_ONLY`, the system **never makes false claims of enforcement**.
* When an observe-only agent triggers a rule configured for `BLOCK` or `REQUIRE_APPROVAL`, the policy engine automatically detects that enforcement is unavailable.
* The outcome is degraded to `ALERT`. The action is **not** halted, and the dashboard prominently displays:
  > **ENFORCEMENT UNAVAILABLE**: Connected agent is observe-only. Configured rule outcomes default to ALERT instead of halting execution.

