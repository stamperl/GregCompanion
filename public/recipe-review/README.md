# Recipe Review Workbench

This is a developer-only review page. Public release builds remove the
`recipe-review` directory.

## Open

```bash
npm run recipes:review
npm run dev
```

Open `/recipe-review/index.html` on the local Vite server.

## Review

- Switch between all crafting recipes and all machine-process recipes.
- Select recipes from the icon catalogue.
- Tap a grid or output slot to choose a replacement from the game icon library.
- Add machines such as the Primitive Furnace or Well directly to any of the nine
  crafting-grid cells. Machine cells are consumed by the craft; `requiredMachine`
  remains the separate non-consumed station requirement.
- Choose entries such as `Any Pestle & Mortar` to mark a reusable tool family.
  The exported recipe uses the base `mortar` catalyst and durability cost; the
  game accepts the stone, iron, or bronze member of that family.
- Use the mirror, rotate, compact, shaped/shapeless, clear, and revert controls.
- Clone any crafting or machine recipe to create a new alternative route with a
  unique recipe ID and the same output.
- Mark recipes as approved or needing work.
- Drafts and review state remain in local browser storage.

## Handoff

Export produces a `click-foundry-recipe-review-YYYY-MM-DD.json` file containing:

- Stable recipe IDs.
- Original and edited recipe objects, including newly added alternatives.
- Structural validation results.
- Approved and flagged review states.

Give that JSON file to Codex. Codex applies the `after` values to the matching
entries in `src/game/content.ts`, updates affected quests or tests, regenerates
this catalogue, and runs the repository validation gates. The review site never
writes directly to game source files.
