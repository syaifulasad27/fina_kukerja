# Fina Operations Quick Guide

## Commands

- Propose change:
  `fina-propose /root/.openclaw/workspace/fina_kukerja/runtime/sample-proposal.json syaiful_asad`

- Approve and apply:
  `fina-approve <approvalId> syaiful_asad`

- Reject:
  `fina-reject <approvalId> "reason" syaiful_asad`

## Files

- Queue: `/root/.openclaw/workspace/fina_kukerja/runtime/pending-approvals.json`
- Audit: `/root/.openclaw/workspace/fina_kukerja/runtime/audit-log.jsonl`
- Health: `/root/.openclaw/workspace/fina_kukerja/runtime/last-health.json`

## Notes

- Unknown fields are blocked by schema validator.
- Write operations require approval.
- Hard delete is not allowed.
