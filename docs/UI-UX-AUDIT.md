# UI/UX and responsive audit

## Before changes

The active public shell is `TsukiLayout`; Home, Works, Gallery, Library, Blog,
article, About and visitor registration share it. Admin has a separate shell,
Radix tabs/sheets/dialogs and the existing profile/upload/editor components.
Data flows through the existing tRPC client to the PHP API and SQLite. These
contracts, content and persistence are outside the scope of this visual repair.

`index.css` imports successive generations of room, desktop, flat portfolio,
gallery and water-blue styles. The current visual concept is a quiet archive:
blue ink, pale blue surfaces, pink accents and serif headings. Existing breakpoints
vary between 640, 700, 720, 760 and 900px.

Findings from source inspection and the initial Chrome screenshots:

| Problem | Evidence / impact | Planned repair |
| --- | --- | --- |
| Home thumbnail class collides with admin thumbnail | On 320px, public thumbnails collapse to 44px height; desktop uses a 218px minimum regardless of column width | Give public thumbnails a square frame independent of image dimensions and admin rules |
| Too many columns around tablet width | 768px keeps four small public/work/photo columns | Use small-screen, tablet and desktop grids with minimum-zero tracks |
| Duplicate article padding | The article narrows again inside the shell and adds large header padding | Use one centered reading column and fluid spacing |
| Long strings can exceed grid/flex items | Contact addresses, content headings, profile items and comment metadata lack consistent shrink/wrap rules | Allow items to shrink and wrap; do not conceal document overflow |
| Fixed admin widths and toolbar | Five tabs compete with a section heading; password popup is 320px and shifted on small screens; toolbar lacks wrapping | Earlier menu switch, contained password form, wrapping toolbar and one-column mobile forms |
| Reproduced admin overflow | Initial 320px Chrome viewport: Blog scroll width 357px, Works 399px, Gallery 400px; editor controls also exceed 375/430px | Shrinkable tracks, wrapping controls and menus at intermediate widths |
| Small controls / metadata | Navigation, PDF links, comment actions and close icons vary in size; some text is below 11px | Shared text scale, visible focus and at least 44px primary touch controls |
| Layered decoration and spacing | Article interactions retain blur/shadows from the room design; gaps and radii differ across sections | Shared tokens; quiet borders and surfaces, no new cards |
| Motion varies between components | Thumbnail zoom, tilt, fades and sheet movement have separate timing | Keep short restrained transitions; respect reduced motion and coarse pointers |
| Long unbroken skill names | Stress test expands the 320px document to 1742px | Constrain skill tags and allow word wrapping |
| Gallery focus restoration | Closing a manually opened image dialog does not return focus to the photo button | Store the originating button and restore focus on dialog close |
| Admin secondary/hover colors | Broad legacy `bg-*` selectors also match `hover:bg-*` on ghost buttons; the section menu can become white-on-white after closing | Separate primary and secondary surfaces and explicitly preserve menu contrast in hover state |

## Design rules

- Preserve the existing blue/pink palette, serif titles and archive layout.
- Shared spacing steps: 4, 8, 12, 16, 24, 32 and 48px; fluid section spacing.
- Public shell: maximum 1180px including gutters, fluid 16–32px gutters.
- Body copy: 15–16px, line-height 1.8–1.9; metadata at least 12px.
- Radius: 8px for controls and image frames, 12px for existing panels; restrained
  shadows only for floating dialogs, not every content item.
- Public grid: one column below 360px, two from 360px, three from 768px,
  four from 1200px. Works uses one/two/three columns for readable descriptions.
- Compact navigation below 768px; admin section menu below 1024px.
- Fix intrinsic sizing, wrapping and track widths instead of hiding horizontal
  overflow on `html` or `body`.

## Verification

Browser fixtures live under ignored `.tools` directories and do not modify real
configuration or data. The new `portfolio-ui.css` owns current layout decisions,
the spacing/type/color/radius tokens, progressive grids and control sizing.
Legacy component styles remain available; the PHP API, queries, mutations,
existing content fields and storage have not changed.

The initial 90-case layout scan completed with no document/element overflow
after repair. A stronger regression script also checks long unbroken headings,
URLs, skill names, descriptions and comments; navigation overlap and text
containment are measured separately. It includes real cover-image book rows,
all five admin sections, a password form, a short-height menu, keyboard focus
and Chrome touch events. Final results are recorded below after all checks.

### Reproducing the browser checks

1. Run the existing build and `test:xserver` to create an isolated PHP/SQLite
   fixture and `.tools/preview.json`.
2. Run `node scripts/serve-preview.mjs` in one terminal.
3. Provide Playwright through an installed module or the `PLAYWRIGHT_MODULE`
   environment variable, then run `pnpm test:responsive` in a second terminal.
4. Screenshots and the dimension report are written to
   `.tools/responsive-verified`. The test-only book and comments are written
   solely to the validated ignored fixture.
5. Stop the preview server when finished.

