const fs = require('fs');
const path = require('path');

const excludeDirs = new Set(['node_modules', '.git', '.next', 'target']);
const secretPatterns = [
  { name: 'NEAR Private Key', regex: /(?:ed25519|secp256k1):[0-9a-zA-Z]{50,}/i },
  { name: 'GitHub Token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b/ },
  { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Private Key Block', regex: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/ },
  { name: 'Live NEAR AI Key', regex: /NEAR_AI_API_KEY\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/ }
];

let leaksFound = 0;

function scan(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (excludeDirs.has(item)) continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scan(full);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js') || full.endsWith('.json') || full.endsWith('.md') || full.endsWith('.env')) {
      const content = fs.readFileSync(full, 'utf8');
      for (const p of secretPatterns) {
        const matches = content.match(p.regex);
        if (matches) {
          const isTestOrRedactionFile = full.includes('test') || full.includes('redaction') || full.includes('seed') || full.includes('simulations');
          if (!isTestOrRedactionFile) {
            console.warn(`[LEAK ALERT] ${p.name} found in: ${full}`);
            leaksFound++;
          }
        }
      }
    }
  }
}

scan('.');
console.log('----------------------------------------------------');
console.log('Secrets Scan Result:');
console.log(`Live production secrets leaked: ${leaksFound}`);
console.log('----------------------------------------------------');
if (leaksFound > 0) process.exit(1);
