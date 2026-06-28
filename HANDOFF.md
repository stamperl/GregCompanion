# Click Foundry Handoff

This repo is the current mobile-first idle/clicker prototype that grew out of the original GregTech companion idea. The direction is now an original block-tech idle game with a Minecraft-like survival opening and GregTech-style long progression ratios, but no copied names, logos, textures, or branding.

## Current Product Direction

- Working title: `Click Foundry`.
- Core feel: early survival gathering, grid-based inventory crafting, slow industrial progression, satisfying small milestones.
- Opening loop: hit a tree several times, get logs, craft planks, craft sticks, craft a wooden axe, then chop faster.
- Quests should guide and reward the player, but must not lock progression.
- Progression should eventually move through stone, ore, steam, low voltage, and beyond.
- Saves are local-only through `localStorage`.
- No offline earnings yet.

## Current Implementation

- React + Vite + TypeScript app.
- Main game shell: `src/App.tsx`.
- Main styling: `src/App.css` and `src/index.css`.
- Static content and balance data: `src/game/content.ts`.
- Engine logic: `src/game/engine.ts`.
- Game types: `src/game/types.ts`.
- Engine tests: `src/game/engine.test.ts`.

Implemented systems:

- Inventory resources with unlimited stacks.
- Tree gather target with per-target hit progress.
- Tool lookup with bare hand by default and wooden axe upgrade.
- Minecraft-like 3x3 hand crafting grid that matches recipe ingredient counts.
- Timed crafting queue after a matched craft is started.
- Machine data and slow machine tick support.
- Quest guide page with claimable rewards.
- Save/load migration from older local saves.
- Mobile-first UI with Play and Guide pages.

Important recent decision:

- Quests are optional guide/reward content only.
- Crafting visibility and crafting ability are based on inventory and machine requirements, not completed quests.
- Crafting should feel tactile: tap inventory items into the grid, tap grid slots to remove them, then craft the matched output.
- The Play page should stay playable without visiting the Guide page.

## Current GitHub Repo

Remote:

```bash
https://github.com/stamperl/GregCompanion.git
```

Default branch:

```bash
main
```

Laptop setup:

```bash
git clone https://github.com/stamperl/GregCompanion.git
cd GregCompanion
npm install
npm run dev
```

## Verified Before Handoff

These commands passed after the guide-only quest and crafting-grid changes:

```bash
npm run test
npm run build
npm run lint
```

Browser smoke test also passed:

- Reset save.
- Hit tree until one log drops.
- Confirmed `Split Log into Planks` appears before claiming any quest.
- Put one log into the crafting grid and confirmed output preview changed to `4 Plank`.
- Crafted the matched recipe and confirmed planks arrived after the timed queue.
- Confirmed Guide page is separate from Play page.
- Confirmed 390px mobile viewport has no horizontal overflow.

## Good Next Steps

1. Add a stone loop after the wooden axe:
   - Gather loose stone or break stone blocks.
   - Add a crude pickaxe.
   - Use stone to unlock early furnace/workbench progression.

2. Improve crafting discovery:
   - Keep recipes hidden until the player has seen at least one relevant input/output.
   - Avoid using quests as recipe gates.

3. Add a proper inventory/crafting page:
   - The Play page can stay focused on gathering.
   - Crafting could become its own page once the recipe list grows.

4. Add better feedback:
   - Stronger hit animation.
   - Block crack states.
   - Small sound hooks later if the app becomes a packaged mobile game.

5. Rebalance early timings:
   - Bare hand tree currently takes multiple taps.
   - Wooden axe increases tree damage.
   - The feel should be slow enough to be satisfying, not painful.

## Notes For Future Codex Work

- Preserve original naming and art direction.
- Do not use Minecraft, GregTech, GTNH, or modpack assets directly.
- Prefer small vertical slices over huge content dumps.
- Keep tests close to engine rules when changing gameplay.
- Run `npm run test`, `npm run build`, and `npm run lint` before pushing.
