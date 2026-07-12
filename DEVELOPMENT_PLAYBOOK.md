# Click Foundry Development Playbook

This is the operating guide for developing Click Foundry without repeatedly rebuilding the same feature. It is both a roadmap template and an agent cheat sheet. Use it before adding content, changing progression, building machine UI, generating art, or preparing a release.

## 1. Product Direction

Click Foundry is a phone-first industrial idle game built around understandable production chains, deliberate progression, and satisfying automation.

Every addition must support at least one of these goals:

- Introduce a useful material, process, machine, or automation step.
- Resolve a visible production bottleneck.
- Teach the player an existing system at the correct time.
- Create a meaningful reason to improve the factory.
- Prepare a clear dependency for the next technology tier.

Do not add content only because it exists in another industrial game. Names, artwork, interfaces, progression, and presentation must remain original.

## 2. Non-Negotiable Rules

- Design for the phone viewport first. Desktop appearance is secondary.
- Engine state is the source of truth. UI animation must display real stored amounts, flow, progress, power, and routing.
- Quests guide and reward progression; they do not hard-lock recipes or machines.
- Existing saves must migrate without losing inventory, fluids, EU, Steam, machine progress, assignments, batteries, or factory layouts.
- New item and machine icons are generated as separate source images, cropped separately, checked separately, and approved before runtime integration.
- Do not use a contact-sheet crop as the final icon source when a separate original can be generated.
- Do not ship a machine terminal made by placing live controls over duplicated text or meters baked into its background art.
- Machine artwork must contain empty chambers, tanks, gauges, slots, and displays wherever live UI data will be overlaid.
- Shared meters fill from the bottom and use the established smooth 420ms transition.
- Steam, fluid, and EU buffers use the clean vessel display: compact header, large uninterrupted gauge, capacity footer, and no decorative centre needle.
- Every placeable factory item must have an intentional tap and wrench interaction. Casing blocks do not open meaningless terminals.
- Run lint, all tests, and the production build before work is called complete.
- Do not push remote dev or public release until visual approval and validation gates pass.

## 3. Source Of Truth

| Concern | Primary files |
| --- | --- |
| Resources, recipes, machines, quests, progression | `src/game/content.ts` |
| Engine transitions, networks, machine processing | `src/game/engine.ts` |
| Core state and content types | `src/game/types.ts` |
| Save migration and persistence | `src/game/saveStorage.ts` and related tests |
| Main game flows and terminal composition | `src/App.tsx` |
| Shared UI and responsive styling | `src/App.css`, `src/index.css` |
| Runtime icon rendering | `src/components/GameIcons.tsx`, `src/components/InventorySlots.tsx` |
| Machine artwork mapping and preloading | `src/components/machineUiAssets.ts` |
| Runtime item and machine icons | `public/game-icons/resources`, `public/game-icons/machines` |
| Runtime machine artwork | `public/game-ui` |
| Approval pages and evidence | `public/icon-reviews` |
| Dev revision | `src/dev-manifest.json` |
| Public release notes and revision | `src/release-manifest.json` |

Before editing, inspect the relevant content IDs, types, tests, UI branch, art mapping, and current save schema.

## 4. Feature Development Sequence

Use this order for every feature or content family. Do not start with final artwork.

1. **Define the purpose**
   - State the player problem being solved.
   - Name the tier and prerequisite milestone.
   - Identify what the feature consumes, produces, unlocks, or automates.
   - Identify the next feature that depends on it.

2. **Map the dependency chain**
   - List gatherable inputs.
   - List intermediate items and fluids.
   - List recipes and processing stations.
   - List required power, Steam, tools, and routing.
   - Confirm the chain can be completed without quest rewards.

3. **Define content IDs and data**
   - Add stable IDs and labels.
   - Add types before behaviour when the model needs extension.
   - Reuse established recipe and machine structures.
   - Avoid renaming shipped IDs; migrate explicitly if unavoidable.

4. **Implement engine truth**
   - Add transitions, storage, processing, networks, or assignment behaviour.
   - Add selectors for every value the UI needs to display.
   - Never infer live flow or consumption from an animation flag.

5. **Add focused tests**
   - Test valid operation.
   - Test missing input, power, fluid, route, capacity, and blocked output.
   - Test network limits and mixed contents where applicable.
   - Test save migration for changed state.

6. **Add recipes and progression placement**
   - Confirm every ingredient is obtainable first.
   - Confirm outputs have a use when introduced.
   - Compare cost, time, and throughput with adjacent tiers.
   - Add content validation for unreachable or circular chains.

7. **Update quests and game wording**
   - Introduce the feature shortly before it is needed.
   - Teach one new concept per quest step.
   - Use objectives the engine can verify reliably.
   - Reward momentum, not mandatory progression components.
   - Rewrite nearby quest and UI wording so the sequence reads naturally as one journey.

