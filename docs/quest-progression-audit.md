# Quest Progression Audit

## Review Boundary

This pass reviewed the complete quest graph against current crafting and machine recipes. Recipe balance remains unchanged except for the two approved corrections:

- The Basic Well now recovers 6L/s and can discharge at up to 24L/s from its buffer.
- Iron Wire Cutters are a durability tool when winding Heating Coils, not a consumed ingredient.

All other costs, outputs, durations, machine throughput, quest rewards, and material gates remain unchanged.

## Progression Spine

The player-facing order is now:

1. First Tools
2. Stone & Fire
3. Boiler Room
4. Coke & Steel
5. Circuits & First Power
6. Batteries & Heavy Power
7. Factory Automation
8. Shattered Reach
9. Renewable Power
10. Auto Crafting

Existing cross-line prerequisites remain the source of truth. Welcome quests explain the capability gained in each line, while optional and tip quests branch beside the mechanic they teach.

## Pacing Overview

- **First Tools and Stone & Fire:** The short manual opening establishes equipment, gathering targets, recipes, and the factory floor before processing becomes complicated.
- **Steam:** Pressure storage and routing remain the first infrastructure problem. A single Well supports one Boiler but cannot sustain the later Powered Farm.
- **Steel:** Coke Oven and Bricked Blast Furnace work remain the first long material commitment. The quest book now warns players to retain Steam machines during early LV.
- **Early LV:** Circuits remain deliberately painful with manual and Steam-era methods. The Wiremill is the first strong efficiency payoff.
- **Heavy LV and aluminium:** Batteries, multi-amp distribution, casings, and the Arc Furnace remain the principal LV bottleneck. No material costs were reduced.
- **Applied industry:** Surveying and chemistry turn previous manual resources into routed production lines. Optional quests explain cells, byproducts, programs, and gas destinations.
- **Renewable power and MV:** Benzene is a positive but infrastructure-heavy power loop. Automatic crafting follows aluminium and remote-resource processing rather than bypassing them.

## Deferred Recipe Findings

Any remaining mismatch between quest prose and recipe data should be corrected as wording or ordering only. A change to recipe ingredients, yields, time, EU, Steam, or rewards requires separate approval.

The content test suite validates unique IDs, prerequisite cycles, optional-quest isolation, production-route availability, and assignment of every quest to one ordered folder line.
