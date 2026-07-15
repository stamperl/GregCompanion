/// <reference types="node" />

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  canAutoMinerTarget,
  fuelDefinitions,
  fluidIds,
  gatherTargets,
  machineRegistry,
  machines,
  processRecipes,
  questChapters,
  quests,
  recipes,
  resourceBackedMachineIds,
  resourceLabels,
  resourceRegistry,
  tools,
} from './content'
import { questKind } from './engine'
import type { FluidAmount, MachineAmount, MachineId, QuestObjective, Recipe, ResourceAmount } from './types'

const appCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../App.css'), 'utf8')
const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../public')

function expectUnique(ids: string[], label: string) {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  expect([...new Set(duplicates)], `${label} IDs should be unique`).toEqual([])
}

function expectResourceAmountReferences(amounts: ResourceAmount[], context: string) {
  for (const amount of amounts) {
    expect(resourceLabels, `${context} references unknown resource ${amount.id}`).toHaveProperty(amount.id)
    expect(Number.isInteger(amount.amount), `${context} ${amount.id} amount should be an integer`).toBe(true)
    expect(amount.amount, `${context} ${amount.id} amount should be positive`).toBeGreaterThan(0)
  }
}

function expectMachineAmountReferences(amounts: MachineAmount[], context: string) {
  for (const amount of amounts) {
    expect(machines, `${context} references unknown machine ${amount.id}`).toHaveProperty(amount.id)
    expect(Number.isInteger(amount.amount), `${context} ${amount.id} amount should be an integer`).toBe(true)
    expect(amount.amount, `${context} ${amount.id} amount should be positive`).toBeGreaterThan(0)
  }
}

function expectFluidAmountReferences(amounts: FluidAmount[], context: string) {
  for (const amount of amounts) {
    expect(fluidIds, `${context} references unknown fluid ${amount.id}`).toContain(amount.id)
    expect(Number.isFinite(amount.amount), `${context} ${amount.id} amount should be finite`).toBe(true)
    expect(amount.amount, `${context} ${amount.id} amount should be positive`).toBeGreaterThan(0)
  }
}

function resourceAmountCounts(amounts: ResourceAmount[]) {
  return amounts.reduce(
    (counts, amount) => {
      counts[amount.id] = (counts[amount.id] ?? 0) + amount.amount
      return counts
    },
    {} as Partial<Record<ResourceAmount['id'], number>>,
  )
}

function patternCounts(pattern: Recipe['pattern']) {
  return (pattern ?? []).reduce(
    (counts, id) => {
      if (id) counts[id] = (counts[id] ?? 0) + 1
      return counts
    },
    {} as Partial<Record<ResourceAmount['id'], number>>,
  )
}

function recipeReferenceBuckets(recipe: Recipe) {
  return [
    { amounts: recipe.inputs, label: `${recipe.id} inputs` },
    { amounts: recipe.outputs, label: `${recipe.id} outputs` },
    { amounts: recipe.catalysts ?? [], label: `${recipe.id} catalysts` },
    { amounts: recipe.durabilityCosts ?? [], label: `${recipe.id} durability costs` },
  ]
}

function expectQuestObjectiveReferences(objective: QuestObjective, context: string) {
  if (objective.type === 'resource') {
    expect(resourceLabels, `${context} references unknown resource ${objective.id}`).toHaveProperty(objective.id)
    expect(objective.amount, `${context} resource amount should be positive`).toBeGreaterThan(0)
  }
  if (objective.type === 'machine' || objective.type === 'placedMachine') {
    expect(machines, `${context} references unknown machine ${objective.id}`).toHaveProperty(objective.id)
    expect(objective.amount, `${context} machine amount should be positive`).toBeGreaterThan(0)
  }
  if (objective.type === 'factoryFoundation') {
    expect(objective.level, `${context} factory foundation level should be positive`).toBeGreaterThan(0)
  }
  if (objective.type === 'surveyCard') {
    expect(gatherTargets, `${context} references unknown survey target ${objective.id}`).toHaveProperty(objective.id)
    expect(objective.amount, `${context} survey card amount should be positive`).toBeGreaterThan(0)
  }
  if (objective.type === 'recipe') {
    expect([...recipes, ...processRecipes].some((recipe) => recipe.id === objective.id), `${context} references unknown recipe ${objective.id}`).toBe(true)
    expect(objective.amount, `${context} recipe amount should be positive`).toBeGreaterThan(0)
  }
}

