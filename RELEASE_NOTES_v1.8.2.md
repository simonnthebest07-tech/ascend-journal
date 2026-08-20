# ASCEND Journal v1.8.2 — Clearer Update Summaries

ASCEND Journal v1.8.2 improves how desktop updates are communicated inside the application. This patch turns remote GitHub release content into a clean in-app update summary, so update decisions are readable, focused, and safe.

## Clear, structured update summaries

The Updates panel no longer shows GitHub release HTML or Markdown as raw text. When a new desktop version is available, ASCEND now presents a clear **What’s new** summary with a short overview and focused release highlights.

## Safer remote release-note handling

Release notes received from the update service are normalized into plain text before display. Script and style blocks are removed, and displayed content is escaped. The desktop app never inserts remote release content directly into the interface as markup.

## Better update flow guidance

The update surface now communicates download progress and installation readiness more clearly. The deliberate **Restart & Install** action remains unchanged: ASCEND still downloads updates automatically, but only installs after you explicitly choose to restart.

## Preserved behavior

This patch does not change journal data semantics, cloud synchronization, recovery, account and trade relationships, Live/Backtest isolation, authentication configuration, or Electron security controls. The rounded ASCEND identity, multi-resolution Windows icon treatment, and Windows development-startup reliability improvements from v1.8.1 remain included.

## Verification

| Verification layer | Result |
|---|---:|
| Deterministic unit tests | 110 passed |
| Integration tests | 23 passed |
| Browser acceptance tests | 41 passed |
| Rich release-note rendering, sanitization, and install confirmation | Passed |

## Upgrade note

Download the v1.8.2 Windows installer when it is attached to this release. Existing journal data remains unchanged by this desktop presentation update.
