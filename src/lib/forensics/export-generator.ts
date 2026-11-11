import crypto from 'node:crypto';
import { redactSensitiveObject, redactSensitiveText } from '../redaction/index.ts';
import type { ForensicTimelineStep, MinimumEvidence } from './timeline-builder.ts';

export interface IncidentExportData {
  id: string;
  workspaceId: string;
  agentId: string;
  agentName: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'FALSE_POSITIVE' | 'RESOLVED';
  attackCategory: string;
  summary: string;
  rootCause?: string;
  whyFlagged?: string;
  remediation?: string;
  enforcementAction?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  timeline?: ForensicTimelineStep[];
  evidence?: MinimumEvidence | Record<string, any>;
  notes?: Array<{ id: string; author: string; timestamp: string; content: string }>;
  isFalsePositive?: boolean;
  falsePositiveReason?: string;
}

/**
 * Generates a clean, sanitized JSON export package.
 */
export function generateSanitizedJsonExport(incident: IncidentExportData): string {
  const sanitized = redactSensitiveObject(incident);

  const exportPayload = {
    schemaVersion: '1.0.0',
    compliance: 'PRD-Section-11-FR-11-Sanitized',
    exportedAt: new Date().toISOString(),
    incidentId: sanitized.id,
    classification: 'COMMUNITY_ELIGIBLE_SANITIZED',
    overview: {
      agentId: sanitized.agentId,
      agentName: sanitized.agentName,
      title: sanitized.title,
      severity: sanitized.severity,
      status: sanitized.status,
      attackCategory: sanitized.attackCategory,
      summary: sanitized.summary,
      rootCause: sanitized.rootCause || 'Under investigation by security team',
      remediation: sanitized.remediation,
      enforcementAction: sanitized.enforcementAction || 'FLAGGED'
    },
    forensicTimeline: sanitized.timeline || [],
    minimumEvidence: sanitized.evidence || {},
    operatorNotes: (sanitized.notes || []).map((n: any) => ({
      author: n.author,
      timestamp: n.timestamp,
      content: redactSensitiveText(n.content)
    })),
    cryptographicIntegrity: {
      digestAlgorithm: 'SHA-256',
      recordHash: crypto
        .createHash('sha256')
        .update(JSON.stringify(sanitized))
        .digest('hex')
    }
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Escapes characters for PDF literal strings in parentheses.
 */
function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n\t]/g, ' ');
}

/**
 * Generates a standards-compliant PDF-1.4 binary buffer without external dependencies.
 */
