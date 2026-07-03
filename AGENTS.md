# Repository Guidelines

## Project

Click Foundry is a mobile-first React/Vite/TypeScript block-tech idle prototype. Keep the presentation original: do not use Minecraft, GregTech, GTNH, modpack names, copied textures, logos, or branded UI art.

## Setup

Use Node/npm.

```bash
npm ci
```

## Common Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
```

Run `npm run lint`, `npm run test`, and `npm run build` before considering a coding task complete unless the change is docs-only or the user asks for a narrower check.

## Code Map

- `src/App.tsx`: main game shell and UI flows.
- `src/App.css` and `src/index.css`: styling, pixel icons, machine glyphs, mobile layout.
- `src/game/content.ts`: static resources, recipes, machines, quests, progression data.
- `src/game/engine.ts`: game state transitions and engine logic.
- `src/game/types.ts`: core TypeScript types.
- `src/components/InventorySlots.tsx` and `src/components/GameIcons.tsx`: reusable item, machine, and icon rendering.

## Product Rules

- Quests guide and reward progression; they should not hard-lock crafting progression.
- Saves are local-only through browser storage or Capacitor Preferences.
- Keep UI mobile-first and dense enough for repeated play.
- Item and machine art should remain original CSS/pixel-style artwork unless the user explicitly asks for bitmap assets.
- Avoid unrelated refactors while changing game balance, recipes, or UI.
