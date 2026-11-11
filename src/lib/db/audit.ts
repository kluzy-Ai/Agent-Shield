import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditRecord {
  sequenceNumber: number;
  id: string;
  workspaceId: string;
  timestamp: string;
  actor: string;
  actionType: string;
  resourceId: string;
  summary: string;
  details: Record<string, any>;
  prevHash: string;
  entryHash: string;
  isVerified: boolean;
}

export function computeAuditEntryHash(
  sequenceNumber: number,
  timestamp: string,
  workspaceId: string,
  actor: string,
  actionType: string,
  prevHash: string,
  summary: string
): string {
  const payload = `${sequenceNumber}:${timestamp}:${workspaceId}:${actor}:${actionType}:${prevHash}:${summary}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function appendAuditLog(
  db: DatabaseSync,
  workspaceId: string,
  actor: string,
  actionType: string,
  resourceId: string,
  summary: string,
  details: Record<string, any> = {}
): AuditRecord {
  // Query latest entry for this specific workspace
  const stmtLatest = db.prepare(`
    SELECT sequence_number, entry_hash
    FROM audit_logs
    WHERE workspace_id = ?
    ORDER BY sequence_number DESC
    LIMIT 1
  `);
  const latest = stmtLatest.get(workspaceId) as { sequence_number: number; entry_hash: string } | undefined;

  const prevHash = latest ? latest.entry_hash : GENESIS_HASH;
  const nextSeq = latest ? latest.sequence_number + 1 : 1;
  const timestamp = new Date().toISOString();
  const id = `aud-${workspaceId.replace('ws-', '')}-${nextSeq.toString().padStart(4, '0')}`;
  const detailsJson = JSON.stringify(details);

  const entryHash = computeAuditEntryHash(
    nextSeq,
    timestamp,
    workspaceId,
    actor,
    actionType,
    prevHash,
    summary
  );

  const stmtInsert = db.prepare(`
    INSERT INTO audit_logs (
      sequence_number, id, workspace_id, timestamp, actor,
      action_type, resource_id, summary, details_json, prev_hash, entry_hash, is_verified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  stmtInsert.run(
    nextSeq,
    id,
    workspaceId,
    timestamp,
    actor,
    actionType,
    resourceId,
    summary,
    detailsJson,
    prevHash,
    entryHash
  );

  return {
    sequenceNumber: nextSeq,
    id,
    workspaceId,
    timestamp,
    actor,
    actionType,
    resourceId,
    summary,
    details,
    prevHash,
    entryHash,
    isVerified: true
  };
}

export function verifyAuditChain(
  db: DatabaseSync,
  workspaceId: string
): { isValid: boolean; totalEntries: number; error?: string } {
  const stmtAll = db.prepare(`
    SELECT sequence_number, id, workspace_id, timestamp, actor,
           action_type, resource_id, summary, details_json, prev_hash, entry_hash, is_verified
    FROM audit_logs
    WHERE workspace_id = ?
    ORDER BY sequence_number ASC
  `);

  const entries = stmtAll.all(workspaceId) as any[];

  if (entries.length === 0) {
    return { isValid: true, totalEntries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];

    // 1. Check prevHash link
    if (i === 0) {
      if (current.prev_hash !== GENESIS_HASH) {
        return {
          isValid: false,
          totalEntries: entries.length,
          error: `Genesis block ${current.id} prev_hash mismatch: expected ${GENESIS_HASH}, got ${current.prev_hash}`
        };
      }
    } else {
      const prev = entries[i - 1];
      if (current.prev_hash !== prev.entry_hash) {
        return {
          isValid: false,
          totalEntries: entries.length,
          error: `Block link broken at sequence ${current.sequence_number} (${current.id}): prev_hash does not match prior entry_hash.`
        };
      }
    }

    // 2. Recompute hash to verify data integrity (detect tampering)
    const expectedHash = computeAuditEntryHash(
      current.sequence_number,
      current.timestamp,
      current.workspace_id,
      current.actor,
      current.action_type,
      current.prev_hash,
      current.summary
    );

    if (current.entry_hash !== expectedHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        error: `Cryptographic tamper detected at sequence ${current.sequence_number} (${current.id}): entry_hash does not match recomputed SHA-256 digest.`
      };
    }
  }

  return { isValid: true, totalEntries: entries.length };
}