8. **Generate and approve icons**
   - Follow the icon pipeline in section 8.

9. **Build the UI from real data**
   - Follow the machine terminal process in section 9.

10. **Validate the complete player path**
    - Start from the preceding milestone.
    - Obtain inputs, craft components, place/configure the machine, run it, collect output, and complete related quests.
    - Verify missing-item links lead to the correct recipe or gather target.

11. **Export evidence and review independently**
    - Capture real idle, active, and filled/connected states.
    - Review without using previous comments as the checklist.
    - Fix all findings and repeat the review.

12. **Release through the correct lane**
    - Home dev, remote dev, and full release have separate gates.

## 5. New Item Plan

For every new item, define:

- Stable `ResourceId` and display name.
- Material family and technology tier.
- Form: ore, crushed material, dust, ingot, plate, rod, wire, cable, component, tool, battery, fluid container, or finished part.
- Stack and durability behaviour.
- First source and all alternative sources.
- Every recipe that consumes it.
- Why the player needs it now.
- Quest introduction and guide placement.
- Inventory, crafting, recipe-browser, terminal, and missing-material behaviour.
- Dedicated icon source, crop, approval, and runtime PNG.

### Item Definition Of Done

- Item is obtainable without debug state.
- Item has at least one intentional use when introduced.
- Recipe browser links work in both directions.
- Missing quantities highlight the named ingredient correctly.
- Icon is original, readable at slot size, transparent, tightly cropped, and validated.
- Content tests and build pass.

## 6. New Recipe Plan

For every recipe, record:

- Recipe ID and display group.
- Inputs, quantities, secondary inputs, fluid inputs, fuel, and tools.
- Output and quantity.
- Station or machine.
- Duration and Steam/EU cost.
- Intended tier and prerequisite recipe.
- Manual fallback, if one should exist.
- Throughput compared with the previous and next method.

### Recipe Rules

- A recipe must not depend on its own output chain unless a valid starter path exists.
- Manual recipes may be slower but must remain understandable.
- Machine processing should be worthwhile without making previous progression meaningless immediately.
- Multi-output and fluid recipes must expose every output clearly.
- Recipe descriptions should not move the layout; use fixed regions or omit nonessential prose.
- Cost, time, station, input, and output must be visible in a stable arrangement.
- Missing-item actions must navigate to the exact item or process needed.

### Recipe Validation

- Load the recipe from search.
- Verify input names and quantities.
- Verify two- and three-line ingredient names do not shift the panel.
- Verify manual grid orientation and machine process direction.
- Verify output collection and inventory capacity behaviour.
- Verify Steam/EU cost and time match engine values.

## 7. New Machine Plan

For every machine, define before art or UI work:

- Stable `MachineId`, name, tier, category, and placeability.
- Placement size and factory-floor progression requirement.
- Input slots, output slots, fluid slots, fuel slots, and battery slots.
- Internal item, fluid, Steam, and EU capacities.
- Power/Steam draw and throughput.
- Supported recipes or autonomous behaviour.
- Input/output faces and wrench configuration.
- Idle, active, blocked, disconnected, full, and missing-input states.
- Save-state additions and migration.
- Terminal type and artwork brief.

### Machine Behaviour Checklist

- Placement and removal preserve contents correctly.
- Wrench view changes real routing state.
- Input insertion and output collection work on every slot.
- Buffers fill even when their network allows charging but no valid recipe is active.
- Machines stop safely when input, output space, Steam, EU, fluid, or route is unavailable.
- Current draw and flow selectors report engine truth.
- Network throughput respects the weakest component.
- Mixed fluids are prevented where a one-fluid rule applies.
- Utility infrastructure remains generic enough for future fluids and resources.

## 8. Icon And Artwork Pipeline

### Item And Machine Icons

1. Write a short original-art brief with material, silhouette, viewing angle, and tier cues.
2. Generate each icon as a separate source image.
3. Do not generate a sheet and treat automatic crops as approved final icons.
4. Remove the background and preserve transparency.
5. Crop each icon individually around visible pixels with consistent breathing room.
6. Normalise runtime icons to `128x128` unless the rendering system changes.
7. Inspect at original size and at actual inventory-slot size.
8. Check silhouette, contrast, colour-family distinction, edge halos, accidental text, and clipped pixels.
9. Add candidates to an approval page with approve/reject/comment controls.
10. Copy only approved icons to the runtime directories.
11. Run `npm run icons:check`.

### Machine UI Artwork

