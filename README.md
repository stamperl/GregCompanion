# Click Foundry

Click Foundry is a mobile-first block-tech idle prototype. It starts with survival-style block breaking, inventory crafting, optional guide quests, steam machines, and a first low-voltage milestone.

The game uses original names and presentation while following the spirit of long industrial progression: small inputs, many intermediates, satisfying gates, and deliberately slow early automation.

## Commands

```bash
npm run dev
npm run test
npm run build
npm run lint
```

## iOS App

The app is wired for Capacitor so the same React build can run as a local iOS app.

```bash
npm run build
npm run cap:sync
npm run ios:open
```

`npm run ios:open` needs a Mac with Xcode. Browser builds keep using `localStorage`; the iOS shell uses Capacitor Preferences for local on-device saves.

## Prototype Scope

- Tree breaking with per-block hit progress, log drops, planks, sticks, and a wooden axe speed upgrade.
- Unlimited inventory stacks shown as item counts.
- Minecraft-like inventory crafting: a 2x2 starter grid, a craftable crafting table, and an unlocked 3x3 table grid.
- Recipe book search that can load recipes when materials exist or show what is missing.
- Quest chapters that guide and reward progression without locking crafting.
- Local save/load through browser storage or native iOS storage.
- Slow late-LV automation teaser after the first dynamo.

No offline earnings are included yet; saved progress resumes exactly where it was.
