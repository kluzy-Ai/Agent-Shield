/**
 * Agent Shield - Platform Moderator Management CLI
 * 
 * Sets or revokes platform-level moderator permissions (is_platform_moderator).
 * Usage:
 *   npx tsx scripts/set-platform-moderator.ts --account <email-or-id> [--enable | --revoke]
 */

import { getDatabase } from '../src/lib/db/database.ts';

async function main() {
  const args = process.argv.slice(2);
  const accountIndex = args.indexOf('--account');
  const accountArg = accountIndex !== -1 ? args[accountIndex + 1] : null;
  const isRevoke = args.includes('--revoke');

  if (!accountArg) {
    console.error('Usage: npx tsx scripts/set-platform-moderator.ts --account <email-or-id> [--revoke]');
    console.error('Example: npx tsx scripts/set-platform-moderator.ts --account moderator@agentshield.testnet');
    process.exit(1);
  }

  const db = getDatabase();
  const row = db.prepare('SELECT id, name, email, is_platform_moderator FROM accounts WHERE id = ? OR email = ?').get(accountArg, accountArg) as any;

  if (!row) {
    console.error(`Error: Account '${accountArg}' not found in database.`);
    process.exit(1);
  }

  const newValue = isRevoke ? 0 : 1;
  db.prepare('UPDATE accounts SET is_platform_moderator = ? WHERE id = ?').run(newValue, row.id);

  console.log(`Successfully updated platform moderator permission:`);
  console.log(`  Account ID:            ${row.id}`);
  console.log(`  Name:                  ${row.name}`);
  console.log(`  Email:                 ${row.email}`);
  console.log(`  is_platform_moderator: ${newValue === 1 ? 'true (MODERATOR AUTHORIZED)' : 'false (REFUSED)'}`);
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

