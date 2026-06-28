# ME/NEI-Style Crafting Terminal Plan

## Summary

Replace the current Inventory, Table, and Recipes pages with one mobile-first Crafting Terminal inspired by ME Crafting Terminal and NEI behavior. Keep Gather and Guide separate. The terminal is available from the start and becomes the main storage, crafting, and recipe interface for future large item counts.

## Key Changes

- Add one Terminal page that replaces Inventory, Table, and Recipes.
- Terminal layout:
  - Searchable stored-item grid.
  - 3x3 crafting grid.
  - Craft output slot.
  - Recipe and usage browser panel.
  - Clear grid button.
  - Return grid items to storage button.
- Keep Gather for resource collection.
- Keep Guide for optional quest rewards.
- Use original names and visuals, but match the ME/NEI interaction model closely.

## Crafting Behavior

- Stored items appear in a searchable terminal inventory list from the start.
- Tapping a stored item places one item into the crafting grid.
- Tapping a filled crafting slot returns that item to storage.
- If the grid matches a recipe, the output slot shows the result.
- Tapping the output starts the existing timed craft queue.
- Recipe lookup supports:
  - Search by item, recipe name, output, or ingredient.
  - Recipe view for how to craft an item.
  - Usage view for what an item is used in.
  - Load recipe action that fills or ghost-fills the 3x3 grid.
  - Missing-material messages.
- V1 does not do recursive autocrafting.

## Data And Interfaces

- Extend recipes with optional terminal metadata:
  - `stationType`: `hand | craftingTable | furnace | steam | lv`
  - `recipeType`: `crafting | processing | machine`
  - optional `pattern?: ResourceId[]`
- Keep existing inputs, outputs, required machines, and timed craft queue.
- Add helpers for:
  - Grid matching.
  - Item and recipe search.
  - Recipe lookup by output.
  - Usage lookup by input.
  - Missing material calculation.
  - Recipe loading into the grid.

## Test Plan

- Search finds recipes by output and ingredient.
- Usage lookup finds recipes consuming an item.
- Loading a craftable recipe fills the grid.
- Loading an uncraftable recipe reports missing materials.
- Matching grid output starts timed craft and consumes resources.
- UI smoke:
  - Gather logs.
  - Open Terminal.
  - Search plank.
  - Load log-to-planks recipe.
  - Craft planks.
  - Search stick and see missing planks if unavailable.
  - Confirm no mobile horizontal overflow.

## Assumptions

- Terminal is available from the start.
- Gather and Guide stay separate.
- Current crafting table can remain as progression content, but it no longer unlocks the main terminal UI.
- Copy interaction patterns only, not AE2/NEI branding, names, textures, icons, or copyrighted UI art.
