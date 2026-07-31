import { describe, expect, it } from 'vitest'
import { machineRegistry, processRecipes, recipes, resourceRegistry } from './content'
import { materialFamilies } from './materialIds'
import { mvMachineIds } from './mvIds'
import type { ResourceId } from './types'

const mvProcessMachineIds = mvMachineIds.slice(0, 18)

describe('MV engineering content', () => {
  it('registers every material form with at least one production route', () => {
    for (const family of materialFamilies) {
      for (const resourceId of Object.values(family.forms)) {
        expect(resourceRegistry[resourceId], `${resourceId} should be registered`).toBeDefined()
        const producedByCrafting = recipes.some((recipe) => recipe.outputs.some((output) => output.id === resourceId))
        const producedByMachine = processRecipes.some((recipe) =>
          recipe.output?.id === resourceId || recipe.secondaryOutput?.id === resourceId,
        )
        expect(producedByCrafting || producedByMachine, `${resourceId} should have a production route`).toBe(true)
      }
    }
  })

  it('keeps the first LV circuit hand-built from the expanded prerequisite stack', () => {
    const circuit = recipes.find((recipe) => recipe.id === 'craft_basic_electronic_circuit')
    expect(circuit?.inputs).toEqual([
      { id: 'basicBoard', amount: 1 },
      { id: 'resistor', amount: 2 },
      { id: 'vacuumTube', amount: 2 },
      { id: 'redAlloyCable', amount: 3 },
      { id: 'steelItemCasing', amount: 1 },
    ])
    expect(processRecipes.some((recipe) => recipe.output?.id === 'primitiveCircuit')).toBe(false)
  })

  it('uses 128V blue-tier MV variants for every LV process machine', () => {
    expect(mvProcessMachineIds).toHaveLength(18)
    for (const machineId of mvProcessMachineIds) {
      const machine = machineRegistry[machineId]
      expect(machine.tier, machineId).toBe('mv')
      expect(machine.euVoltage, machineId).toBe(128)
      expect(machine.placeable, machineId).toBe(true)
      expect(machine.processKind, machineId).not.toBe('none')
    }
  })

  it('requires a matching LV machine, MV hull, and two MV circuits for each upgrade', () => {
    for (const machineId of mvProcessMachineIds) {
      const recipe = recipes.find((candidate) => candidate.machineOutputs?.some((output) => output.id === machineId))
      expect(recipe, `${machineId} should have an upgrade recipe`).toBeDefined()
      expect(recipe?.machineInputs).toHaveLength(1)
      expect(recipe?.inputs).toEqual(expect.arrayContaining([
        { id: 'mvMachineHull', amount: 1 },
        { id: 'mvCircuit', amount: 2 },
      ]))
    }
  })

  it('runs inherited MV recipes twice as fast with twice the total EU', () => {
    const lvRecipe = processRecipes.find((recipe) => recipe.id === 'lv_macerate_bauxite_ore')
    const mvRecipe = processRecipes.find((recipe) => recipe.id === 'mv_inherited_lv_macerate_bauxite_ore')
    expect(lvRecipe).toBeDefined()
    expect(mvRecipe).toMatchObject({
      machineId: 'mvMacerator',
      durationMs: Math.ceil((lvRecipe?.durationMs ?? 0) / 2),
      euCost: (lvRecipe?.euCost ?? 0) * 2,
      input: lvRecipe?.input,
      output: lvRecipe?.output,
    })
  })

  it('builds the MV circuit through GaAs, diodes, and a phenolic board', () => {
    const mixedCharge = processRecipes.find((recipe) => recipe.id === 'lv_mix_gallium_arsenide')
    const crystal = processRecipes.find((recipe) => recipe.id === 'arc_gallium_arsenide')
    const diode = processRecipes.find((recipe) => recipe.id === 'lv_assembler_diodes')
    const circuit = recipes.find((recipe) => recipe.id === 'craft_mv_circuit')
    expect(mixedCharge).toMatchObject({
      machineId: 'lvMixer',
      input: { id: 'galliumDust', amount: 1 },
      secondaryInput: { id: 'arsenicDust', amount: 1 },
      output: { id: 'galliumArsenideDust', amount: 1 },
    })
    expect(crystal?.machineId).toBe('arcBlastFurnace')
    expect(crystal?.input?.id).toBe('galliumArsenideDust')
    expect(crystal?.secondaryInput).toBeUndefined()
    expect(crystal?.output?.id).toBe('galliumArsenideCrystal')
    expect(diode?.input?.id).toBe('galliumArsenideDust')
    expect(circuit?.inputs).toEqual(expect.arrayContaining([
      { id: 'mvCircuitBoard', amount: 1 },
      { id: 'diode', amount: 2 },
      { id: 'fineGoldWire', amount: 1 },
    ]))
    expect(processRecipes.some((recipe) => recipe.output?.id === 'mvCircuit')).toBe(false)
  })

  it('keeps MV input and output infrastructure recipes distinguishable', () => {
    const pairs = [
      ['craft_mvInputBus', 'craft_mvOutputBus'],
      ['craft_mvFluidInputHatch', 'craft_mvFluidOutputHatch'],
    ] as const

    for (const [inputId, outputId] of pairs) {
      const inputRecipe = recipes.find((recipe) => recipe.id === inputId)
      const outputRecipe = recipes.find((recipe) => recipe.id === outputId)
      expect(inputRecipe).toBeDefined()
      expect(outputRecipe).toBeDefined()
      expect(inputRecipe?.pattern, `${inputId} and ${outputId} must not collide`).not.toEqual(outputRecipe?.pattern)
    }
  })

  it('provides LV machine routes for the core MV components', () => {
    const routes: Array<[ResourceId, string]> = [
      ['phenolicBoard', 'lv_assembler_phenolic_board'],
      ['mvMachineCasing', 'lv_compress_mv_machine_casing'],
      ['mvMachineHull', 'lv_assemble_mv_machine_hull'],
      ['mvMotor', 'lv_assemble_mv_motor'],
      ['mvPiston', 'lv_assemble_mv_piston'],
      ['mvPump', 'lv_assemble_mv_pump'],
      ['mvConveyor', 'lv_assemble_mv_conveyor'],
    ]

    for (const [resourceId, recipeId] of routes) {
      expect(processRecipes.find((recipe) => recipe.id === recipeId)?.output?.id).toBe(resourceId)
    }
  })

  it('exposes both macerator item outputs used by MV ore preparation', () => {
    expect(machineRegistry.lvMacerator.itemOutputSlots).toBe(2)
    expect(machineRegistry.mvMacerator.itemOutputSlots).toBe(2)
  })

  it('moves direct ingot forming from the Assembler to the MV Extruder', () => {
    const extrudedForms = new Set<ResourceId>(materialFamilies.flatMap((family) => [
      family.forms.plate,
      family.forms.rod,
      family.forms.bolt,
      family.forms.ring,
      family.forms.gear,
    ]))
    expect(processRecipes.some((recipe) =>
      recipe.machineId === 'lvAssembler' && recipe.output && extrudedForms.has(recipe.output.id),
    )).toBe(false)

    expect(machineRegistry.mvExtruder).toMatchObject({
      tier: 'mv',
      placeable: true,
      processKind: 'euProcess',
      euVoltage: 128,
    })
    expect(recipes.find((recipe) => recipe.id === 'build_mv_extruder')?.machineOutputs).toEqual([
      { id: 'mvExtruder', amount: 1 },
    ])
  })

  it('cuts five reusable extrusion molds in the Circuit Imprinter', () => {
    const molds = [
      ['extrusionMoldPlate', 'steelPlate', 5],
      ['extrusionMoldRod', 'steelRod', 6],
      ['extrusionMoldBolt', 'steelBolt', 7],
      ['extrusionMoldRing', 'steelRing', 8],
      ['extrusionMoldGear', 'steelGear', 9],
    ] as const

    for (const [moldId, referenceId, programNumber] of molds) {
      expect(resourceRegistry[moldId]).toBeDefined()
      expect(processRecipes.find((recipe) => recipe.output?.id === moldId)).toMatchObject({
        machineId: 'circuitImprinter',
        input: { id: 'hardenedDieBlank', amount: 1 },
        secondaryInput: { id: referenceId, amount: 1 },
        programNumber,
        autoSelectable: false,
      })
    }
  })

  it('provides a mold-selected extrusion route for every ingot family', () => {
    const forms = [
      ['plate', 'extrusionMoldPlate', 1, 1],
      ['rod', 'extrusionMoldRod', 1, 2],
      ['bolt', 'extrusionMoldBolt', 1, 8],
      ['ring', 'extrusionMoldRing', 1, 4],
      ['gear', 'extrusionMoldGear', 4, 1],
    ] as const

    for (const family of materialFamilies) {
      for (const [form, moldId, ingotAmount, outputAmount] of forms) {
        expect(processRecipes.find((recipe) => recipe.id === `mv_extrude_${family.id}_${form}`)).toMatchObject({
          machineId: 'mvExtruder',
          input: { id: family.forms.ingot, amount: ingotAmount },
          secondaryInput: { id: moldId, amount: 1 },
          output: { id: family.forms[form], amount: outputAmount },
        })
      }
    }
  })
})
