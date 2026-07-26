---
name: Dual-rail payments quirks
description: Non-obvious rules for the SOL + ERC-20 $Pc payment rails
---

- **Rule**: Solana transaction signatures (base58) are case-SENSITIVE — store/verify them in original case. Ethereum hashes are case-insensitive — store lowercased. Dedupe across both rails with `LOWER(tx_hash)` comparison (safe: a case-variant of a valid Solana sig can never verify on-chain).
  **Why:** lowercasing a Solana signature makes on-chain lookup fail permanently, silently stranding real deposits in pending.
  **How to apply:** any new code path that stores or compares tx hashes must branch on the network first.

- **Rule**: Every rail is fail-closed. Missing Solana config (`PC_SPL_MINT`, `SOL_DEPOSIT_WALLET`, `SOLANA_PAYOUT_PRIVATE_KEY`) must produce a 503/needs_review/rollback-to-approved, never a silent fallback to the other rail's verifier or signer.
  **Why:** cross-rail fallback would let unverifiable claims reach admin review or the wrong signer.

- Solana deposit crediting requires `finalized` commitment (equivalent of ETH's 12 confirmations); `confirmed` can still be reorged.
- Deposit claims are rate-limited (5/user/10min) as an anti-probing measure; hitting it alerts admins.