- Generate one machine-specific image where the central mechanism benefits from detailed bitmap art.
- Artwork must not contain live values, labels, slots, meters, warnings, progress, or duplicated UI text.
- Tanks, pipes, chambers, and gauges must be visually empty in the base image.
- Leave intentional clear regions for live controls and values.
- Use JPEG for opaque photographic/painted panels and WebP/PNG only when transparency or format quality justifies it.
- Size for phone display. A source width around `768px` is normally sufficient for a terminal panel.
- Inspect compression in the actual terminal, not only as a standalone image.
- Keep `public/game-ui` free of superseded versions once the replacement is accepted.

### Asset Gate

- Every runtime filename is referenced.
- Every referenced filename exists.
- No obsolete shared panel remains after a dedicated replacement ships.
- Runtime art is visually checked at phone size.
- Asset sizes are recorded before release.
- Review archives are not gameplay preload assets.

## 9. Machine Terminal UI Process

Build the data hierarchy before generating final artwork.

### Shared Terminal Structure

1. Compact header with tier, machine name, and close control.
2. Storage strip only when the player needs selectable inventory items.
3. Selected-item feedback only when an insertion action requires it.
4. Top status strip for the most important current state.
5. Central mechanism artwork.
6. Clearly labelled interactive inputs and outputs.
7. Large live buffer instruments integrated beside the mechanism.
8. Uses, time, power/pressure, routing, and blocked-state readouts.
9. Smooth full-width load/progress bar at the bottom.

### Visual Families

- **Steam:** rugged bronze/iron construction, heat, pipes, pressure, and cool Steam gauges.
- **LV:** cleaner dark metal, cyan illumination, electrical meters, and assembler-style smooth load fills.
- **Storage:** inventory-first layout with no fake processing fields.
- **Pipes:** generic contents, amount, flow, limit, and direction; liquid must remain inside the bore.
- **Cables:** live EU flow, amperage, loss, internal EU, and energized state.
- **Multiblocks:** larger central chamber and more consequential instrumentation within the same phone boundary.

### Buffer Standard

- Compact type/value header.
- Large uninterrupted vessel.
- Flat liquid/energy surface filling from the bottom.
- Capacity footer.
- 420ms cubic-bezier transition.
- No white centre needle, ruler texture, decorative animation, or movement when the value is unchanged.
- Steam, fluids, and EU use distinct but consistent fill colours.

### UI Validation

- Use real engine states, not mocked CSS-only values.
- Test idle, active, partially filled, full, blocked, missing-input, and disconnected states.
- Test `590x1280` and a narrower `390x844` viewport.
- No page scrolling, clipped values, unintended horizontal overflow, or overlapping controls.
- Touch targets remain usable.
- Output slots are centred.
- Every input slot is visibly interactive and actually works.
- Long values and multi-line names do not resize the terminal.
- Background art and animated masks align at every fill percentage.

## 10. Quest And Progression Plan

Treat quests as the player-facing explanation of the dependency graph.

### Quest Structure

- Introduce gathering before processing.
- Introduce manual crafting before automation.
- Introduce a machine before requiring its output in several places.
- Introduce routing and buffers before a network becomes complicated.
- Introduce a new tier with one clear production goal.
- End chapters with a visible factory capability, not an arbitrary inventory count.

### Quest Update Rules

- When a recipe changes, review every quest that names its ingredients, station, quantity, or output.
- When a machine moves tier, update prerequisite quests and nearby explanatory copy.
- When an item is renamed, update quests, recipe labels, guide text, missing-item links, and tests together.
- Avoid instructions that describe UI position; describe the player action and desired result.
- Keep wording short enough for phone panels.
- Verify objective completion from a fresh save and a migrated save.

### Progression Audit

For each chapter, answer:

- What new capability does the player gain?
- Which earlier bottleneck does it solve?
- Which resources must already be renewable or obtainable?
- Is there a valid route without quest rewards?
- Does the player know why the next machine matters?
- Can a player recover after spending rewards inefficiently?

## 11. Save Compatibility

Any change to persisted game state requires:

- A schema or revision decision.
- Default values for missing fields.
- Migration from every currently supported shape.
- Preservation of inventory, storage slots, battery slots, machine buffers, fluids, EU, Steam, progress, quests, assignments, routing, and layout.
- Clamping only when the new physical capacity is genuinely lower.
- Migration tests and a real old-save smoke test.

Never solve a migration problem by silently resetting the factory.

## 12. Testing Strategy

### During Iteration

Use the narrowest relevant checks:

```bash
npm run check:changed
npm run test:content
npm run test:engine
npm run test:save
npm run check:fast
```

### Final Gate

```bash
npm run icons:check
npm run lint
npm run test
npm run build
```

Also complete phone browser testing for UI or interaction changes.

### Required Evidence By Change

