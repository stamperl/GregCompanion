import { describe, expect, it } from 'vitest'
import { machines, processRecipes } from './content'
import { minimumMachineForProcessRecipe, processRecipesForMachine, processRecipesInMachineTierOrder, processRecipeToCatalogRecipe } from './recipeGraph'

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

  it('treats later-tier efficiency improvements as the same operation', () => {
    const lvCrushedIron = processRecipes.find((recipe) => recipe.id === 'lv_macerate_iron_ore')!
    const lvIronPlate = processRecipes.find((recipe) => recipe.id === 'lv_hammer_iron_plate')!
    const lvBoardBlank = processRecipes.find((recipe) => recipe.id === 'lv_compress_wooden_board_blank')!

    expect(minimumMachineForProcessRecipe(lvCrushedIron, processRecipes, machines)).toBe('steamMacerator')
    expect(minimumMachineForProcessRecipe(lvIronPlate, processRecipes, machines)).toBe('steamForgeHammer')
    expect(minimumMachineForProcessRecipe(lvBoardBlank, processRecipes, machines)).toBe('steamCompressor')
  })

  it('finds the earliest machine even when a later machine family performs the operation', () => {
    const lvBenderIronPlate = processRecipes.find((recipe) => recipe.id === 'lv_bender_iron_plate')!

    expect(minimumMachineForProcessRecipe(lvBenderIronPlate, processRecipes, machines)).toBe('steamForgeHammer')
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

  it('preserves machine and fluid outputs without exposing placeholder items', () => {
    const machineRecipe = processRecipes.find((recipe) => recipe.id === 'lv_assemble_energy_hatch_2a')!
    const fluidRecipe = processRecipes.find((recipe) => recipe.id === 'lv_reactor_liquid_rubber')!

    expect(processRecipeToCatalogRecipe(machineRecipe, 'lv')).toMatchObject({
      outputs: [],
      machineOutputs: [{ id: 'lvEnergyHatch2A', amount: 1 }],
    })
    expect(processRecipeToCatalogRecipe(fluidRecipe, 'lv')).toMatchObject({
      outputs: [],
      fluidOutputs: [{ id: 'liquidRubber', amount: 8 }],
    })
  })
})
