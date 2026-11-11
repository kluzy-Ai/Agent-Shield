import { NextRequest, NextResponse } from 'next/server';
import { getInitializedDatabase } from '@/lib/db/database';
import { validateIngestToken, checkRateLimit } from '@/lib/db/access-layer';
import { appendAuditLog } from '@/lib/db/audit';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const customHeader = req.headers.get('x-agent-key');
    let rawToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    } else if (customHeader) {
      rawToken = customHeader.trim();
    }

    if (!rawToken) {
      return NextResponse.json(
        { error: 'Missing ingest credential. Provide Authorization: Bearer <ash_live_token> header.' },
        { status: 401 }
      );
    }

    const db = await getInitializedDatabase();
    const auth = validateIngestToken(db, rawToken);

    if (!auth) {
      return NextResponse.json(
        { error: 'Invalid, expired, or revoked ingest token.' },
        { status: 401 }
      );
    }

    // Rate Limiting (120 events / minute per agent token)
    const rateCheck = checkRateLimit(auth.credentialId, 120, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Telemetry ingestion rate limit exceeded. Max 120 events/min.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      id: eventId,
      eventType = 'TOOL_CALL',
      toolName,
      actionType,
      destination,
      payloadSummary,
      enforcementOutcome = 'ALLOWED',
      riskLevel = 'LOW',
      signalsTriggered = [],
      counterpartySignals,
      rawRedactedPayload,
      isSimulated = false,
      timestamp
    } = body;

    // Schema Validation
    if (!destination || !payloadSummary) {
      return NextResponse.json(
        { error: 'Schema validation error: destination and payloadSummary are required.' },
        { status: 400 }
      );
    }

    const allowedOutcomes = ['ALLOWED', 'FLAGGED', 'PAUSED', 'BLOCKED'];
    if (!allowedOutcomes.includes(enforcementOutcome)) {
      return NextResponse.json(
        { error: `Invalid enforcementOutcome. Must be one of: ${allowedOutcomes.join(', ')}` },
        { status: 400 }
      );
    }

    const allowedRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!allowedRisks.includes(riskLevel)) {
      return NextResponse.json(
        { error: `Invalid riskLevel. Must be one of: ${allowedRisks.join(', ')}` },
        { status: 400 }
      );
    }

    const finalEventId = eventId || `evt-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`;
    const eventTimestamp = timestamp || new Date().toISOString();
    const now = new Date().toISOString();

    // Idempotency: Deduplicate by eventId
    const existing = db.prepare('SELECT id FROM telemetry_events WHERE id = ?').get(finalEventId);
    if (existing) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        eventId: finalEventId,
        message: 'Telemetry event already ingested (idempotent duplicate).'
      });
    }

    // Dynamic Policy Enforcement: If agent is PAUSED, halt tool execution
    let finalOutcome = enforcementOutcome;
    let finalSummary = payloadSummary;

    if (auth.agentStatus === 'PAUSED' && finalOutcome !== 'BLOCKED') {
      finalOutcome = 'PAUSED';
      finalSummary = `[PAUSED AGENT INTERVENTION] Tool execution halted because agent '${auth.agentName}' is currently in PAUSED state.`;
    }

    // Persist Telemetry Event
    db.prepare(`
      INSERT INTO telemetry_events (
        id, workspace_id, agent_id, agent_name, timestamp, event_type,
        tool_name, action_type, destination, payload_summary, enforcement_outcome,
        risk_level, signals_triggered_json, counterparty_signals_json,
        raw_redacted_payload, is_simulated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalEventId,
      auth.workspaceId,
      auth.agentId,
      auth.agentName,
      eventTimestamp,
      eventType,
      toolName || null,
      actionType || toolName || 'INVOCATION',
      destination,
      finalSummary,
      finalOutcome,
      riskLevel,
      JSON.stringify(signalsTriggered),
      counterpartySignals ? JSON.stringify(counterpartySignals) : null,
      rawRedactedPayload || null,
      isSimulated ? 1 : 0,
      now
    );

    // Update Agent's Last Heartbeat & Credential Last Used
    db.prepare(`
      UPDATE agents
      SET last_heartbeat = ?
      WHERE id = ?
    `).run(eventTimestamp, auth.agentId);

    db.prepare(`
      UPDATE agent_credentials
      SET last_used_at = ?
      WHERE id = ?
    `).run(now, auth.credentialId);

    // Append to Audit Chain if Blocked or Paused
    if (finalOutcome === 'BLOCKED' || finalOutcome === 'PAUSED') {
      appendAuditLog(
        db,
        auth.workspaceId,
        `agent:${auth.agentName}`,
        'TRANSACTION_BLOCKED',
        finalEventId,
        `Enforced ${finalOutcome} on agent '${auth.agentName}' targeting '${destination}'. Risk: ${riskLevel}.`,
        { eventId: finalEventId, tool: toolName, destination, risk: riskLevel }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: finalEventId,
      outcome: finalOutcome,
      agentId: auth.agentId,
      timestamp: eventTimestamp
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ingestion error' },
      { status: 500 }
    );
  }
}
