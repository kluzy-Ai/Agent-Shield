# Design Contract: Agent Shield

**Version**: 1.0.0  
**Status**: Active  
**Product**: Agent Shield (NEAR Hackathon — AI Security & Defense Track)

---

## 1. Visual Aesthetics & Philosophy

Agent Shield is an institutional-grade AI security operations and trust platform. The aesthetic is clean, high-density, authoritative, and cyber-resilient, designed for developers, operators, and security researchers.

### 1.1 Color Tokens (Dark Mode First)
- **Background Root**: `hsl(224, 71%, 4%)` (`#030712` - Deep obsidian slate)
- **Surface / Card Base**: `hsl(222, 47%, 11%)` (`#0f172a` - Midnight navy)
- **Surface Elevated / Glass**: `hsla(222, 47%, 16%, 0.7)` with `backdrop-filter: blur(12px)`
- **Border Default**: `hsl(217, 33%, 17%)` (`#1e293b`)
- **Border Focused / Active**: `hsl(217, 91%, 60%)` (`#3b82f6`)

### 1.2 Accent Tokens
- **Brand / Cyan**: `hsl(187, 92%, 45%)` (`#06b6d4` - Shield Cyan)
- **NEAR Emerald**: `hsl(160, 84%, 39%)` (`#059669` - Active / Verified)
- **Alert Amber**: `hsl(38, 92%, 50%)` (`#f59e0b` - Warning / Needs Review / Approval)
- **Critical Rose**: `hsl(350, 89%, 60%)` (`#f43f5e` - Blocked / Malicious / Critical)
- **Subtle Violet**: `hsl(263, 70%, 50%)` (`#8b5cf6` - AI Reasoning / Telemetry)

### 1.3 Typography
- **Primary Font**: `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Font (Keys, Hashes, Events)**: `'JetBrains Mono', 'Fira Code', Menlo, monospace`
- **Headings**:
  - `h1`: 28px (1.75rem), Semi-Bold (600), tracking tight (-0.02em)
  - `h2`: 20px (1.25rem), Semi-Bold (600), tracking tight (-0.01em)
  - `h3`: 16px (1rem), Medium (500)
- **Body**: 14px (0.875rem), Regular (400), leading relaxed (1.5)
- **Caption / Meta**: 12px (0.75rem), Regular (400), muted foreground

---

## 2. Status & Badge Enforcement Taxonomy

To comply with **Anti-Hallucination Rule #3** and **PRD Sections 11, 12, 22**, the UI must **never** claim protection that isn't real.

### 2.1 Agent Protection State
| State | Badge Color | Definition |
| --- | --- | --- |
| `ENFORCING` | Emerald Green | Agent actions route through an active gateway or instrumented SDK with verified blocking power. |
| `APPROVAL_REQUIRED` | Amber Orange | High-impact actions are held pending explicit human cryptographic or dashboard sign-off. |
| `OBSERVE_ONLY` | Sky Blue | Telemetry is ingested and analyzed, but the platform CANNOT intervene or stop actions. |
| `LIMITED_VISIBILITY` | Warm Yellow | Agent is connected, but significant tool calls or egress paths lack telemetry instrumentation. |
| `DISCONNECTED` | Rose Red | Heartbeat failed or credentials revoked. Monitoring is completely offline. |

### 2.2 Telemetry Action Outcomes
| Action Badge | Definition | Enforcement Condition |
| --- | --- | --- |
| `ALLOWED` | Normal operation within policy boundaries. | Action permitted. |
| `FLAGGED` | Anomaly or policy warning detected. | Observed and recorded; execution proceeded. |
| `PAUSED` | Suspicious behavior suspended execution. | Enforceable gateway/hook paused the process. |
| `BLOCKED` | Malicious or unauthorized action terminated. | **Only shown if execution was actually prevented!** |

### 2.3 Coverage Gap Callout Component
Every agent detail page and telemetry view MUST include a **Coverage Transparency Card**:
- Lists exact unmonitored egress channels
- Lists non-enforceable tools
- Explicitly states: *"Observe-only mode active for Tool X: Policy violations will trigger alerts but cannot halt execution."*

---

## 3. Component Architecture & Design Patterns

1. **Dashboard Shell**:
   - Left Navigation Rail (Collapsible, responsive, with track identifier and network badge `NEAR Testnet`).
   - Global Top Bar (Workspace selector, real-time threat feed badge, Testnet wallet status, documentation link).
   - Main Content Canvas (Grid-based, max-w-7xl, clean responsive padding).
2. **Cards & Containers**:
   - Thin 1px subtle borders (`#1e293b`).
   - Slight gradient highlights (`linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)`).
   - Hover elevation with subtle border color transitions.
3. **Empty States**:
   - Contextual illustration/iconography.
   - Plain-language explanation of what connects here.
   - Direct primary action button (e.g., "Connect Agent", "Define First Policy").
4. **Loading States**:
   - Subtle pulse skeletons matching card geometries; no generic spinners.
5. **Error States**:
   - Clear diagnostic banner, actionable recovery button, copyable debug ID.

---

## 4. Voice, Tone & Messaging Guardrails

- **Tagline**: *"Connect. Monitor. Detect. Control. Learn."*
- **Positioning**: *"Continuous monitoring and configurable protection for supported integrations."*
- **Forbidden Phrases**: *"100% Secure"*, *"Unstoppable AI Protection"*, *"Complete Safety Guarantee"*.
- **Required Honesty**: Clearly explain what is verified vs inferred. If telemetry is mocked or simulated, a clear UI badge indicates `[SIMULATION / TEST VECTOR]`.
