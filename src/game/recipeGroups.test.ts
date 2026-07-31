import { describe, expect, it } from 'vitest'
import { resourceRegistry } from './content'
import { collectRecipeGroupsByItemType, groupRecipesByOutput } from './recipeGroups'
import type { Recipe, ResourceId } from './types'

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
    const woodenAxe = collections.find((collection) => collection.key === 'direct:resource:woodenAxe')

    expect(ingots?.label).toBe('Ingots')
    expect(ingots?.grouped).toBe(true)
    expect(ingots?.groups.map((group) => group.output.id)).toEqual(['ironIngot', 'copperIngot'])
    expect(plates?.grouped).toBe(false)
    expect(woodenAxe?.groups).toHaveLength(1)
  })
})
