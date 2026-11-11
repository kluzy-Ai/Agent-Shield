use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault};

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct AuditAnchor {
    pub sequence_number: u64,
    pub root_hash: String,
    pub event_count: u64,
    pub timestamp_nanos: u64,
    pub block_height: u64,
    pub submitter: AccountId,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct ThreatRecord {
    pub report_hash: String,
    pub indicator_pattern: String,
    pub severity: String,
    pub description_summary: String,
    pub registered_at_nanos: u64,
    pub submitter: AccountId,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub struct BlockedCounterparty {
    pub account_id: AccountId,
    pub reason: String,
    pub report_hash: Option<String>,
    pub blocked_at_nanos: u64,
    pub submitter: AccountId,
}

#[near_bindgen]
#[derive(BorshSerialize, BorshDeserialize, PanicOnDefault)]
pub struct ShieldSecurityContract {
    pub owner_id: AccountId,
    pub anchors: Vector<AuditAnchor>,
    pub threats: LookupMap<String, ThreatRecord>,
    pub threat_hashes: Vector<String>,
    pub blocked_accounts: LookupMap<AccountId, BlockedCounterparty>,
    pub blocked_list: Vector<AccountId>,
}

#[near_bindgen]
impl ShieldSecurityContract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            owner_id,
            anchors: Vector::new(b"a"),
            threats: LookupMap::new(b"t"),
            threat_hashes: Vector::new(b"h"),
            blocked_accounts: LookupMap::new(b"b"),
            blocked_list: Vector::new(b"l"),
        }
    }

    /// Anchors the latest hash-chain cryptographic root of Agent Shield audit logs.
    pub fn anchor_audit_root(&mut self, root_hash: String, event_count: u64) -> AuditAnchor {
        self.assert_owner();
        assert!(!root_hash.trim().is_empty(), "Root hash cannot be empty");

        let sequence_number = self.anchors.len() as u64 + 1;
        let anchor = AuditAnchor {
            sequence_number,
            root_hash: root_hash.clone(),
            event_count,
            timestamp_nanos: env::block_timestamp(),
            block_height: env::block_height(),
            submitter: env::predecessor_account_id(),
        };

        self.anchors.push(anchor.clone());
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"agent-shield\",\"version\":\"1.0.0\",\"event\":\"audit_root_anchored\",\"data\":{{\"sequence\":{},\"root_hash\":\"{}\",\"event_count\":{}}}}}",
            sequence_number, root_hash, event_count
        ));

        anchor
    }

    /// Registers a sanitized community threat intelligence record hash on NEAR.
    pub fn register_threat(
        &mut self,
        report_hash: String,
        indicator_pattern: String,
        severity: String,
        description_summary: String,
    ) -> ThreatRecord {
        self.assert_owner();
        assert!(!report_hash.trim().is_empty(), "Report hash cannot be empty");
        assert!(
            !self.threats.contains_key(&report_hash),
            "Threat report hash already registered"
        );

        let threat = ThreatRecord {
            report_hash: report_hash.clone(),
            indicator_pattern: indicator_pattern.clone(),
            severity: severity.clone(),
            description_summary,
            registered_at_nanos: env::block_timestamp(),
            submitter: env::predecessor_account_id(),
        };

        self.threats.insert(report_hash.clone(), threat.clone());
        self.threat_hashes.push(report_hash.clone());

        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"agent-shield\",\"version\":\"1.0.0\",\"event\":\"threat_registered\",\"data\":{{\"report_hash\":\"{}\",\"severity\":\"{}\"}}}}",
            report_hash, severity
        ));

        threat
    }

    /// Adds an adversary account to the on-chain threat blocklist.
    pub fn block_counterparty(
        &mut self,
        account_id: AccountId,
        reason: String,
        report_hash: Option<String>,
    ) -> BlockedCounterparty {
        self.assert_owner();
        
        let blocked = BlockedCounterparty {
            account_id: account_id.clone(),
            reason: reason.clone(),
            report_hash,
            blocked_at_nanos: env::block_timestamp(),
            submitter: env::predecessor_account_id(),
        };

        if !self.blocked_accounts.contains_key(&account_id) {
            self.blocked_list.push(account_id.clone());
        }
        self.blocked_accounts.insert(account_id.clone(), blocked.clone());

        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"agent-shield\",\"version\":\"1.0.0\",\"event\":\"counterparty_blocked\",\"data\":{{\"account_id\":\"{}\",\"reason\":\"{}\"}}}}",
            account_id, reason
        ));

        blocked
    }

    /// Removes an account from the on-chain blocklist.
    pub fn unblock_counterparty(&mut self, account_id: AccountId) -> bool {
        self.assert_owner();
        if self.blocked_accounts.remove(&account_id).is_some() {
            // Rebuild list without removed account
            let len = self.blocked_list.len();
            for i in 0..len {
                if let Some(acc) = self.blocked_list.get(i) {
                    if acc == &account_id {
                        self.blocked_list.swap_remove(i);
                        break;
                    }
                }
            }
            true
        } else {
            false
        }
    }

    // ------------------- VIEW FUNCTIONS -------------------

    pub fn get_latest_anchor(&self) -> Option<AuditAnchor> {
        if self.anchors.is_empty() {
            None
        } else {
            self.anchors.get(self.anchors.len() - 1).cloned()
        }
    }

    pub fn get_anchor_by_seq(&self, sequence_number: u64) -> Option<AuditAnchor> {
        if sequence_number == 0 || sequence_number > self.anchors.len() as u64 {
            None
        } else {
            self.anchors.get((sequence_number - 1) as u32).cloned()
        }
    }

    pub fn get_total_anchors(&self) -> u64 {
        self.anchors.len() as u64
    }

    pub fn is_blocked_counterparty(&self, account_id: AccountId) -> bool {
        self.blocked_accounts.contains_key(&account_id)
    }

    pub fn get_blocked_counterparty(&self, account_id: AccountId) -> Option<BlockedCounterparty> {
        self.blocked_accounts.get(&account_id).cloned()
    }

    pub fn get_threat(&self, report_hash: String) -> Option<ThreatRecord> {
        self.threats.get(&report_hash).cloned()
    }

    pub fn get_threat_count(&self) -> u64 {
        self.threat_hashes.len() as u64
    }

    pub fn get_blocked_count(&self) -> u64 {
        self.blocked_list.len() as u64
    }

    // ------------------- INTERNAL -------------------

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only contract owner can execute this action"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn get_context(predecessor: AccountId) -> VMContextBuilder {
        let mut builder = VMContextBuilder::new();
        builder
            .predecessor_account_id(predecessor)
            .current_account_id("shield-security.testnet".parse().unwrap())
            .block_timestamp(1_700_000_000_000_000_000)
            .block_height(10_000);
        builder
    }

    #[test]
    fn test_initialization() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let context = get_context(owner.clone());
        testing_env!(context.build());

        let contract = ShieldSecurityContract::new(owner.clone());
        assert_eq!(contract.owner_id, owner);
        assert_eq!(contract.get_total_anchors(), 0);
        assert_eq!(contract.get_threat_count(), 0);
        assert_eq!(contract.get_blocked_count(), 0);
    }

    #[test]
    fn test_anchor_audit_root() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let context = get_context(owner.clone());
        testing_env!(context.build());

        let mut contract = ShieldSecurityContract::new(owner.clone());
        let anchor = contract.anchor_audit_root("hash_chain_root_abc123".to_string(), 42);

        assert_eq!(anchor.sequence_number, 1);
        assert_eq!(anchor.root_hash, "hash_chain_root_abc123");
        assert_eq!(anchor.event_count, 42);
        assert_eq!(contract.get_total_anchors(), 1);

        let latest = contract.get_latest_anchor().unwrap();
        assert_eq!(latest.root_hash, "hash_chain_root_abc123");
    }

    #[test]
    fn test_threat_and_counterparty_block() {
        let owner: AccountId = "owner.testnet".parse().unwrap();
        let context = get_context(owner.clone());
        testing_env!(context.build());

        let mut contract = ShieldSecurityContract::new(owner.clone());
        let malicious_acc: AccountId = "drain-bot.testnet".parse().unwrap();

        let threat = contract.register_threat(
            "sha256_report_hash_987".to_string(),
            "drain_tokens_pattern".to_string(),
            "CRITICAL".to_string(),
            "Prompt injection drain attack against payment vault".to_string(),
        );
        assert_eq!(threat.report_hash, "sha256_report_hash_987");
        assert_eq!(contract.get_threat_count(), 1);

        contract.block_counterparty(
            malicious_acc.clone(),
            "Identified drain-bot in incident #42".to_string(),
            Some("sha256_report_hash_987".to_string()),
        );

        assert!(contract.is_blocked_counterparty(malicious_acc.clone()));
        assert_eq!(contract.get_blocked_count(), 1);
    }
}
