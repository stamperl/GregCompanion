# Click Foundry

Click Foundry is a mobile-first block-tech idle prototype. It starts with survival-style block breaking, inventory crafting, optional guide quests, steam machines, and a first low-voltage milestone.

The game uses original names and presentation while following the spirit of long industrial progression: small inputs, many intermediates, satisfying gates, and deliberately slow early automation.

## Commands

```bash
npm run dev
npm run dev:host
npm run test
npm run build
npm run lint
npm run check
npm run dev:bump
npm run release:home-dev
npm run release:remote-dev
npm run release:full -- --revision 0.2.0 --title "Patch title" --note "Patch note"
```

`npm run dev` starts the normal hot Vite server. `npm run dev:host` exposes that hot server on the local network for phone testing. `npm run dev:bump` increments the dev-only home-screen revision in `src/dev-manifest.json`; it does not change the public release revision.

`npm run release:home-dev` builds the app as a home-dev production preview and hosts it locally on port 4173. It prints both localhost and LAN URLs, and the local save API is available in this preview server.

`npm run release:remote-dev` is the remote test lane. Run it from a clean committed worktree; it runs lint, tests, and build, then pushes the current commit to `origin/remote-dev`. GitHub Pages publishes that build under `/GregCompanion/remote-dev/` without changing the public release.

`npm run release:full` is the guarded public GitHub Pages release path. Run it from a clean `main` branch after committing game changes. Pass a revision, title, and one or more patch notes; it stamps `src/release-manifest.json`, runs lint/tests/build, commits the release manifest, pushes `main`, then watches the Pages workflow when the GitHub CLI is available.

The older `npm run deploy:test` and `npm run deploy:release` commands remain as aliases for the home-dev and full-release lanes.

## Release Lanes

| Lane | Command | Where it is playable | Home screen channel |
| --- | --- | --- | --- |
| Home test dev | `npm run release:home-dev` | Local PC/LAN URL printed by the command | `Home dev` |
| Remote test dev | `npm run release:remote-dev` | GitHub Pages `/remote-dev/` path | `Remote dev` |
| Full release | `npm run release:full -- --revision 0.2.0 --title "Patch title" --note "Patch note"` | Main GitHub Pages URL | `Full release` |

Patch notes and public revision numbers are shown on the home screen through `src/release-manifest.json`. Home-dev uses `src/dev-manifest.json` for a separate `dev.x` revision, and remote-dev builds override the revision at build time so testers can immediately see they are not on the public release.

## iOS App

The app is wired for Capacitor so the same React build can run as a local iOS app.

```bash
npm run build
npm run cap:sync
npm run ios:open
```

`npm run ios:open` needs a Mac with Xcode. Browser builds keep using `localStorage`; the iOS shell uses Capacitor Preferences for local on-device saves.

For the GitHub Pages version on iPhone, open the site in Safari, use Share, then Add to Home Screen. The web app installs as a standalone shortcut and uses the phone browser's local storage for saves.

## Prototype Scope

- Tree breaking with per-block hit progress, log drops, planks, sticks, and a wooden axe speed upgrade.
- Unlimited inventory stacks shown as item counts.
- Minecraft-like inventory crafting: a 2x2 starter grid, a craftable crafting table, and an unlocked 3x3 table grid.
- Recipe book search that can load recipes when materials exist or show what is missing.
- Quest chapters that guide and reward progression without locking crafting.
- Local save/load through browser storage or native iOS storage.
- Slow late-LV automation teaser after the first dynamo.

No offline earnings are included yet; saved progress resumes exactly where it was.
