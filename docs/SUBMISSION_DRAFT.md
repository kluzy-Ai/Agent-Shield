# NEAR HACKATHON: Draft Submission Payload & X Post

> ⚠️ **IMPORTANT COMPLIANCE NOTICE**:  
> Per hackathon rules and explicit system instructions: **DO NOT POST, PUSH, PUBLISH THE REPOSITORY, OR SUBMIT AUTOMATICALLY.**  
> This file contains the pre-validated draft payload with placeholders for human review and decision.

---

## 1. Draft Public X (Twitter) Demo Post

**To be published by the human lead from their personal or team X account**:

```text
How do you let an autonomous AI agent spend treasury funds without risking a prompt injection drain? 💸🤖

We built Agent Shield at the #NEARHackathon to solve this!

Instead of giving AI agents dangerous Full Access Keys, Agent Shield enforces @NEARProtocol Function-Call Access Keys scoped strictly to approved contracts and spending ceilings. When an adversary attempts an unauthorized drain, our Counterparty Check Service stops the signature in under 10ms. For privileged transfers, we leverage NEAR's 1-yoctoNEAR consensus rule to enforce human cryptographic approval.

Plus: append-only hash-chained audit logs anchored on NEAR Testnet, Intel TDX confidential LLM detection via NEAR AI Cloud, and a decentralized threat registry.

Give AI money without giving it the keys to everything. 🛡️

Demo video & walkthrough below ⬇️
GitHub: [PLACEHOLDER_PUBLIC_GITHUB_REPO_URL]

What security guardrails do you need before trusting autonomous agents with real money? Let us know!

@NEARProtocol @NearLegion @NearBuilders #NEARHackathon #NEAR #AIAgents #Web3Security
```

---

## 2. API Submission Payload (JSON Contract)

**Target Endpoint**: `POST https://nearhackathon.com/api/applications`  
**Headers**: `Content-Type: application/json`

```json
{
  "requestId": "[PLACEHOLDER_GENERATE_UUID_V4]",
  "projectName": "Agent Shield",
  "leadName": "[PLACEHOLDER_TEAM_LEAD_NAME]",
  "email": "[PLACEHOLDER_CONTACT_EMAIL]",
  "size": "1",
  "tracks": [
    "security",
    "business",
    "agents"
  ],
  "nearAddress": "[PLACEHOLDER_MAINNET_PAYOUT_ACCOUNT].near",
  "projectUrl": "[PLACEHOLDER_PUBLIC_GITHUB_REPO_URL]",
  "demoUrl": "[PLACEHOLDER_PUBLIC_X_POST_URL]",
  "idea": "Autonomous AI agents managing treasury, customer refunds, or trading are vulnerable to prompt injection, unauthorized contract calls, and wallet drains. Agent Shield is an institutional security guardrail layer that protects autonomous agents without relying on continuous human supervision. NEAR Protocol is central to our security architecture in five concrete ways: (1) Agents are restricted to Function-Call Access Keys (FCKs) scoped strictly to approved receiver contracts, methods, and spending ceilings—eliminating Full Access Key drain risks; (2) Privileged or high-value transfers attach an explicit deposit of 1 yoctoNEAR, triggering protocol-level consensus that forces transactions into a human authorization queue; (3) A real-time Counterparty Check Service analyzes contract code hashes, account age, and interaction histories via NEAR RPC in under 10ms; (4) Local SHA-256 hash-chained audit ledgers are anchored periodically onto NEAR Testnet Rust smart contracts; and (5) Hardware-attested confidential LLM detection via NEAR AI Cloud in Intel TDX enclaves with honest deterministic fallback. Agent Shield proves you can give AI money without giving it the keys to everything.",
  "consent": true
}
```

---

## 3. Human Checklist Before Submission

1. [ ] Make repository public on GitHub.
2. [ ] Verify README is present and all tests pass with `npm test`.
3. [ ] Record the 90-second demo following [`docs/DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
4. [ ] Post the demo on X, tag `@NEARProtocol` and `#NEARHackathon`, and copy the live tweet URL into `"demoUrl"`.
5. [ ] Enter your team lead name, contact email, team size, and mainnet payout address (`team.testnet`).
6. [ ] Generate a fresh UUID via `node -e 'console.log(crypto.randomUUID())'` and paste into `"requestId"`.
7. [ ] Confirm the verbatim consent statement: *"I agree that the organizers may use these details to review our submission and contact us about this hackathon."*
8. [ ] Execute the POST request via curl or via the web form at `https://nearhackathon.com/#apply`.

