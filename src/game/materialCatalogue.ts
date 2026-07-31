import { materialFamilies, type MaterialFamilyId, type MaterialFormId, type MaterialResourceId } from './materialIds'
import type { ProcessRecipe, Recipe, ResourceId, ResourceSpec, Tier } from './types'

const categoryByForm = {
  ingot: 'ingot',
  dust: 'dust',
  plate: 'plate',
  rod: 'rod',
  bolt: 'component',
  ring: 'component',
  screw: 'component',
  gear: 'component',
  wire: 'wire',
  fineWire: 'wire',
  foil: 'component',
} as const

const labelByForm = {
  ingot: 'Ingot',
  dust: 'Dust',
  plate: 'Plate',
  rod: 'Rod',
  bolt: 'Bolt',
  ring: 'Ring',
  screw: 'Screw',
  gear: 'Gear',
  wire: 'Wire',
  fineWire: 'Fine Wire',
  foil: 'Foil',
} as const

export const materialResourceRegistry = Object.fromEntries(
  materialFamilies.flatMap((family) => (
    Object.entries(family.forms).map(([form, id]) => [
      id,
      {
        id,
        label: `${form === 'fineWire' ? 'Fine ' : ''}${family.label}${form === 'fineWire' ? ' Wire' : ` ${labelByForm[form as MaterialFormId]}`}`,
        category: categoryByForm[form as MaterialFormId],
        tier: family.tier,
        sortGroup: `material:${family.id}`,
        materialFamily: family.id,
        materialForm: form,
      },
    ])
  )),
) as Record<MaterialResourceId, ResourceSpec>

const routeExists = (
  authored: Recipe[],
  stationType: Recipe['stationType'],
  outputId: ResourceId,
) => authored.some((recipe) => (
  recipe.stationType === stationType
  && recipe.outputs.some((output) => output.id === outputId)
))

const processRouteExists = (
  authored: ProcessRecipe[],
  machineId: ProcessRecipe['machineId'],
  outputId: ResourceId,
) => authored.some((recipe) => (
  recipe.machineId === machineId
  && [recipe.output, recipe.secondaryOutput].some((output) => output?.id === outputId)
))

const handRoute = (
  familyId: MaterialFamilyId,
  form: MaterialFormId,
  tier: Tier,
  inputs: Recipe['inputs'],
  outputs: Recipe['outputs'],
  catalysts: Recipe['catalysts'],
  pattern: Recipe['pattern'],
): Recipe => ({
  id: `material_${familyId}_${form}_hand`,
  name: `Hand-form ${materialResourceRegistry[outputs[0].id as MaterialResourceId].label}`,
  description: 'Use basic workshop tools to form this material part before dedicated machinery is available.',
  tier,
  stationType: 'hand',
  recipeType: 'crafting',
  durationMs: 1_000,
  inputs,
  outputs,
  catalysts,
  durabilityCosts: catalysts?.map((catalyst) => ({ ...catalyst })),
  pattern,
})

