# Version 2 implementation notes

## Changes

- Kept the existing React/Vite/Wouter app, gallery layout, font choices, blue
  background, pink accents and reusable admin components.
- Added a complete `/about` profile, with profile/biography, skills, categorized
  interests, personal notes, device panels, music library, activity timeline and
  external links. The structured editor handles all fields without source edits.
- Made the Home introduction a single profile link; kept contact separate.
- Added Works PDF attachments and preserved project links and descriptions.
- Replaced the deployment's Express/Manus/S3 runtime with PHP/SQLite/local media.
  Existing typed React hooks call an explicit tRPC-compatible transport adapter.
- Preserved drafts, photo details/batch registration, books, likes, comments,
  comment edit/delete/undo and administrator moderation.
- Replaced external OAuth with clearly labeled unverified visitor sessions;
  external Manus notifications are no longer sent.
- Removed Manus Vite runtime/debug collector injection and empty analytics
  placeholders from the active build. Preserved unrelated legacy source files.
- Added CSS tilt/highlight effects to the profile and Works cards. JavaScript
  changes only `--mx`, `--my`, `--rx`, `--ry`; CSS owns transform and easing.
  Pointer leave resets rotation; touch and reduced-motion remain static.
- Added hamburger-to-close morphing, visible focus, modal keyboard support and
  reduced-motion overrides. Removed the viewport zoom restriction.
- Replaced the footer owner shortcut with a README link beside the credit.
- Fixed Home background bands at the source: removed the viewport-width,
  negative-margin and polygon-clipping combination that produced overlapping
  floating panels. The sections now stay within the shared page shell.

## Source map

| Location | Purpose |
| --- | --- |
| `client/src/pages/About.tsx`, `profile.css` | Profile sections and responsive visual treatment |
| `client/src/components/ProfileEditor.tsx` | Structured profile/activity editor |
| `shared/profile.ts`, `profileSchema.ts` | Client defaults, types and validation |
| `client/src/components/TiltCard.tsx` | Bounded pointer-to-CSS-property updates |
| `client/src/components/AdminPdfUpload.tsx` | Authenticated PDF file selection/upload |
| `xserver/public/api/` | PHP persistence, auth, transport, sanitization and media |
| `xserver/public/.htaccess`, `uploads/.htaccess` | SPA/API rewrites and safe media serving |
| `xserver/manage.php` | Private setup, password hashes, export/import |
| `scripts/package-xserver.mjs` | Assemble deployable assets without private data |
| `scripts/test-xserver.mjs`, `xserver/tests/` | Real PHP HTTP/client integration and validation |
| `scripts/browser-xserver.mjs` | Browser flow and responsive checks |

Deployment, migration decisions, configuration, operations and limitations are
in [XSERVER.md](XSERVER.md). No production secrets or generated uploads belong
in Git. Version 2's release output is `dist/public`, excluded from commits.

## Validation

`pnpm check` and `pnpm build` passed. All 90 existing Vitest checks passed after
updating the profile contract fixture and providing an isolated signing key for
the historical Node-session tests. These tests do not substitute for PHP tests.

`node scripts/test-xserver.mjs` starts the actual PHP backend against an isolated
SQLite fixture and uses the actual tRPC client. It verifies Date metadata,
batching, public/admin contracts, CRUD, hidden drafts, publication, duplicate
slugs, HTML sanitization, request origin/header checks, ownership, comment
edit/delete/undo, deduplicated likes, images, PDFs, password changes and login
rate limits. `php xserver/tests/run.php` covers sanitizer, URL validation,
Japanese content, impossible dates, persistence and cascading deletion.

The browser check runs against the compiled frontend and the PHP server. It
covers representative desktop/tablet/mobile widths, Home-to-profile navigation,
menu/Escape/focus, pointer tilt and reduced-motion, profile saving, blog typing,
PDF links and the photo viewer. Local fixtures, generated test media and screenshots
are isolated under `.tools` and never included in the deployable directory.

The actual XServer deployment and migration of existing live data require the
server account and original data; they cannot be completed from source alone.
