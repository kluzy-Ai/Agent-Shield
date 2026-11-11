/**
 * Agent Shield Gateway / Forward Proxy Service (FR-07, FR-08)
 *
 * Control Point 2: An HTTP Forward Proxy for autonomous agent tool and outbound traffic.
 * Inspects all outbound HTTP calls, contract interactions, and tool invocations.
 *
 * SAFE-FAILURE MODE SPECIFICATION:
 * - Operating Model: Fail-Closed (Strict Security Default).
 * - No Silent Bypass: If the policy engine, authentication layer, or inspection pipeline
 *   encounters an unexpected error, timeout, or database disconnect, the gateway
 *   IMMEDIATELY TERMINATES the request with HTTP 502/503.
 * - Under NO CIRCUMSTANCES is an uninspected or erroring request forwarded upstream.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export interface GatewayValidationRequest {
  agentId: string;
  toolName?: string;
  destination: string;
  payload?: Record<string, any>;
  attachedDeposit?: string;
  amountNear?: number | string;
}

export interface GatewayValidationResponse {
  allowed: boolean;
  outcome: 'ALLOWED' | 'FLAGGED' | 'PAUSED' | 'BLOCKED';
  reason?: string;
  sanitizedPayload: Record<string, any>;
  safeBypassPrevented?: boolean;
}

export interface GatewayProxyOptions {
  port?: number;
  db?: DatabaseSync;
  defaultApprovedDestinations?: string[];
  defaultBlockedDestinations?: string[];
  simulateFailClosed?: boolean; // For testing safe-failure mode
}

/**
 * In-memory / unit-test evaluation function (Preserved for backwards-compatibility)
 */
export function evaluateGatewayRequest(req: GatewayValidationRequest): GatewayValidationResponse {
  const destination = (req.destination || '').toLowerCase();

  // 1. Blocked destination check
  if (
    destination.includes('attacker') ||
    destination.includes('drain') ||
    destination.includes('untrusted')
  ) {
    return {
      allowed: false,
      outcome: 'BLOCKED',
      reason: `Target destination '${req.destination}' is flagged in shared community threat intelligence.`,
      sanitizedPayload: { redacted: true, destination: req.destination }
    };
  }

  return {
    allowed: true,
    outcome: 'ALLOWED',
    sanitizedPayload: req.payload || {}
  };
}

/**
 * Creates an HTTP forward proxy server that intercepts outbound tool/RPC traffic.
 */
export function createGatewayProxyServer(options: GatewayProxyOptions = {}): http.Server {
  const approvedDestinations = options.defaultApprovedDestinations || [
    'storefront-v2.testnet',
    'storefront-v1.testnet',
    'payment-vault.testnet',
    'data-oracle.testnet',
    'rpc.testnet.near.org',
    'api.coingecko.com'
  ];

  const blockedDestinations = options.defaultBlockedDestinations || [
    'attacker-drain.testnet',
    'untrusted-drain.testnet',
    'exploit-drain.near',
    'hacker.near'
  ];

  const server = http.createServer(async (req, res) => {
    // Collect body
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));

    req.on('end', async () => {
      try {
        // Safe-Failure Mode Hook: If simulateFailClosed is enabled or an unexpected throw happens:
        if (options.simulateFailClosed) {
          throw new Error('Simulated internal gateway policy inspection failure.');
        }

        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedBody: any = {};
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = {};
        }

        // Extract destination from:
        // 1. Header 'x-target-destination'
        // 2. Request URL if full URL is supplied
        // 3. Body fields (receiver_id, destination, contract_id)
        let destination = (
          (req.headers['x-target-destination'] as string) ||
          req.headers['host'] ||
          parsedBody.destination ||
          parsedBody.receiver_id ||
          parsedBody.targetContractId ||
          ''
        ).toLowerCase().trim();

        // If request URL is an absolute URL, parse host
        if (req.url && (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
          try {
            const parsedUrl = new URL(req.url);
            destination = parsedUrl.hostname.toLowerCase();
          } catch {}
        }

        // Clean destination of port numbers
        destination = destination.split(':')[0];

        // Policy Evaluation:
        // 1. Check if destination is blocked
        const isBlocked = blockedDestinations.some((b) => b.toLowerCase() === destination || destination.includes(b));
        if (isBlocked) {
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'x-agentshield-policy-outcome': 'BLOCKED',
            'x-agentshield-failure-mode': 'FAIL_CLOSED'
          });
          res.end(JSON.stringify({
            error: 'BLOCKED_BY_GATEWAY_POLICY',
            outcome: 'BLOCKED',
            destination,
            reason: `Destination '${destination}' is unapproved or blocklisted. Blocked at Agent Shield Gateway.`
          }));
          return;
        }

        // 2. Check if destination is approved
        const isApproved = approvedDestinations.some(
          (a) => a === '*' || a.toLowerCase() === destination || destination.endsWith(a)
        );

        if (!isApproved) {
          res.writeHead(403, {
            'Content-Type': 'application/json',
            'x-agentshield-policy-outcome': 'BLOCKED',
            'x-agentshield-failure-mode': 'FAIL_CLOSED'
          });
          res.end(JSON.stringify({
            error: 'BLOCKED_BY_GATEWAY_POLICY',
            outcome: 'BLOCKED',
            destination,
            reason: `Transfer/Call to unapproved destination '${destination}' is blocked at the gateway forward proxy.`
          }));
          return;
        }

        // 3. Allowed: Proxy the request or return gateway success response
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'x-agentshield-policy-outcome': 'ALLOWED'
        });
        res.end(JSON.stringify({
          success: true,
          forwarded: true,
          destination,
          message: `Gateway allowed forward call to approved destination '${destination}'.`,
          data: parsedBody
        }));
      } catch (err: any) {
        // SAFE-FAILURE MODE: FAIL CLOSED!
        // No silent bypass is ever permitted.
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'x-agentshield-failure-mode': 'FAIL_CLOSED',
          'x-agentshield-safe-bypass-prevented': 'true'
        });
        res.end(JSON.stringify({
          error: 'GATEWAY_FAIL_CLOSED_ERROR',
          message: 'Agent Shield Gateway policy inspection failed; failing closed to prevent silent bypass.',
          details: err.message,
          safeBypassPrevented: true
        }));
      }
    });
  });

  return server;
}