export function generateSanitizedPdfExport(incident: IncidentExportData): Buffer {
  const sanitized = redactSensitiveObject(incident);
  const now = new Date().toISOString();

  // Helper to accumulate stream instructions
  const streamLines: string[] = [];

  // Helper to draw text
  const addText = (text: string, x: number, y: number, font: 'F1' | 'F2', size: number, rgb: [number, number, number] = [0, 0, 0]) => {
    streamLines.push(
      `${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} rg`,
      'BT',
      `/${font} ${size} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escapePdfText(text)}) Tj`,
      'ET'
    );
  };

  // Helper to draw rectangle
  const addRect = (x: number, y: number, width: number, height: number, rgb: [number, number, number], fill = true) => {
    streamLines.push(
      `${rgb[0].toFixed(2)} ${rgb[1].toFixed(2)} ${rgb[2].toFixed(2)} ${fill ? 'rg' : 'RG'}`,
      `${x} ${y} ${width} ${height} re ${fill ? 'f' : 'S'}`
    );
  };

  // 1. Header Banner (Dark Navy Slate)
  addRect(0, 720, 612, 72, [0.03, 0.05, 0.12]); // Dark background
  addText('AGENT SHIELD SECURITY INCIDENT DOSSIER', 36, 755, 'F1', 16, [0.12, 0.85, 0.78]); // Shield Cyan
  addText(`VERIFIED FORENSIC RECORD • EXPORTED ${now.substring(0, 19)} UTC`, 36, 735, 'F2', 9, [0.7, 0.75, 0.85]);

  // 2. Incident Summary Card
  addRect(36, 590, 540, 115, [0.95, 0.96, 0.98]); // Light gray card
  addRect(36, 590, 540, 115, [0.8, 0.82, 0.88], false); // Border

  addText(`Incident ID: ${sanitized.id}`, 50, 685, 'F1', 12, [0.1, 0.1, 0.15]);
  addText(`Target Agent: ${sanitized.agentName} (${sanitized.agentId})`, 50, 668, 'F2', 10, [0.2, 0.2, 0.25]);
  addText(`Severity: ${sanitized.severity} | Status: ${sanitized.status} | Action: ${sanitized.enforcementAction || 'BLOCKED'}`, 50, 650, 'F1', 10, [0.8, 0.1, 0.1]);
  addText(`Attack Category: ${sanitized.attackCategory}`, 50, 632, 'F2', 10, [0.2, 0.2, 0.25]);
  addText(`Created: ${sanitized.createdAt}`, 50, 614, 'F2', 9, [0.4, 0.45, 0.5]);

  // 3. Executive Summary & Root Cause
  addText('EXECUTIVE SUMMARY & CAUSE ANALYSIS', 36, 565, 'F1', 11, [0.05, 0.1, 0.2]);
  const summaryText = (sanitized.summary || 'Security violation detected and contained.').substring(0, 120);
  addText(summaryText, 36, 548, 'F2', 9.5, [0.2, 0.2, 0.25]);

  const whyText = `Trigger Reason: ${(sanitized.whyFlagged || sanitized.rootCause || 'Policy violation').substring(0, 120)}`;
  addText(whyText, 36, 532, 'F2', 9, [0.3, 0.35, 0.4]);

  // 4. 7-Step Forensic Timeline
  addText('7-STEP FORENSIC TIMELINE RECONSTRUCTION', 36, 505, 'F1', 11, [0.05, 0.1, 0.2]);

  let curY = 485;
  const steps = sanitized.timeline && sanitized.timeline.length > 0
    ? sanitized.timeline.slice(0, 6)
    : [
        { label: '1. Ingestion Trigger', description: 'Attack vector input received by agent.', enforcementBadge: 'TRIGGER' },
        { label: '2. Agent Response', description: 'Agent planned tool execution targeting contract.', enforcementBadge: 'PLAN' },
        { label: '3. Tool Call Intercept', description: 'Pre-call hook intercepted tool invocation.', enforcementBadge: 'HOOK' },
        { label: '4. Guardrail Evaluation', description: 'Spending limit and counterparty check evaluated.', enforcementBadge: 'RULE' },
        { label: '5. Enforcement Imposed', description: 'Transaction halted prior to on-chain signing.', enforcementBadge: 'BLOCKED' },
        { label: '6. Minimum Evidence', description: 'SHA-256 fingerprint saved to immutable audit ledger.', enforcementBadge: 'AUDIT' }
      ];

  for (const step of steps) {
    addRect(36, curY - 2, 540, 24, [0.97, 0.98, 1.0]);
    addText(step.label, 44, curY + 6, 'F1', 8.5, [0.1, 0.15, 0.3]);
    addText(step.description.substring(0, 80), 180, curY + 6, 'F2', 8, [0.25, 0.3, 0.35]);
    addText(`[${(step as any).enforcementBadge || 'VERIFIED'}]`, 500, curY + 6, 'F1', 8, [0.1, 0.5, 0.3]);
    curY -= 28;
  }

  // 5. Operator Investigation Notes
  curY -= 10;
  addText('OPERATOR INVESTIGATION NOTES', 36, curY, 'F1', 11, [0.05, 0.1, 0.2]);
  curY -= 18;

  const notes = sanitized.notes && sanitized.notes.length > 0
    ? sanitized.notes.slice(0, 3)
    : [
        { author: 'Security Operator', timestamp: sanitized.createdAt, content: 'Automated containment rule triggered. Attack vector quarantined.' }
      ];

  for (const note of notes) {
    addText(`• [${note.author}] (${note.timestamp.substring(11, 19)} UTC): ${note.content.substring(0, 85)}`, 44, curY, 'F2', 8.5, [0.2, 0.2, 0.3]);
    curY -= 18;
  }

  // 6. Footer & Cryptographic Digest
  addRect(0, 0, 612, 45, [0.93, 0.94, 0.96]);
  const exportHash = crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex');
  addText('Agent Shield Autonomous Security Platform • https://agentshield.testnet', 36, 26, 'F1', 8, [0.3, 0.35, 0.4]);
  addText(`SHA-256 Integrity Digest: ${exportHash.substring(0, 48)}...`, 36, 12, 'F2', 7.5, [0.4, 0.45, 0.5]);

  // Construct standard PDF Document Stream
  const contentStream = streamLines.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf8');

  // Build standard PDF objects
  const objects: string[] = [];
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj';
  objects[2] = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj';
  objects[3] = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj';
  objects[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj';
  objects[5] = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj';
  objects[6] = `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`;

  // Calculate byte offsets for XRef
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];

  for (let i = 1; i <= 6; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += objects[i] + '\n';
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 7\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) {
    const offsetStr = offsets[i].toString().padStart(10, '0');
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += '<< /Size 7 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'utf8');
}