export const generateMissingMaterialCraftingRecipes = (authored: Recipe[]): Recipe[] => {
  const generated: Recipe[] = []

  for (const family of materialFamilies) {
    const { forms } = family
    const candidates: Recipe[] = [
      handRoute(family.id, 'dust', family.tier, [{ id: forms.ingot, amount: 1 }], [{ id: forms.dust, amount: 1 }], [{ id: 'mortar', amount: 1 }], [forms.ingot, 'mortar', null, null, null, null, null, null, null]),
      handRoute(family.id, 'plate', family.tier, [{ id: forms.ingot, amount: 2 }], [{ id: forms.plate, amount: 1 }], [{ id: 'ironHammer', amount: 1 }], [forms.ingot, 'ironHammer', forms.ingot, null, null, null, null, null, null]),
      handRoute(family.id, 'rod', family.tier, [{ id: forms.ingot, amount: 1 }], [{ id: forms.rod, amount: 1 }], [{ id: 'ironFile', amount: 1 }], [forms.ingot, 'ironFile', null, null, null, null, null, null, null]),
      handRoute(family.id, 'bolt', family.tier, [{ id: forms.rod, amount: 1 }], [{ id: forms.bolt, amount: 2 }], [{ id: 'ironWireCutters', amount: 1 }], [forms.rod, 'ironWireCutters', null, null, null, null, null, null, null]),
      handRoute(family.id, 'ring', family.tier, [{ id: forms.rod, amount: 1 }], [{ id: forms.ring, amount: 2 }], [{ id: 'ironFile', amount: 1 }], [forms.rod, 'ironFile', null, null, null, null, null, null, null]),
      handRoute(family.id, 'screw', family.tier, [{ id: forms.bolt, amount: 1 }], [{ id: forms.screw, amount: 1 }], [{ id: 'ironFile', amount: 1 }], [forms.bolt, 'ironFile', null, null, null, null, null, null, null]),
      handRoute(family.id, 'gear', family.tier, [{ id: forms.plate, amount: 4 }, { id: forms.rod, amount: 1 }], [{ id: forms.gear, amount: 1 }], [{ id: 'ironHammer', amount: 1 }, { id: 'ironFile', amount: 1 }], [forms.plate, 'ironHammer', forms.plate, forms.plate, forms.rod, forms.plate, null, 'ironFile', null]),
      handRoute(family.id, 'wire', family.tier, [{ id: forms.plate, amount: 1 }], [{ id: forms.wire, amount: 2 }], [{ id: 'ironWireCutters', amount: 1 }], [forms.plate, 'ironWireCutters', null, null, null, null, null, null, null]),
      handRoute(family.id, 'foil', family.tier, [{ id: forms.plate, amount: 1 }], [{ id: forms.foil, amount: 4 }], [{ id: 'ironHammer', amount: 1 }], [forms.plate, 'ironHammer', null, null, null, null, null, null, null]),
      handRoute(family.id, 'fineWire', family.tier, [{ id: forms.foil, amount: 1 }], [{ id: forms.fineWire, amount: 1 }], [{ id: 'ironWireCutters', amount: 1 }], [forms.foil, 'ironWireCutters', null, null, null, null, null, null, null]),
    ]

    for (const candidate of candidates) {
      if (!routeExists(authored, 'hand', candidate.outputs[0].id)) generated.push(candidate)
    }
  }

  return generated
}

const lvProcess = (
  familyId: MaterialFamilyId,
  form: MaterialFormId,
  machineId: ProcessRecipe['machineId'],
  input: ProcessRecipe['input'],
  output: ProcessRecipe['output'],
  programNumber?: number,
): ProcessRecipe => ({
  id: `material_${familyId}_${form}_${machineId}`,
  name: `${materialResourceRegistry[output!.id as MaterialResourceId].label} in ${machineId.replace(/^lv/, 'LV ')}`,
  description: 'A powered forming route with better material yield and no hand-tool wear.',
  tier: 'lv',
  machineId,
  durationMs: 6_000,
  euCost: 96,
  input,
  output,
  programNumber,
  autoSelectable: programNumber === undefined,
})

export const generateMissingMaterialProcessRecipes = (authored: ProcessRecipe[]): ProcessRecipe[] => {
  const generated: ProcessRecipe[] = []

  for (const family of materialFamilies) {
    const { forms } = family
    const candidates = [
      lvProcess(family.id, 'dust', 'lvMacerator', { id: forms.ingot, amount: 1 }, { id: forms.dust, amount: 1 }),
      lvProcess(family.id, 'plate', 'lvForgeHammer', { id: forms.ingot, amount: 1 }, { id: forms.plate, amount: 1 }),
      lvProcess(family.id, 'plate', 'lvBender', { id: forms.ingot, amount: 1 }, { id: forms.plate, amount: 1 }, 1),
      lvProcess(family.id, 'rod', 'lvLathe', { id: forms.ingot, amount: 1 }, { id: forms.rod, amount: 2 }, 1),
      lvProcess(family.id, 'bolt', 'lvLathe', { id: forms.rod, amount: 1 }, { id: forms.bolt, amount: 4 }, 2),
      lvProcess(family.id, 'ring', 'lvLathe', { id: forms.rod, amount: 1 }, { id: forms.ring, amount: 2 }, 3),
      lvProcess(family.id, 'screw', 'lvLathe', { id: forms.rod, amount: 1 }, { id: forms.screw, amount: 4 }, 4),
      lvProcess(family.id, 'wire', 'lvWiremill', { id: forms.ingot, amount: 1 }, { id: forms.wire, amount: 2 }, 1),
      lvProcess(family.id, 'foil', 'lvBender', { id: forms.ingot, amount: 2 }, { id: forms.foil, amount: 4 }, 2),
      lvProcess(family.id, 'fineWire', 'lvWiremill', { id: forms.ingot, amount: 3 }, { id: forms.fineWire, amount: 8 }, 3),
    ]

    for (const candidate of candidates) {
      if (!processRouteExists(authored, candidate.machineId, candidate.output!.id)) generated.push(candidate)
    }
  }

  return generated
}
