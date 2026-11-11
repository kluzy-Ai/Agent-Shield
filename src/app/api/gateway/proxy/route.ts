import { NextRequest, NextResponse } from 'next/server';

const APPROVED_DESTINATIONS = [
  'storefront-v2.testnet',
  'storefront-v1.testnet',
  'payment-vault.testnet',
  'data-oracle.testnet',
  'rpc.testnet.near.org',
  'api.coingecko.com'
];

const BLOCKED_DESTINATIONS = [
  'attacker-drain.testnet',
  'untrusted-drain.testnet',
  'exploit-drain.testnet',
  'hacker.testnet'
];

export async function POST(req: NextRequest) {
  try {
    const simulateFailClosed = req.headers.get('x-simulate-fail-closed') === 'true';
    if (simulateFailClosed) {
      throw new Error('Simulated gateway policy inspection exception.');
    }

    const body = await req.json().catch(() => ({}));
    let destination = (
      req.headers.get('x-target-destination') ||
      body.destination ||
      body.receiver_id ||
      body.targetContractId ||
      ''
    ).toLowerCase().trim().split(':')[0];

    // Check if destination is blocked
    const isBlocked = BLOCKED_DESTINATIONS.some((b) => b.toLowerCase() === destination || destination.includes(b));
    if (isBlocked) {
      return NextResponse.json(
        {
          error: 'BLOCKED_BY_GATEWAY_POLICY',
          outcome: 'BLOCKED',
          destination,
          reason: `Destination '${destination}' is unapproved or blocklisted. Blocked at Agent Shield Gateway.`
        },
        {
          status: 403,
          headers: {
            'x-agentshield-policy-outcome': 'BLOCKED',
            'x-agentshield-failure-mode': 'FAIL_CLOSED'
          }
        }
      );
    }

    // Check if destination is approved
    const isApproved = APPROVED_DESTINATIONS.some(
      (a) => a === '*' || a.toLowerCase() === destination || destination.endsWith(a)
    );

    if (!isApproved) {
      return NextResponse.json(
        {
          error: 'BLOCKED_BY_GATEWAY_POLICY',
          outcome: 'BLOCKED',
          destination,
          reason: `Transfer/Call to unapproved destination '${destination}' is blocked at the gateway forward proxy.`
        },
        {
          status: 403,
          headers: {
            'x-agentshield-policy-outcome': 'BLOCKED',
            'x-agentshield-failure-mode': 'FAIL_CLOSED'
          }
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        forwarded: true,
        destination,
        message: `Gateway allowed forward call to approved destination '${destination}'.`,
        data: body
      },
      {
        headers: {
          'x-agentshield-policy-outcome': 'ALLOWED'
        }
      }
    );
  } catch (err: any) {
    // SAFE-FAILURE MODE: Fail-Closed
    return NextResponse.json(
      {
        error: 'GATEWAY_FAIL_CLOSED_ERROR',
        message: 'Agent Shield Gateway policy inspection failed; failing closed to prevent silent bypass.',
        details: err.message,
        safeBypassPrevented: true
      },
      {
        status: 502,
        headers: {
          'x-agentshield-failure-mode': 'FAIL_CLOSED',
          'x-agentshield-safe-bypass-prevented': 'true'
        }
      }
    );
  }
}