describe('content validation', () => {
  it('keeps authored IDs unique', () => {
    expectUnique(recipes.map((recipe) => recipe.id), 'recipe')
    expectUnique(processRecipes.map((recipe) => recipe.id), 'process recipe')
    expectUnique(quests.map((quest) => quest.id), 'quest')
    expectUnique(questChapters.map((chapter) => chapter.id), 'quest chapter')
  })

  it('keeps resource and machine records self-consistent', () => {
    expect(Object.keys(resourceLabels), 'resource labels should be derived in registry order').toEqual(Object.keys(resourceRegistry))
    expect(Object.keys(machines), 'machines should be derived in registry order').toEqual(Object.keys(machineRegistry))

    for (const [id, spec] of Object.entries(resourceRegistry)) {
      expect(spec.id, `resource registry ${id} should match its key`).toBe(id)
      expect(spec.label, `resource registry ${id} label should match exported labels`).toBe(resourceLabels[id as keyof typeof resourceLabels])
      expect(spec.category.trim(), `resource registry ${id} should have a category`).not.toBe('')
      expect(spec.tier.trim(), `resource registry ${id} should have a tier`).not.toBe('')
    }

    for (const [id, label] of Object.entries(resourceLabels)) {
      expect(label.trim(), `resource ${id} should have a label`).not.toBe('')
      expect(appCss, `resource ${id} should have a .pixel-${id} icon class`).toContain(`.pixel-${id}`)
    }

    for (const [id, machine] of Object.entries(machineRegistry)) {
      expect(machine.id, `machine record ${id} should match its key`).toBe(id)
      expect(machine.name.trim(), `machine ${id} should have a name`).not.toBe('')
      expect(machine.description.trim(), `machine ${id} should have a description`).not.toBe('')
      expect(typeof machine.placeable, `machine ${id} should declare placeability`).toBe('boolean')
      expect(machine.processKind.trim(), `machine ${id} should declare a process kind`).not.toBe('')
      expect(appCss, `machine ${id} should have a .machine-${id} glyph class`).toContain(`.machine-${id}`)
    }

    for (const [id, machine] of Object.entries(machines)) {
      if (machine.produces) expectResourceAmountReferences(machine.produces, `${id} produces`)
      if (machine.consumes) expectResourceAmountReferences(machine.consumes, `${id} consumes`)
      if (machine.unlockedBy) expect(quests.some((quest) => quest.id === machine.unlockedBy), `${id} unlockedBy should reference a quest`).toBe(true)
    }
  })

  it('keeps core steam processing machines paired with LV equivalents', () => {
    const steamToLvMachinePairs: Array<[MachineId, MachineId]> = [
      ['steamMacerator', 'lvMacerator'],
      ['steamForgeHammer', 'lvForgeHammer'],
      ['steamCompressor', 'lvCompressor'],
      ['steamExtractor', 'lvExtractor'],
      ['steamAlloySmelter', 'lvAlloySmelter'],
      ['steamFurnace', 'lvFurnace'],
      ['steamAutoMiner', 'lvAutoMiner'],
    ]

    for (const [steamMachineId, lvMachineId] of steamToLvMachinePairs) {
      expect(machines, `${steamMachineId} should exist`).toHaveProperty(steamMachineId)
      expect(machines, `${lvMachineId} should exist as ${steamMachineId} LV equivalent`).toHaveProperty(lvMachineId)
      expect(recipes.some((recipe) => recipe.machineOutputs?.some((output) => output.id === lvMachineId)), `${lvMachineId} should have a build recipe`).toBe(true)
      if (lvMachineId === 'lvAutoMiner') {
        expect(canAutoMinerTarget(lvMachineId, 'stone'), `${lvMachineId} should support auto-mining targets`).toBe(true)
      } else {
        expect(processRecipes.some((recipe) => recipe.machineId === lvMachineId), `${lvMachineId} should have process recipes`).toBe(true)
      }
    }
  })

  it('has generated item and machine icon assets for every content record', () => {
    for (const id of Object.keys(resourceRegistry)) {
      const iconPath = resolve(publicDir, 'game-icons/resources', `${id}.png`)
      expect(existsSync(iconPath), `resource ${id} should have ${iconPath}`).toBe(true)
      expect(statSync(iconPath).size, `resource ${id} icon should not be blank`).toBeGreaterThan(500)
    }

    for (const id of Object.keys(machineRegistry)) {
      const iconPath = resolve(publicDir, 'game-icons/machines', `${id}.png`)
      expect(existsSync(iconPath), `machine ${id} should have ${iconPath}`).toBe(true)
      expect(statSync(iconPath).size, `machine ${id} icon should not be blank`).toBeGreaterThan(500)
    }
  })

  it('keeps tools and gather targets valid', () => {
    for (const [id, tool] of Object.entries(tools)) {
      expect(tool.id, `tool record ${id} should match its key`).toBe(id)
      expect(tool.name.trim(), `tool ${id} should have a name`).not.toBe('')
      for (const targetId of Object.keys(tool.damageByTarget)) {
        expect(gatherTargets, `tool ${id} references unknown gather target ${targetId}`).toHaveProperty(targetId)
      }
    }

    for (const [id, target] of Object.entries(gatherTargets)) {
      expect(target.id, `gather target record ${id} should match its key`).toBe(id)
      expect(tools, `gather target ${id} preferred tool should exist`).toHaveProperty(target.preferredTool)
      expect(target.maxHp, `gather target ${id} max HP should be positive`).toBeGreaterThan(0)
      expectResourceAmountReferences(target.drops, `${id} drops`)
    }
  })

  it('keeps crafting recipes valid', () => {
    for (const recipe of recipes) {
      expect(recipe.name.trim(), `${recipe.id} should have a name`).not.toBe('')
      expect(recipe.description.trim(), `${recipe.id} should have a description`).not.toBe('')
      expect(recipe.durationMs, `${recipe.id} duration should be positive`).toBeGreaterThan(0)
      for (const bucket of recipeReferenceBuckets(recipe)) expectResourceAmountReferences(bucket.amounts, bucket.label)
      expectMachineAmountReferences(recipe.machineInputs ?? [], `${recipe.id} machine inputs`)
      expectMachineAmountReferences(recipe.machineOutputs ?? [], `${recipe.id} machine outputs`)
      expectFluidAmountReferences(recipe.fluidInputs ?? [], `${recipe.id} fluid inputs`)
      expectFluidAmountReferences(recipe.fluidOutputs ?? [], `${recipe.id} fluid outputs`)
      if (recipe.requiredMachine) expect(machines, `${recipe.id} requiredMachine should exist`).toHaveProperty(recipe.requiredMachine)
      if (recipe.unlockedBy) expect(quests.some((quest) => quest.id === recipe.unlockedBy), `${recipe.id} unlockedBy should reference a quest`).toBe(true)
      if (recipe.pattern) {
        expect(recipe.pattern, `${recipe.id} pattern should fit a 3x3 grid`).toHaveLength(9)
        for (const id of recipe.pattern.filter((item): item is NonNullable<typeof item> => Boolean(item))) {
          expect(resourceLabels, `${recipe.id} pattern references unknown resource ${id}`).toHaveProperty(id)
        }
        expect(patternCounts(recipe.pattern), `${recipe.id} pattern should match declared inputs and catalysts`).toEqual(
          resourceAmountCounts([...recipe.inputs, ...(recipe.catalysts ?? [])]),
        )
      }
    }
  })

  it('uses one resource inventory item for every craftable, placeable cable', () => {
    const overlappingItemIds = Object.keys(resourceRegistry).filter((id) => id in machineRegistry)
    expect(overlappingItemIds, 'only explicitly resource-backed placeables may share resource and machine IDs').toEqual([...resourceBackedMachineIds])

    for (const cableId of resourceBackedMachineIds) {
      const producingRecipes = recipes.filter((recipe) => recipe.outputs.some((output) => output.id === cableId))
      expect(producingRecipes.length, `${cableId} should have a resource recipe`).toBeGreaterThan(0)
      expect(
        recipes.some((recipe) => recipe.machineOutputs?.some((output) => output.id === cableId)),
        `${cableId} should not have a separate machine-item recipe`,
      ).toBe(false)
    }
  })

  it('keeps process recipes valid', () => {
    for (const recipe of processRecipes) {
      expect(recipe.name.trim(), `${recipe.id} should have a name`).not.toBe('')
      expect(recipe.description.trim(), `${recipe.id} should have a description`).not.toBe('')
      expect(machines, `${recipe.id} machineId should exist`).toHaveProperty(recipe.machineId)
      expect(recipe.durationMs, `${recipe.id} duration should be positive`).toBeGreaterThan(0)
      expectResourceAmountReferences([recipe.input], `${recipe.id} input`)
      if (recipe.secondaryInput) expectResourceAmountReferences([recipe.secondaryInput], `${recipe.id} secondary input`)
      if (recipe.fuelInput) expectResourceAmountReferences([recipe.fuelInput], `${recipe.id} fuel input`)
      if (recipe.machineOutput) {
        expect(machines, `${recipe.id} machine output should exist`).toHaveProperty(recipe.machineOutput.id)
        expect(recipe.machineOutput.amount, `${recipe.id} machine output amount should be positive`).toBeGreaterThan(0)
      } else {
        if (recipe.output.amount === 0 && recipe.fluidOutput) {
          expect(resourceLabels, `${recipe.id} placeholder output should reference a known resource`).toHaveProperty(recipe.output.id)
        } else {
          expectResourceAmountReferences([recipe.output], `${recipe.id} output`)
        }
      }
      if (recipe.fluidInput) expectFluidAmountReferences([recipe.fluidInput], `${recipe.id} fluid input`)
      if (recipe.fluidOutput) expectFluidAmountReferences([recipe.fluidOutput], `${recipe.id} fluid output`)
    }
  })

  it('gives refined LV materials an intentional recipe consumer', () => {
    const consumedResources = new Set([
      ...recipes.flatMap((recipe) => [
        ...recipe.inputs,
        ...(recipe.catalysts ?? []),
        ...(recipe.durabilityCosts ?? []),
      ]).map((amount) => amount.id),
      ...processRecipes.flatMap((recipe) => [
        recipe.input,
        ...(recipe.secondaryInput ? [recipe.secondaryInput] : []),
        ...(recipe.extraInputs ?? []),
        ...(recipe.fuelInput ? [recipe.fuelInput] : []),
      ]).map((amount) => amount.id),
    ])

    for (const id of ['nickelIngot', 'leadPlate', 'aluminiumRing', 'aluminiumScrew', 'aluminiumGear'] as const) {
      expect(consumedResources, `${id} should be consumed by at least one recipe`).toContain(id)
    }
  })

  it('keeps fuel definitions valid', () => {
    for (const [id, fuel] of Object.entries(fuelDefinitions)) {
      expect(resourceLabels, `fuel ${id} should be a known resource`).toHaveProperty(id)
      expect(fuel.id, `fuel ${id} should match its key`).toBe(id)
      expect(fuel.burnMs, `fuel ${id} burn time should be positive`).toBeGreaterThan(0)
    }
  })

  it('keeps quests valid', () => {
    const questIds = new Set(quests.map((quest) => quest.id))
    const chapterIds = new Set(questChapters.map((chapter) => chapter.id))
    const recipeIds = new Set([...recipes, ...processRecipes].map((recipe) => recipe.id))

    for (const quest of quests) {
      expect(quest.title.trim(), `${quest.id} should have a title`).not.toBe('')
      expect(quest.description.trim(), `${quest.id} should have a description`).not.toBe('')
      if (quest.chapterId) expect(chapterIds, `${quest.id} chapter should exist`).toContain(quest.chapterId)
      for (const prerequisite of quest.prerequisites ?? []) expect(questIds, `${quest.id} prerequisite should exist`).toContain(prerequisite)
      if (quest.icon?.type === 'resource') expect(resourceLabels, `${quest.id} icon resource should exist`).toHaveProperty(quest.icon.id)
      if (quest.icon?.type === 'machine') expect(machines, `${quest.id} icon machine should exist`).toHaveProperty(quest.icon.id)
      if (quest.icon?.type === 'gather') expect(gatherTargets, `${quest.id} icon gather target should exist`).toHaveProperty(quest.icon.id)
      expectResourceAmountReferences(quest.requirements.resources ?? [], `${quest.id} required resources`)
      expectMachineAmountReferences(quest.requirements.machines ?? [], `${quest.id} required machines`)
      for (const card of quest.requirements.surveyCards ?? []) {
        expect(gatherTargets, `${quest.id} required survey target should exist`).toHaveProperty(card.id)
        expect(card.amount, `${quest.id} required survey card amount should be positive`).toBeGreaterThan(0)
      }
      for (const recipe of quest.requirements.recipes ?? []) {
        expect(recipeIds, `${quest.id} required recipe should exist`).toContain(recipe.id)
        expect(recipe.amount, `${quest.id} required recipe amount should be positive`).toBeGreaterThan(0)
      }
      expectResourceAmountReferences(quest.rewards.resources ?? [], `${quest.id} reward resources`)
      expectMachineAmountReferences(quest.rewards.machines ?? [], `${quest.id} reward machines`)
      for (const unlock of quest.rewards.unlocks ?? []) expect(questIds, `${quest.id} reward unlock should exist`).toContain(unlock)
      for (const objective of quest.objectives ?? []) expectQuestObjectiveReferences(objective, `${quest.id} objective`)
    }

    const questById = new Map<string, (typeof quests)[number]>(quests.map((quest) => [quest.id, quest]))
    const visited = new Set<string>()
    const active = new Set<string>()
    const visit = (questId: string) => {
      expect(active, `quest prerequisites should not contain a cycle through ${questId}`).not.toContain(questId)
      if (visited.has(questId)) return
      active.add(questId)
      for (const prerequisite of questById.get(questId)?.prerequisites ?? []) visit(prerequisite)
      active.delete(questId)
      visited.add(questId)
    }
    for (const quest of quests) visit(quest.id)
  })

  it('does not place optional quests in the prerequisite chain of main quests', () => {
    const questById = new Map(quests.map((quest) => [quest.id, quest]))
    for (const quest of quests.filter((candidate) => questKind(candidate) !== 'optional')) {
      for (const prerequisiteId of quest.prerequisites ?? []) {
        const prerequisite = questById.get(prerequisiteId)!
        expect(questKind(prerequisite), `${quest.id} should not depend on optional ${prerequisiteId}`).not.toBe('optional')
      }
    }
  })
})
