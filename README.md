# Tsukiharu Depot — Portfolio v2

<img src="client/src/assets/tsukiharu-logo.svg" alt="月春の資材置き場" width="220" height="109">

A personal gallery for works, photography, books, blog posts and a detailed
profile. The quiet blue/pink palette and serif headings are paired with a
content-first home page and a dedicated mobile navigation. Content is edited
through the built-in administrator screen and hosted on XServer using PHP,
SQLite and local image/PDF storage.

## Develop

Use Node compatible with Vite and pnpm 10.4.1. The deployed site requires PHP
8.1+, PDO SQLite, GD, DOM, fileinfo, sessions, Apache rewrites and HTTPS.

```sh
pnpm install --frozen-lockfile
php xserver/manage.php init http://127.0.0.1:5173
pnpm dev:api
# In a second terminal:
pnpm dev
```

## Verify and build

```sh
pnpm check
pnpm test
pnpm build
node scripts/test-xserver.mjs
```

The PHP integration command needs PHP on PATH (or PHP_BIN). It uses local port
8080 and isolated fixtures/media under the ignored `.tools` directory.
Browser QA optionally uses Playwright with installed Chrome; provide
PLAYWRIGHT_MODULE when using a bundled module instead of a project dependency.

### Responsive UI regression check

The UI uses a mobile-first grid: one column below 360px, two columns from
360px, three from 768px, and four from 1200px. Works keeps fewer columns so
summaries remain readable. The compact public menu appears below 768px; the
admin section menu appears below 1024px.

The mobile header stays within reach while scrolling. Its hamburger opens a
six-destination drawer with Japanese descriptions, the current page and contact
details. The drawer supports keyboard/Escape navigation and closes when moving
to the desktop layout. Home starts directly with the record archive;
the editable introduction remains in its About section.

The header uses the supplied SVG logo, with unused outer space removed and a
responsive 144–184px width. It retains the Home link and an accessible site name;
Vite bundles the logo with the production assets. About provides a compact,
keyboard-operable contents disclosure on mobile. Public collection headings,
spacing, metadata and image controls follow shared design rules.

After creating the isolated XServer fixture, run the preview and browser check
in separate terminals:

```sh
node scripts/test-xserver.mjs
node scripts/serve-preview.mjs
# In a second terminal, while the preview is running:
pnpm test:responsive
```

`test:responsive` checks Home, About, Works, Gallery, Library, Blog, an
article, visitor registration, admin and 404 pages at 320, 375, 430, 768, 1024
and 1440px. It also checks long strings, keyboard focus, touch controls and
`prefers-reduced-motion`. Menu checks cover 767/768px resizing, short landscape
viewports, all six destinations, 44px targets, focus trapping and backdrop
dismissal. Screenshots and the report stay in ignored `.tools`
fixtures. See [the UI/UX audit](docs/UI-UX-AUDIT.md) for the detailed findings
and verification limits.

Latest local validation: TypeScript and the production build passed, all 91
Vitest tests in 26 files passed, and the Chrome responsive/stress regression
passed 186 cases. The existing PHP/API integration and browser flows also
passed. Physical phones, Safari/Firefox, screen readers and the deployed
XServer environment remain unverified.

Upload the contents of `dist/public` to `public_html`. Store configuration,
SQLite and sessions **outside** the web root; preserve server uploads on future
releases. No persistent Node process or paid CMS/storage service is needed.

For a UI-only release, run `pnpm build` again and upload only the refreshed
contents of `dist/public`. Do not upload local private settings, SQLite files or
sessions, and do not overwrite the server's persistent `uploads` directory.

## Documentation

- [XServer deployment, migration and operation](docs/XSERVER.md)
- [Implementation and validation](docs/IMPLEMENTATION.md)
- [UI/UX and responsive audit](docs/UI-UX-AUDIT.md)
- [Historical README (previous Manus/Node runtime)](docs/LEGACY-README.md)

Bookmark `/admin` for owner access. Its URL is intentionally absent from the
public footer; password-based server sessions enforce the access boundary.
The profile, activities, Works PDFs, blog inline images, photography and books
are editable without source changes. Public comments use unverified display-name
sessions, not external social accounts. See the deployment guide for limitations.

## Release

Version 2.0.0. Build output, local tools, SQLite, sessions, configuration, exports
and generated media are excluded from Git. Existing TypeScript server sources
remain for historical reference and typed contracts; they are excluded from the
PHP deployment.
