import { describe, expect, it } from 'vitest'
import { machineRegistry, resourceRegistry } from './content'
import { collectRecipeGroupsByItemType, expandRecipeGroupCollections, groupRecipesByOutput } from './recipeGroups'
import type { MachineId, Recipe, ResourceId } from './types'

const recipeFor = (id: string, outputId: ResourceId): Recipe => ({
  id,
  name: id,
  description: id,
  tier: 'manual',
  stationType: 'hand',
  recipeType: 'crafting',
  durationMs: 1_000,
  inputs: [],
  outputs: [{ id: outputId, amount: 1 }],
  pattern: [null, null, null, null, null, null, null, null, null],
})

const machineRecipeFor = (id: string, outputId: MachineId): Recipe => ({
  ...recipeFor(id, 'stick'),
  outputs: [],
  machineOutputs: [{ id: outputId, amount: 1 }],
})

describe('recipe browser item-type collections', () => {
  it('groups material outputs by form while leaving unique items direct', () => {
    const groups = groupRecipesByOutput([
      recipeFor('iron-ingot', 'ironIngot'),
      recipeFor('copper-ingot', 'copperIngot'),
      recipeFor('iron-plate', 'ironPlate'),
      recipeFor('wooden-axe', 'woodenAxe'),
    ])

    const collections = collectRecipeGroupsByItemType(groups, resourceRegistry)
    const ingots = collections.find((collection) => collection.key === 'material-form:ingot')
    const plates = collections.find((collection) => collection.key === 'material-form:plate')
    const woodenAxe = collections.find((collection) => collection.key === 'tool-family:axe')

    expect(ingots?.label).toBe('Ingots')
    expect(ingots?.grouped).toBe(true)
    expect(ingots?.groups.map((group) => group.output.id)).toEqual(['ironIngot', 'copperIngot'])
    expect(plates?.grouped).toBe(false)
    expect(woodenAxe?.groups).toHaveLength(1)
  })

  it('expands a selected item stack inline without hiding the normal grid', () => {
    const groups = groupRecipesByOutput([
      recipeFor('iron-ingot', 'ironIngot'),
      recipeFor('copper-ingot', 'copperIngot'),
      recipeFor('iron-plate', 'ironPlate'),
      recipeFor('wooden-axe', 'woodenAxe'),
    ])
    const collections = collectRecipeGroupsByItemType(groups, resourceRegistry)

    expect(expandRecipeGroupCollections(collections, null).map((group) => group.output.id)).toEqual([
      'ironIngot',
      'ironPlate',
      'woodenAxe',
    ])
    expect(expandRecipeGroupCollections(collections, 'material-form:ingot').map((group) => group.output.id)).toEqual([
      'ironIngot',
      'copperIngot',
      'ironPlate',
      'woodenAxe',
    ])
  })
  it('groups tool families, tank tiers, and tiered machine variants', () => {
    const groups = groupRecipesByOutput([
      recipeFor('wooden-pickaxe', 'woodenPickaxe'),
      recipeFor('iron-pickaxe', 'ironPickaxe'),
      machineRecipeFor('iron-tank', 'steamTank'),
      machineRecipeFor('steel-tank', 'steelTank'),
      machineRecipeFor('lv-macerator', 'lvMacerator'),
      machineRecipeFor('mv-macerator', 'mvMacerator'),
    ])

    const collections = collectRecipeGroupsByItemType(groups, resourceRegistry, machineRegistry)

    expect(collections.find((collection) => collection.key === 'tool-family:pickaxe')?.groups).toHaveLength(2)
    expect(collections.find((collection) => collection.key === 'machine-family:tank')?.groups).toHaveLength(2)
    expect(collections.find((collection) => collection.key === 'machine-family:Macerator')?.groups).toHaveLength(2)
  })
})