| Change | Required evidence |
| --- | --- |
| Item or icon | Individual source, crop inspection, slot-size preview, icon validation |
| Recipe | Loaded recipe view, missing-input state, successful craft/process |
| Machine | Idle, active, filled/connected, blocked, and wrench states |
| Quest | Fresh progression path and objective completion |
| Save model | Migration test and preserved-state comparison |
| Layout | Screenshots at both target phone viewports |
| Asset optimisation | Before/after bytes and in-game visual comparison |

## 13. Independent Review Loop

Approval is not the same as absence of CSS overflow.

1. Export real game states.
2. Review hierarchy, alignment, gameplay clarity, interaction affordance, animation, artwork integration, phone fit, and consistency.
3. Write findings without consulting previous rejection comments.
4. Compare findings with user feedback.
5. Fix the underlying shared component when the issue repeats across machines.
6. Re-export affected states.
7. Run a complete responsive audit.
8. Repeat until a full review produces no actionable findings.

Do not describe a pass as clean when obvious visual composition problems remain.

## 14. Performance And Asset Budget

- Record runtime image totals after each major UI family.
- Keep opaque panel artwork compressed and phone-sized.
- Avoid multi-megabyte PNG files when transparency is not required.
- Preserve eager terminal preloading for the current game size, but revisit lazy loading as content grows.
- Re-run cold/warm navigation and payload benchmarks after a major art expansion.
- Treat `public/icon-reviews` as a review archive, not a runtime preload source.
- Remove unreferenced runtime assets before release.

Current guidance:

- Runtime icons: `128x128` transparent PNG.
- Opaque terminal artwork: normally `768px` wide JPEG at high quality.
- Runtime asset folder: zero unexplained files.

## 15. Release Lanes

### Home Dev

Use for local phone testing:

```bash
npm run dev:bump
npm run release:home-dev
```

### Remote Dev

Use after approval and a committed worktree:

```bash
npm run dev:bump
npm run check
npm run release:remote-dev
```

### Full Release

Use only after remote-dev acceptance:

```bash
npm run release:full -- --revision <version> --title "<title>" --note "<player-facing change>"
```

Release notes describe player-visible gameplay changes, not internal CSS or refactoring work.

## 16. Agent Start Checklist

Before changing code, an agent should answer:

- What exact player outcome is requested?
- Which existing pattern is the baseline?
- Which IDs, recipes, quests, engine paths, UI branches, saves, and tests are affected?
- Is artwork required, and does it need live empty regions?
- What is the smallest complete implementation boundary?
- What evidence will prove the feature works on a phone?

Then:

1. Read `AGENTS.md`, this playbook, and relevant source files.
2. Inspect `git status --short` and preserve unrelated changes.
3. Implement engine truth before presentation.
4. Update content, quests, wording, and tests as one coherent change.
5. Generate every icon separately and pass the approval pipeline.
6. Build machine UI against real idle/active/filled states.
7. Perform an independent visual review.
8. Run the final validation gate.
9. Bump the dev revision before committing development work.
10. Push only through the requested release lane.

## 17. Feature Planning Template

Copy this section into an issue or working plan:

```markdown
# Feature: <name>

## Player Purpose
- Problem solved:
- Tier:
- Prerequisite milestone:
- Capability unlocked:

## Dependency Chain
- Sources:
- Intermediate items:
- Recipes:
- Machines:
- Power/Steam/fluids:
- Outputs and uses:

## Data And Engine
- New IDs/types:
- State changes:
- Selectors:
- Save migration:
- Engine tests:

## Progression And Quests
- Introduction point:
- Quest changes:
- Rewards:
- Nearby wording updates:
- Fresh-save path:

## Art
- Separate item icons:
- Separate machine icon:
- Terminal artwork brief:
- Cropping and approval page:
- Runtime size target:

## UI
- Terminal family:
- Slots and controls:
- Buffers and readouts:
- Idle/active/blocked states:
- Wrench behaviour:
- Phone evidence:

## Validation
- Content tests:
- Engine tests:
- Save tests:
- Icon validation:
- Responsive review:
- Performance impact:

## Release
- Dev revision:
- Remote-dev approval:
- Player-facing patch note:
```

## 18. Definition Of Complete

A feature is complete only when:

- Its purpose and progression position are clear.
- Every dependency is obtainable.
- Engine behaviour and displayed values agree.
- Recipes, quests, guide text, and links form one coherent path.
- Saves migrate safely.
- Every icon is separately generated, cropped, approved, and validated.
- Machine artwork contains no baked live UI.
- Phone UI works in every important state.
- Independent review has no unresolved actionable findings.
- Runtime assets have no obsolete copies.
- Lint, tests, icon validation, and build pass.
- The correct release lane has been used.
