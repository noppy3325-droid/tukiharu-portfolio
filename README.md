# Tsukiharu Depot — Portfolio v2

A personal gallery for works, photography, books, blog posts and a detailed
profile. The existing quiet blue/pink design is preserved. Content is edited
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

Upload the contents of `dist/public` to `public_html`. Store configuration,
SQLite and sessions **outside** the web root; preserve server uploads on future
releases. No persistent Node process or paid CMS/storage service is needed.

## Documentation

- [XServer deployment, migration and operation](docs/XSERVER.md)
- [Implementation and validation](docs/IMPLEMENTATION.md)
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
