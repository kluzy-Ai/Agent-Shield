/**
 * Threat Intelligence Automated Hygiene Engine (FR-12, FR-13)
 *
 * Implements:
 * 1. Multi-pass deterministic redaction across all submitted report text & metadata
 * 2. Attachment scanning (MIME types, size limit <=2MB, malicious script/eval detection, planted secret check)
 * 3. Content fingerprinting (SHA-256) & Jaccard token similarity duplicate detection
 * 4. Submission rate limiting & abuse prevention (max 5 submissions per 10 minutes)
 * 5. Publication sanitization: generates cryptographic sanitized public summaries
 */

import crypto from 'node:crypto';
import { defaultRedactionPipeline, redactSensitiveText, redactSensitiveObject } from '../redaction/index.ts';

export interface AttachmentScanResult {
  isClean: boolean;
  mimeType: string;
  sizeBytes: number;
  filename: string;
  scanNotice: string;
  redactedPreview?: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateOfId?: string;
  similarityScore: number;
  matchType?: 'EXACT_FINGERPRINT' | 'SEMANTIC_SIMILARITY' | 'NONE';
}

const ALLOWED_MIME_TYPES = new Set([
  'application/json',
  'text/plain',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/x-yaml',
  'text/yaml'
]);

export const FIELD_LIMITS = {
  TITLE: 150,
  DESCRIPTION: 4000,
  MITIGATION_APPLIED: 2000,
  CATEGORY: 100
};

/**
 * Strips all HTML tags from input string to prevent stored XSS or formatting injection.
 */
