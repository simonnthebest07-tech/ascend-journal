# ASCEND Journal v1.8.1 — Desktop Identity Refinement

ASCEND Journal v1.8.1 refines the desktop product identity and the desktop application interface. This release focuses on a clearer, more polished visual presence while preserving every established journal, cloud-sync, recovery, and workspace-safety behavior.

## Highlights

### Refined ASCEND icon system

The ASCEND ascending-A mark has been rebuilt as a clean rounded-square application identity. The in-app Signal Rail now uses a more restrained navigation-scale mark, while the desktop titlebar uses a clear, purpose-sized identity mark.

Windows now uses a multi-resolution ASCEND `.ico` asset for the running application, taskbar, installer, and installed executable. The asset contains native Windows sizes from 16 px through 256 px, improving clarity across Explorer, taskbar, and high-DPI displays.

### Improved desktop application presentation

The custom Electron titlebar now presents a larger, more legible ASCEND mark. The Signal Rail header has been rebalanced so the product identity remains clear without dominating the navigation environment. The authentication surface uses the same coherent rounded-square visual system.

### More reliable Windows development startup

For projects opened from OneDrive-hosted folders, Electron development mode now keeps Chromium session and cache data in a writable temporary location. The local renderer is loaded through an explicitly encoded file URL, improving startup reliability for Windows paths containing spaces. Packaged releases retain their normal persistent profile behavior.

## Preserved behavior

This release does not change journal data semantics, account and trade relationships, Live/Backtest workspace isolation, backups, recovery, Supabase configuration, authentication policy, or desktop security controls. The hardened Electron boundary remains in place: context isolation, disabled renderer Node integration, Chromium sandboxing, web security, and the allowlisted preload bridge.

## Verification

The v1.8.1 icon and desktop UI refinement passed the complete quality gate:

| Verification layer | Result |
|---|---:|
| Deterministic unit tests | 110 passed |
| Integration tests | 23 passed |
| Browser acceptance tests | 41 passed |
| Renderer, migration, Electron syntax, desktop icon, and startup contract | Passed |

## Upgrade note

Download the v1.8.1 Windows installer when it is attached to this release. Existing local journal data remains untouched by this visual and desktop-runtime refinement.
