# Local milestone integration workflow

Status: policy documented and verified, 2026-11-10; actual integration evidence follows the local merges. The human explicitly requested finishing M3, merging M2/M3 into `master`, and making local commit/merge completion a standing rule. The human will push.

## Acceptance criteria

- Keep `master`, existing commits and unrelated user changes. Work on scoped topic branches; commit each completed verified spec. Once a milestone's required gates/evidence pass, commit all milestone changes and merge its branch locally into `master` without another permission question. A failed/blocked required gate still blocks completion unless the human explicitly accepts the known exception.
- Apply this to Codex developing ForgeTS, not runtime agent permissions. Local integration does not approve generated target code, authorize another milestone, permit paid calls or grant remote writes. The human owns pushes; no fetch/push/remote PR/deploy is performed. Stop before M4.
- Record the human's current authorization to integrate M2's documented offline state while its live test remains unperformed; never relabel that test as passed. Preserve M3's actual verified evidence and the user-created M2 commit.
- Update AGENTS, a decision record, README discovery, human input and build log. Verify formatting/links/staged scope and locally commit the policy. Then merge M2 followed by M3 with preserved branch history, check ancestry/clean status and verify the merged code/tree matches the tested candidate. Record observed integration results in a final scoped documentation commit, also integrated into `master`.