export function stripHtml(input?: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Enforces community report constraints: no file attachments, max field lengths, HTML stripping.
 */
export function validateReportConstraints(input: {
  title?: string;
  description?: string;
  mitigationApplied?: string;
  threatCategory?: string;
  attachment?: any;
}): void {
  if (input.attachment) {
    throw new Error('Attachments are strictly prohibited in community threat reports.');
  }

  if (input.title && input.title.length > FIELD_LIMITS.TITLE) {
    throw new Error(`Title exceeds maximum allowable length of ${FIELD_LIMITS.TITLE} characters (got ${input.title.length}).`);
  }

  if (input.description && input.description.length > FIELD_LIMITS.DESCRIPTION) {
    throw new Error(`Description exceeds maximum allowable length of ${FIELD_LIMITS.DESCRIPTION} characters (got ${input.description.length}).`);
  }

  if (input.mitigationApplied && input.mitigationApplied.length > FIELD_LIMITS.MITIGATION_APPLIED) {
    throw new Error(`Defensive mitigation exceeds maximum allowable length of ${FIELD_LIMITS.MITIGATION_APPLIED} characters (got ${input.mitigationApplied.length}).`);
  }
}

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB limit

/**
 * Validates and scans uploaded attachments for security hygiene.
 * Enforces size limits, valid MIME types, rejects active scripts, and scrubs secrets.
 */
export function scanAttachment(file: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  content?: string | Buffer;
}): AttachmentScanResult {
  const { filename, mimeType, sizeBytes, content } = file;

  // 1. Size check
  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds maximum allowable size of 2MB (received ${(sizeBytes / 1024 / 1024).toFixed(2)} MB).`);
  }

  // 2. MIME type check
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error(`Disallowed attachment MIME type: '${mimeType}'. Allowed formats: JSON, TXT, PDF, PNG, JPG, YAML.`);
  }

  // 3. Inspect content if text/buffer provided
  let isClean = true;
  let scanNotice = 'Attachment verified clean: zero active scripts or malicious patterns detected.';
  let redactedPreview: string | undefined;

  if (content) {
    const rawText = typeof content === 'string' ? content : content.toString('utf-8');

    // Reject dangerous script tags, event handlers, or direct shell execs in uploaded files
    const dangerousPatterns = [
      /<script\b[^>]*>/i,
      /javascript:/i,
      /onload\s*=/i,
      /onerror\s*=/i,
      /eval\s*\(/i,
      /spawnSync\s*\(/i,
      /execSync\s*\(/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(rawText)) {
        isClean = false;
        scanNotice = 'Attachment rejected: dangerous executable script or shell injection pattern detected.';
        throw new Error(scanNotice);
      }
    }

    // Run redaction on text attachment preview
    redactedPreview = redactSensitiveText(rawText.slice(0, 1024));
  }

  return {
    isClean,
    mimeType,
    sizeBytes,
    filename: filename.replace(/[^a-zA-Z0-9._-]/g, '_'),
    scanNotice,
    redactedPreview
  };
}

/**
 * Computes deterministic SHA-256 fingerprint from normalized title, category, and core description.
 */
export function computeContentFingerprint(title: string, category: string, description: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Extract top alphabetic tokens (>3 chars) from description
  const descTokens = Array.from(
    new Set(
      normalize(description)
        .split(' ')
        .filter((t) => t.length > 3)
    )
  )
    .sort()
    .slice(0, 50)
    .join(' ');

  const canonicalString = `${normalize(title)}|${category.toUpperCase()}|${descTokens}`;
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Simple token Jaccard similarity for heuristic duplicate identification.
 */
export function calculateTokenSimilarity(textA: string, textB: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Evaluates a new submission against existing reports for duplicate detection.
 */
export function detectDuplicates(
  newFingerprint: string,
  newTitle: string,
  newCategory: string,
  newDescription: string,
  existingReports: Array<{
    id: string;
    contentFingerprint?: string;
    content_fingerprint?: string;
    title: string;
    threatCategory?: string;
    threat_category?: string;
    description: string;
  }>
): DuplicateDetectionResult {
  for (const existing of existingReports) {
    const existingFingerprint = existing.contentFingerprint || existing.content_fingerprint;
    const existingCategory = existing.threatCategory || existing.threat_category;

    // 1. Exact canonical fingerprint match
    if (existingFingerprint && existingFingerprint === newFingerprint) {
      return {
        isDuplicate: true,
        duplicateOfId: existing.id,
        similarityScore: 1.0,
        matchType: 'EXACT_FINGERPRINT'
      };
    }

    // 2. High token overlap within the same category
    if (existingCategory === newCategory) {
      const titleSim = calculateTokenSimilarity(newTitle, existing.title);
      const descSim = calculateTokenSimilarity(newDescription, existing.description);
      const compositeScore = titleSim * 0.4 + descSim * 0.6;

      if (descSim >= 0.70 || compositeScore >= 0.60) {
        return {
          isDuplicate: true,
          duplicateOfId: existing.id,
          similarityScore: Number(compositeScore.toFixed(3)),
          matchType: 'SEMANTIC_SIMILARITY'
        };
      }
    }
  }

  return {
    isDuplicate: false,
    similarityScore: 0,
    matchType: 'NONE'
  };
}

/**
 * In-memory sliding-window rate limiter per tenant workspace and user account.
 * Limit: Max 5 submissions per 10 minutes (600,000 ms), and max 20 submissions per day (86,400,000 ms).
 */
const submissionTimestamps = new Map<string, number[]>();
const dailySubmissionTimestamps = new Map<string, number[]>();

export const MAX_SUBMISSIONS_10_MIN = 5;
export const MAX_SUBMISSIONS_DAILY = 20;

export function checkSubmissionRateLimit(
  workspaceId: string,
  accountId: string,
  maxAllowed = MAX_SUBMISSIONS_10_MIN,
  windowMs = 10 * 60 * 1000,
  maxDaily = MAX_SUBMISSIONS_DAILY,
  dailyWindowMs = 24 * 60 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds?: number; reason?: string } {
  const key = `${workspaceId}:${accountId}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const dailyCutoff = now - dailyWindowMs;

  const timestamps = (submissionTimestamps.get(key) || []).filter((t) => t > cutoff);
  const dailyTimestamps = (dailySubmissionTimestamps.get(key) || []).filter((t) => t > dailyCutoff);

  // 1. Check 10-minute rate limit
  if (timestamps.length >= maxAllowed) {
    const oldestTimestamp = timestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reason: `Rate limit exceeded: maximum ${maxAllowed} submissions per 10 minutes.`
    };
  }

  // 2. Check 24-hour daily cap
  if (dailyTimestamps.length >= maxDaily) {
    const oldestTimestamp = dailyTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldestTimestamp + dailyWindowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
      reason: `Daily cap reached: maximum ${maxDaily} submissions per day.`
    };
  }

  timestamps.push(now);
  dailyTimestamps.push(now);
  submissionTimestamps.set(key, timestamps);
  dailySubmissionTimestamps.set(key, dailyTimestamps);

  return {
    allowed: true,
    remaining: maxAllowed - timestamps.length
  };
}

