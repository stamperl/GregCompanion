import { describe, expect, it } from 'vitest'
import { machines, processRecipes } from './content'
import { minimumMachineForProcessRecipe, processRecipesForMachine, processRecipesInMachineTierOrder } from './recipeGraph'

describe('machine recipe catalog', () => {
  it('lists every recipe assigned to a machine', () => {
    const lvFurnaceRecipes = processRecipesForMachine('lvFurnace', processRecipes)

    expect(lvFurnaceRecipes.length).toBeGreaterThan(0)
    expect(lvFurnaceRecipes.every((recipe) => recipe.machineId === 'lvFurnace')).toBe(true)
    expect(lvFurnaceRecipes.some((recipe) => recipe.id === 'lv_furnace_iron')).toBe(true)
    expect(lvFurnaceRecipes.some((recipe) => recipe.id === 'lv_furnace_lead')).toBe(true)
  })

  it('reports the earliest machine tier for equivalent furnace operations', () => {
    const lvIron = processRecipes.find((recipe) => recipe.id === 'lv_furnace_iron')!
    const lvLead = processRecipes.find((recipe) => recipe.id === 'lv_furnace_lead')!

    expect(minimumMachineForProcessRecipe(lvIron, processRecipes, machines)).toBe('furnace')
    expect(minimumMachineForProcessRecipe(lvLead, processRecipes, machines)).toBe('lvFurnace')
  })

  it('does not merge recipes that produce the same item from different inputs', () => {
    const lvIronOre = processRecipes.find((recipe) => recipe.id === 'lv_furnace_iron')!
    const lvIronDust = processRecipes.find((recipe) => recipe.id === 'lv_furnace_iron_dust')!

    expect(minimumMachineForProcessRecipe(lvIronOre, [lvIronOre, lvIronDust], machines)).toBe('lvFurnace')
  })

  it('orders recipe variants from the lowest machine tier upward', () => {
    const variants = ['lv_furnace_iron', 'steam_furnace_iron', 'smelt_iron_ingot'].map(
      (id) => processRecipes.find((recipe) => recipe.id === id)!,
    )

    expect(processRecipesInMachineTierOrder(variants, machines).map((recipe) => recipe.machineId)).toEqual([
      'furnace',
      'steamFurnace',
      'lvFurnace',
    ])
  })
})
