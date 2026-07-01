/// <reference types="node" />

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  fuelDefinitions,
  gatherTargets,
  machines,
  processRecipes,
  questChapters,
  quests,
  recipes,
  resourceLabels,
  tools,
} from './content'
import type { MachineAmount, QuestObjective, Recipe, ResourceAmount } from './types'

const appCss = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../App.css'), 'utf8')

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
}

describe('content validation', () => {
  it('keeps authored IDs unique', () => {
    expectUnique(recipes.map((recipe) => recipe.id), 'recipe')
    expectUnique(processRecipes.map((recipe) => recipe.id), 'process recipe')
    expectUnique(quests.map((quest) => quest.id), 'quest')
    expectUnique(questChapters.map((chapter) => chapter.id), 'quest chapter')
  })

  it('keeps resource and machine records self-consistent', () => {
    for (const [id, label] of Object.entries(resourceLabels)) {
      expect(label.trim(), `resource ${id} should have a label`).not.toBe('')
      expect(appCss, `resource ${id} should have a .pixel-${id} icon class`).toContain(`.pixel-${id}`)
    }

    for (const [id, machine] of Object.entries(machines)) {
      expect(machine.id, `machine record ${id} should match its key`).toBe(id)
      expect(machine.name.trim(), `machine ${id} should have a name`).not.toBe('')
      expect(machine.description.trim(), `machine ${id} should have a description`).not.toBe('')
      expect(appCss, `machine ${id} should have a .machine-${id} glyph class`).toContain(`.machine-${id}`)
      if (machine.produces) expectResourceAmountReferences(machine.produces, `${id} produces`)
      if (machine.consumes) expectResourceAmountReferences(machine.consumes, `${id} consumes`)
      if (machine.unlockedBy) expect(quests.some((quest) => quest.id === machine.unlockedBy), `${id} unlockedBy should reference a quest`).toBe(true)
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
      if (recipe.requiredMachine) expect(machines, `${recipe.id} requiredMachine should exist`).toHaveProperty(recipe.requiredMachine)
      if (recipe.unlockedBy) expect(quests.some((quest) => quest.id === recipe.unlockedBy), `${recipe.id} unlockedBy should reference a quest`).toBe(true)
      if (recipe.pattern) {
        expect(recipe.pattern, `${recipe.id} pattern should fit a 3x3 grid`).toHaveLength(9)
        for (const id of recipe.pattern.filter((item): item is NonNullable<typeof item> => Boolean(item))) {
          expect(resourceLabels, `${recipe.id} pattern references unknown resource ${id}`).toHaveProperty(id)
        }
      }
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
      expectResourceAmountReferences([recipe.output], `${recipe.id} output`)
      if (recipe.fluidOutput) {
        expect(recipe.fluidOutput.amount, `${recipe.id} fluid output amount should be positive`).toBeGreaterThan(0)
        expect(['water', 'creosote'], `${recipe.id} fluid output should be known`).toContain(recipe.fluidOutput.id)
      }
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
      expectResourceAmountReferences(quest.rewards.resources ?? [], `${quest.id} reward resources`)
      expectMachineAmountReferences(quest.rewards.machines ?? [], `${quest.id} reward machines`)
      for (const unlock of quest.rewards.unlocks ?? []) expect(questIds, `${quest.id} reward unlock should exist`).toContain(unlock)
      for (const objective of quest.objectives ?? []) expectQuestObjectiveReferences(objective, `${quest.id} objective`)
    }
  })
})
