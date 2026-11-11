import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AgentShield } from '../packages/sdk/src/index.ts';
import { evaluateGatewayRequest } from '../services/gateway/src/index.ts';

describe('Agent Shield Security Policies & In-Line Enforcement', () => {
  it('enforces the 1 YoctoNEAR consensus rule on critical calls', async () => {
    const shield = new AgentShield({
      agentId: 'test-agent',
      gatewayUrl: 'http://localhost:4000',
      secretKey: 'mock_key'
    });

    const result = await shield.intercept({
      toolName: 'withdraw_treasury',
      args: { amount: '100' },
      attachedDepositYocto: '1'
    });

    assert.strictEqual(result.action, 'WARN');
    assert.strictEqual(result.requiresHumanSignature, true);
    assert.ok(result.reason?.includes('1 YoctoNEAR human signature required'));
  });

  it('blocks known exploit receivers via gateway check', () => {
    const req = {
      agentId: 'shopbot',
      toolName: 'issue_refund',
      destination: 'attacker-drain.testnet',
      payload: { amount: 2500 }
    };

    const res = evaluateGatewayRequest(req);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.outcome, 'BLOCKED');
    assert.ok(res.reason?.includes('flagged in shared community threat intelligence'));
  });

  it('allows benign routine actions within policy limits', () => {
    const req = {
      agentId: 'shopbot',
      toolName: 'query_catalog',
      destination: 'store-db.testnet',
      payload: { item_id: 'SKU-100' }
    };

    const res = evaluateGatewayRequest(req);
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.outcome, 'ALLOWED');
  });
});
