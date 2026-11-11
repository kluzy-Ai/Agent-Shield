/**
 * Mock Agent 2: Web Research & Data Harvester Agent
 * Identity: crawler-01.testnet
 * Target Contract: data-oracle.testnet
 * Integrates: @agentshield/sdk
 */

import { AgentShield } from '../../packages/sdk/src/index.ts';

async function runWebResearchAgent() {
  console.log('🤖 [Web Research Agent] Initializing Autonomous Data Harvester...');

  const shield = new AgentShield({
    agentId: 'agent-03',
    ingestToken: 'ash_live_web_research_agent_token_2026_testnet',
    endpointUrl: 'http://localhost:3000/api/ingest',
    nearAccountId: 'crawler-01.testnet',
    targetContractId: 'data-oracle.testnet',
    blockedDestinations: ['exploit-exfiltration.com', 'phishing-oracle.org']
  });

  // 1. Send Health Heartbeat
  console.log('💓 [Web Research Agent] Sending heartbeat to Agent Shield gateway...');
  const hb = await shield.sendHeartbeat('ACTIVE');
  console.log('   Heartbeat result:', hb.success ? 'ACTIVE & MONITORED' : hb.error);

  // 2. Define wrapped tools
  const crawlMarketData = shield.wrapToolCall(
    'crawl_market_data',
    'api.coingecko.com',
    async (args: { pair: string }) => {
      console.log(`   Harvesting external spot price for ${args.pair}...`);
      return { pair: args.pair, priceUsd: 5.42, timestamp: Date.now() };
    },
    { actionType: 'OUTBOUND_EGRESS' }
  );

  const publishOraclePrice = shield.wrapToolCall(
    'publish_oracle_price',
    'data-oracle.testnet',
    async (args: { pair: string; priceUsd: number }) => {
      console.log(`   Committing verified rate ${args.priceUsd} to oracle contract...`);
      return { txHash: '2c1a...99e1', confirmed: true, blockHeight: 1829401 };
    },
    { actionType: 'CONTRACT_CALL' }
  );

  // 3. Execution Run
  console.log('\n--- Scenario A: Live Data Harvester Cycle ---');
  try {
    const marketData = await crawlMarketData({ pair: 'NEAR/USD' });
    console.log(`   Fetched spot price: $${marketData.priceUsd}`);

    const commitRes = await publishOraclePrice({ pair: 'NEAR/USD', priceUsd: marketData.priceUsd });
    console.log('✅ Oracle feed published on-chain:', commitRes.txHash);
  } catch (err: any) {
    console.error('❌ Error during data harvesting cycle:', err.message);
  }

  console.log('\n🤖 [Web Research Agent] Run complete.\n');
}

runWebResearchAgent().catch(console.error);