The layout tests cover 320, 375, 430, 768, 1024 and 1440px. Public pages include
Home, About, Works, Gallery, Library, Blog, an article, visitor registration,
admin login and the 404 page. Modal/menu checks use actual browser events;
motion assertions use `prefers-reduced-motion: reduce`.

### Completed checks

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | Passed |
| Existing Vitest suite | 26 files, 91 tests passed |
| Production build and XServer packaging | Passed; output in `dist/public` |
| Existing PHP checks / API integration | Passed: transport, dates, authentication, CRUD, media/PDF, comments, likes, export/import and password/rate limits |
| Existing browser flow | Passed: admin login, profile save, Blog input/save, Works PDF, Gallery viewer, Home navigation, focus and motion |
| Responsive and stress regression | 186 cases passed at all six specified widths; final screenshots/report generated by `test:responsive` |

The responsive regression checks normal and long-content public layouts, all
admin sections and the expanded password form. No document overflow, elements
beyond the viewport, tested text exceeding its own box, or header navigation
overlap were found. The compact admin menu retains its readable foreground and
background after opening/closing at narrow widths. Keyboard skip navigation, focus trapping/return, Escape,
touch menu/photo controls and reduced-motion behavior passed. Primary actions
and secondary/ghost actions have distinct, readable colors; layout tests do not
use a blanket `overflow-x: hidden` workaround.

### Verification limits

Chrome was run locally in headless mode, with mobile touch emulation. This does
not verify physical iOS/Android devices, Safari/Firefox rendering, a screen
reader, or the deployed XServer environment. Fixture pictures/content are QA
samples rather than the user's production library. The existing local
`xserver/config.php` and deletion of `xserver/config.example.php` were preserved
as user-owned changes.

## Dedicated mobile UI and portfolio presentation

The follow-up review found an existing hamburger drawer, but it retained a
modal/scroll lock after resizing to desktop. The shared navigation also omitted
the published Library route, and Home's “Gallery” title did not distinguish it
from the photo collection or introduce the author.

The revision keeps the pale blue paper, blue ink, Mincho headings and pink
accent. Home starts directly with the record archive. At the user’s request,
the large introduction, catchphrase, actions and paired visual were removed;
the editable introduction remains in the existing About section. Every public record
still appears in the same update ordering; API contracts and storage are intact.

The mobile header is sticky below 768px. Its drawer has six destinations,
Japanese purpose labels, current-page indication (including nested Blog
articles), a contact footer, 44px-or-larger controls, safe-area spacing and a
scrollable short-height layout. Radix provides focus trapping and Escape;
desktop resizing closes the drawer and focuses a visible desktop link.

Works/Gallery/Library/Blog share the new `PortfolioHeading` component. Work
categories, image enlargement affordances, flat reading lists and a restrained
About layout strengthen hierarchy without adding application features. Public
archive images load lazily. Current rules remain in
`portfolio-ui.css`; legacy component rules and admin functionality are retained.

The browser regression now adds multi-step Tab/Shift+Tab, close/backdrop focus
return, 767→768→767px resizing, a 667×375px landscape menu, all six touch
destinations and long content strings. About has a native, keyboard-operable
mobile contents disclosure with all eight existing section anchors.

The final run exposed menu links intercepting the fixed close control after
keyboard scrolling. Its layer now stays above those links, and normal clicks
pass without forcing interaction. Valueless `data-page-transition-off`
attributes are also respected, keeping menu and section navigation immediate.

Final verification passed: TypeScript, 91 Vitest tests, the production build,
PHP/API integration, the existing browser flow and 186 responsive/stress cases.
No document overflow, tested text containment errors, header overlap or browser
page errors were reported. Menu focus/resize/landscape, all six touch routes,
About contents, photo viewer, skip navigation and reduced motion passed in
local Chrome. The verification limits above still apply.

The header now uses the owner's supplied SVG logo in place of the text masthead
and CSS moon mark. Its viewBox removes unused surrounding space while preserving
the artwork. The image scales from 144px to 184px, keeps its aspect ratio and
retains a descriptive accessible name and the existing Home link. Importing it
through Vite includes the SVG in the versioned production assets.

## One-row Home archive — 2026-10-10

Home previously combined categories by update time and displayed up to 12 cards.
It now selects each category's newest entry before selecting another entry from
that category, producing at most four previews. The existing grid breakpoints
show 1/2/3/4 cards at below 360/from 360/from 768/from 1200px, respectively.
CSS uses `display: none` for remaining previews, keeping both layout and keyboard
focus to one row. Category pages retain their full lists, and the lower latest
updates list retains its chronological ordering independently of the preview.

TypeScript, the production build, all 94 Vitest tests in 26 files and the new
category selection tests passed. Chrome verified 320/359/360/375/430/767/768/
1024/1199/1200/1440px, resizing, category balance, sparse/empty data, keyboard
visibility and unchanged recent updates using mocked public API reads.
Screenshots are in ignored `.tools/home-row-verified`.

The local PHP executable was blocked by Windows application control policy.
Consequently the PHP-backed full responsive suite could not be rerun for this
revision; its existing script now also checks Home's card count and row alignment.
The frontend browser checks do not verify PHP, persistence or production data.