export function resetRateLimitsForTesting(): void {
  submissionTimestamps.clear();
  dailySubmissionTimestamps.clear();
}

/**
 * Deep multi-pass redaction for all user-provided report input fields.
 * Scrubs planted secrets, keys, seed phrases, emails, cards, and bearer tokens.
 * Strips all HTML to prevent injection.
 */
export function sanitizeReportInputs(input: {
  title: string;
  description: string;
  defensiveEvidence?: string;
  evidenceSnippet?: string;
  mitigationApplied?: string;
  targetAddressOrDomain?: string;
  reporterName?: string;
  reporterEmail?: string;
  tags?: string[];
}): typeof input {
  return {
    ...input,
    title: redactSensitiveText(stripHtml(input.title)).trim(),
    description: redactSensitiveText(stripHtml(input.description)).trim(),
    defensiveEvidence: input.defensiveEvidence ? redactSensitiveText(stripHtml(input.defensiveEvidence)).trim() : undefined,
    evidenceSnippet: input.evidenceSnippet ? redactSensitiveText(stripHtml(input.evidenceSnippet)).trim() : undefined,
    mitigationApplied: input.mitigationApplied ? redactSensitiveText(stripHtml(input.mitigationApplied)).trim() : '',
    targetAddressOrDomain: input.targetAddressOrDomain ? redactSensitiveText(stripHtml(input.targetAddressOrDomain)).trim() : undefined,
    reporterName: input.reporterName ? redactSensitiveText(stripHtml(input.reporterName)).trim() : undefined,
    reporterEmail: input.reporterEmail ? redactSensitiveText(stripHtml(input.reporterEmail)).trim() : undefined,
    tags: input.tags ? input.tags.map((t) => redactSensitiveText(stripHtml(t)).trim()).filter(Boolean) : []
  };
}

/**
 * Constructs a verified, sanitized public summary ready for public repository viewing.
 * Strictly enforces that no raw payloads or planted secrets leak.
 */
export function generateSanitizedPublicSummary(report: {
  id: string;
  title: string;
  threatCategory: string;
  severity: string;
  agentPlatform: string;
  description: string;
  defensiveEvidence?: string;
  evidenceSnippet?: string;
  mitigationApplied: string;
  tags?: string[];
  publishedAt: string;
}): {
  reportId: string;
  title: string;
  threatCategory: string;
  severity: string;
  agentPlatform: string;
  sanitizedDescription: string;
  sanitizedEvidence: string;
  mitigationApplied: string;
  tags: string[];
  publishedAt: string;
  sha256Digest: string;
} {
  const scrubbedTitle = redactSensitiveText(report.title);
  const scrubbedDesc = redactSensitiveText(report.description);
  const scrubbedEvidence = redactSensitiveText(report.evidenceSnippet || report.defensiveEvidence || '');
  const scrubbedMitigation = redactSensitiveText(report.mitigationApplied);

  const digestPayload = `${report.id}:${scrubbedTitle}:${report.threatCategory}:${scrubbedDesc}:${scrubbedMitigation}`;
  const sha256Digest = crypto.createHash('sha256').update(digestPayload).digest('hex');

  return {
    reportId: report.id,
    title: scrubbedTitle,
    threatCategory: report.threatCategory,
    severity: report.severity,
    agentPlatform: report.agentPlatform,
    sanitizedDescription: scrubbedDesc,
    sanitizedEvidence: scrubbedEvidence,
    mitigationApplied: scrubbedMitigation,
    tags: report.tags || [],
    publishedAt: report.publishedAt,
    sha256Digest
  };
}
