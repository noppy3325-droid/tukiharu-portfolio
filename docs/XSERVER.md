# XServer deployment and operations

Version 2 preserves the existing React gallery, typography, blue/pink palette,
navigation, rich-text editor, photo viewer, batch uploads, books, likes and
comment controls. The deployed backend is PHP; Node.js is needed only on the
developer's computer to build the frontend.

## Architecture decision

| Option | Fit for this project | Decision |
| --- | --- | --- |
| Existing Express/tRPC + Manus OAuth + S3 | Requires a continuously running Node server and external authentication/storage configuration | Retained as development/type reference, excluded from deployment |
| microCMS Hobby | Free managed editing, but a separate account/service and plan limits; PDF uploads and local XServer storage still need a solution | Evaluated, not selected |
| WordPress | PHP compatible and mature, but replaces the existing editing model and introduces a larger plugin/update surface | Not selected |
| React static build + PHP + SQLite + local uploads | Uses the existing editing UI, stores data and media on the rented server, adds no paid service | Selected |

Sources checked on 2026-10-09: [XServer database support](https://www.xserver.ne.jp/manual/man_db_spec.php),
[XServer program support](https://www.xserver.ne.jp/manual/man_program_soft.php),
[microCMS plans](https://microcms.io/pricing/). The student rental-server contract
must still be checked for its actual PHP version, extensions, disk quota and SSH
availability. This implementation targets a **shared rental server**, not a VPS.

The PHP endpoint implements the existing tRPC batch/SuperJSON wire format. The
React hooks and query cache remain unchanged. Dates are serialized with
SuperJSON metadata, which preserves existing date consumers. This is a small
explicit adapter, not a general-purpose PHP implementation of tRPC. Procedure
changes require matching PHP handlers and integration tests.

SQLite stores the profile, content records, visitors, comments, deduplicated
likes and rate-limit counters. Prepared statements, WAL, a busy timeout and
transactions protect writes. The entire private directory lives outside the
web root. The application never sends FTP credentials to the browser.

## Requirements

- Apache with `.htaccess` rewriting enabled, serving the domain root.
- PHP 8.1 or newer with PDO SQLite, GD, DOM/libxml, fileinfo and sessions.
  GD WebP support is recommended; PNG/JPEG remain supported without it.
- HTTPS on the public domain. HTTP is permitted only for localhost development.
- Writable private database/session directory and public `uploads` directory.
- `upload_max_filesize` at least `12M`, `post_max_size` at least `16M`, and
  `memory_limit` at least `256M` recommended. Tune within the actual plan limits.
- A current Node version supported by Vite, and pnpm 10.4.1 for local builds.

No API key, external CMS account, object-storage subscription or persistent
Node process is required for normal operation. Existing optional Google Fonts
are retained; they do not require an account or API key.

## Build and deploy

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

The deployable directory is `dist/public`. It contains `index.html`, hashed
frontend assets, `api/*.php`, root `.htaccess`, and `uploads/.htaccess`. It does
not contain source code, database exports, credentials, sessions or a Node
backend. The build clears its output: keep production uploads and private data
on the server, not in a build directory on your computer.

Typical XServer layout:

```text
<domain>/
  portfolio-private/
    config.php
    portfolio.sqlite
    sessions/
  public_html/
    .htaccess
    index.html
    assets/
    api/
    uploads/
      .htaccess
      <generated files>
```

1. Enable HTTPS and select a supported PHP version in the XServer panel.
2. Upload **the contents** of `dist/public` into `public_html`, including hidden
   `.htaccess` files. Initial deployment may use the server file manager or FTP.
3. Create `<domain>/portfolio-private`, outside `public_html`. Generate the
   administrator password hash with `php xserver/manage.php password-hash`.
   Supply a password through stdin; do not put it in a command argument. Copy
   `xserver/config.example.php` to `portfolio-private/config.php`, set the exact
   HTTPS origin and generated hash. No trailing path or subdirectory is allowed.
4. Set private directory permissions to `700` and config to `600` where the
   hosting account allows it. Ensure PHP can write there. The first API request
   initializes SQLite automatically. If SSH is available, `manage.php init`
   can create the private files; set `PORTFOLIO_PRIVATE_DIR` to the desired
   absolute server directory first.
5. Visit `/about`, `/works`, `/photos`, `/blog`, and `/admin`. Confirm deep-link
   reloads, login, a draft, publication, inline images, and a PDF download.
6. Check that private files are unreachable via HTTP, uploaded images have
   the correct MIME types, PDF responses use attachment disposition, and HTTPS
   session cookies have `Secure`, `HttpOnly`, and `SameSite=Lax`.

On subsequent releases, replace app files and hashed assets while preserving
`public_html/uploads` and `<domain>/portfolio-private`. Never synchronize with
a “delete remote files not present locally” option against those directories.
The rewrite assumes deployment at the domain root; subdirectory hosting needs
coordinated URL, router and Vite base changes and is not supported by default.

## Local development and preview

Create the ignored private configuration once:

```sh
php xserver/manage.php init http://127.0.0.1:5173
pnpm dev:api
pnpm dev
```

The Vite proxy forwards `/api` and `/uploads` to PHP on port 8080. Configure the
origin to match the browser's actual origin (including port). Do not use a
Manus environment file or credentials for this runtime.

For a built preview, use `pnpm build`, configure the origin to
`http://127.0.0.1:8080`, then run `pnpm start`. The launcher defaults to the
ignored `xserver/portfolio-private` directory; `PORTFOLIO_PRIVATE_DIR` can
override it when needed.
The local router replaces Apache rewrites during development only. It is not
a production server.

## Editing and media

Bookmark `/admin`. The public footer now has a README link beside the credit;
the prominent “owner access” link was removed to avoid accidental navigation.
Keeping the URL out of the footer is a usability choice; password/session
checks provide the actual access control.

The profile editor manages avatar, display name, headline, short introduction,
long biography, GitHub/X URLs, skill tags, interest categories, personal notes,
multiple devices, multiple music entries, dated activities, and other links.
Activity entries are ordered newest first. Unsupported personal details are
left empty rather than inferred. Home links the complete short introduction
area to the detailed profile. Email remains a separate contact link.

Works supports description, thumbnail, HTTPS project link and uploaded PDF.
Blog retains drafts/publication, rich-text editing and inline image insertion.
Photos retain batch registration, camera/lens/location/date metadata and the
accessible enlarged viewer. Books remain editable.

Image uploads use existing browser optimization, followed by server-side MIME
validation, decoding and re-encoding with GD. The server limits the longest
edge to 1600 pixels, chooses WebP only when smaller, and falls back to JPEG/PNG.
Raster re-encoding strips supplied metadata and avoids serving image source
bytes as executable content. Original browser files may be up to 20 MB;
transmitted images are limited to 5 MB and 16 million decoded pixels. PDFs are
limited to 10 MB, checked with fileinfo and a PDF signature, given random names,
and served as downloads. PDFs are not rewritten or scanned for malicious
content; only the authenticated owner can upload them.

Uploaded files become public only as media URLs. Saving a content record is a
separate step. Removing a record or clearing its media field does not delete
the file, because the file may be used in another article. Review orphaned
files periodically and back up before manual removal. Normal publishing
requires no FTP operation.

## Authentication and retained comments

PHP uses server-side sessions, rotates session IDs at login/logout, and gives
administrator access a 12-hour expiry. Passwords use PHP's `password_hash` and
`password_verify`. Passwords need at least 12 characters and at most 72 UTF-8
bytes (the bcrypt limit); spaces are preserved exactly. Changing a password invalidates other administrator sessions
by changing the credential fingerprint. Persistent IP-derived counters limit
login attempts; forwarded-IP headers are not trusted. POST mutations require
a custom request header and reject mismatched origins/cross-site requests.
There are no CORS allow rules.

Manus OAuth is no longer a runtime dependency. Comments use a local display-name
session and clearly identify this as **unverified**, rather than claiming an
authenticated social identity. Visitors can edit their own comments within five
minutes, delete them, and undo deletion within ten seconds. Admins can moderate.
Rate limits apply to session registration, comments and likes. Losing the
browser session loses ownership of those comments; there is no account recovery
or cross-device login. Imported comments remain visible/moderatable, but old
Manus users cannot regain ownership through a new guest session. External
comment email notifications have been removed with the Manus service.

## Migrate existing content

The provided source ZIP does not include a database, uploaded files or hosting
credentials. Real content must be exported from the old deployment before
cutover. Do not upload SQL dumps or JSON exports under `public_html`.

1. With read access to the old MySQL database, set `DATABASE_URL` in the process
   environment and run `pnpm exec tsx scripts/export-legacy.mjs` with stdout
   redirected to a private `*.export.json` file. The export includes content,
   profile, comments and likes; it excludes password hashes and account secrets.
2. Copy/download existing owned media into a staging directory. Upload through
   the new admin UI, or place validated media with generated names in `uploads`.
   Legacy `/manus-storage/...` URLs are not implemented by PHP. Rewrite those
   references to the new `/uploads/<random-hex>.<extension>` URLs in the export,
   including blog HTML and profile media. HTTPS media URLs can be retained
   temporarily, but will continue to depend on their original host.
3. Initialize an **empty** new database, then run
   `php xserver/manage.php import /private/path/content.export.json` with
   `PORTFOLIO_PRIVATE_DIR` pointing to the target private directory. Import
   validates and sanitizes content transactionally, remaps post IDs and
   preserves comment text/dates and likes. It refuses an occupied content DB.
4. Compare record counts, drafts, publication dates, article links, inline
   images, photo metadata and downloads. Back up the old deployment, then
   switch the domain only after this comparison succeeds.

For backups, `manage.php export` writes a content-only JSON snapshot; also back
up `uploads` and private config. For a raw SQLite backup, stop writes or use
SQLite's backup mechanism. Copying only the DB while WAL writes are active is
not a consistent backup. Keep backups outside the web root.

## Known deployment boundaries

- Local PHP and browser checks cannot confirm the actual XServer account's
  permissions, rewrite rules, PHP extensions or student-plan quota. Run the
  deployment smoke checks on that account before switching a live domain.
- SQLite is appropriate for a personal portfolio on one server. Large-scale
  multi-server writes, extensive full-text search, and media pagination need
  a separate design; the current public lists load the available records.
- Audio streaming, real-time listening integrations and playback are not
  implemented. Music entries are a visual library with optional HTTPS links.
- HTTPS external media may still be used; migrating them to local storage is
  an operational step requiring access to those original files.
- `server/`, `drizzle/`, and original Manus helper files remain for historical
  context, type inference and regression tests. They are not uploaded, started
  or required by the PHP production runtime. The old audit documents describe
  that earlier architecture and are not deployment instructions for version 2.
