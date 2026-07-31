import type { MaterialFormId } from './materialIds'
import type { FluidId, MachineId, MachineSpec, Recipe, ResourceId, ResourceSpec } from './types'

export type RecipeGroupOutput =
  | {
      kind: 'resource'
      id: ResourceId
      amount: number
    }
  | {
      kind: 'machine'
      id: MachineId
      amount: number
    }
  | {
      kind: 'fluid'
      id: FluidId
      amount: number
    }

export type RecipeGroup = {
  key: string
  output: RecipeGroupOutput
  recipes: Recipe[]
}

export type RecipeGroupCollection = {
  key: string
  label: string
  groups: RecipeGroup[]
  grouped: boolean
}

const materialFormLabels: Record<MaterialFormId, string> = {
  ingot: 'Ingots',
  dust: 'Dusts',
  plate: 'Plates',
  rod: 'Rods',
  bolt: 'Bolts',
  ring: 'Rings',
  screw: 'Screws',
  gear: 'Gears',
  wire: 'Wires',
  fineWire: 'Fine Wires',
  foil: 'Foils',
}

const toolFamilies = [
  { suffix: 'Pestle & Mortar', label: 'Pestles & Mortars' },
  { suffix: 'Wire Cutters', label: 'Wire Cutters' },
  { suffix: 'Imprint Die', label: 'Imprint Dies' },
  { suffix: 'Pickaxe', label: 'Pickaxes' },
  { suffix: 'Shovel', label: 'Shovels' },
  { suffix: 'Hammer', label: 'Hammers' },
  { suffix: 'Wrench', label: 'Wrenches' },
  { suffix: 'Crowbar', label: 'Crowbars' },
  { suffix: 'Axe', label: 'Axes' },
  { suffix: 'File', label: 'Files' },
] as const

const tankMachineIds = new Set<MachineId>(['steamTank', 'steelTank', 'lvSuperTank'])

function resourceCollection(group: RecipeGroup, resourceSpecs: Partial<Record<ResourceId, ResourceSpec>>) {
  if (group.output.kind !== 'resource') return undefined
  const resourceSpec = resourceSpecs[group.output.id]
  if (resourceSpec?.materialForm) {
    return { key: `material-form:${resourceSpec.materialForm}`, label: materialFormLabels[resourceSpec.materialForm] }
  }
  if (resourceSpec?.category === 'tool') {
    const family = toolFamilies.find(({ suffix }) => resourceSpec.label.endsWith(suffix))
    if (family) {
      return {
        key: `tool-family:${family.suffix.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`,
        label: family.label,
      }
    }
  }
  return { key: `direct:${group.key}`, label: resourceSpec?.label ?? group.key }
}

function machineCollection(group: RecipeGroup, machineSpecs: Partial<Record<MachineId, MachineSpec>>) {
  if (group.output.kind !== 'machine') return undefined
  const machine = machineSpecs[group.output.id]
  if (tankMachineIds.has(group.output.id)) return { key: 'machine-family:tank', label: 'Tanks' }
  if (!machine) return { key: `direct:${group.key}`, label: group.key }

  const familyId = group.output.id.replace(/(?:2A|4A|8A)/g, '').replace(/^(?:steam|lv|mv)/, '')
  if (familyId === group.output.id) return { key: `direct:${group.key}`, label: machine.name }

  const familyLabel = machine.name.replace(/^(?:Steam|LV|MV)\s+/, '').replace(/\s+(?:2A|4A|8A)\b/, '')
  return { key: `machine-family:${familyId}`, label: familyLabel }
}

export function recipeGroupOutputs(recipe: Recipe): RecipeGroupOutput[] {
  return [
    ...recipe.outputs.filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'resource' as const, ...amount })),
    ...(recipe.machineOutputs ?? []).filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'machine' as const, ...amount })),
    ...(recipe.fluidOutputs ?? []).filter((amount) => amount.amount > 0).map((amount) => ({ kind: 'fluid' as const, ...amount })),
  ]
}

export function recipeGroupOutput(recipe: Recipe): RecipeGroupOutput | undefined {
  return recipeGroupOutputs(recipe)[0]
}

export function recipeGroupKeyForOutput(output: RecipeGroupOutput) {
  return `${output.kind}:${output.id}`
}

export function recipeGroupKey(recipe: Recipe) {
  const output = recipeGroupOutput(recipe)
  return output ? recipeGroupKeyForOutput(output) : `recipe:${recipe.id}`
}

export function groupRecipesByOutput(recipes: Recipe[]): RecipeGroup[] {
  const groups = new Map<string, RecipeGroup>()

  for (const recipe of recipes) {
    const outputs = recipeGroupOutputs(recipe)
    if (outputs.length < 1) {
      const key = `recipe:${recipe.id}`
      groups.set(key, { key, output: { kind: 'machine', id: 'furnace', amount: 0 }, recipes: [recipe] })
      continue
    }

    for (const output of outputs) {
      const key = recipeGroupKeyForOutput(output)
      const group = groups.get(key)
      if (group) {
        group.recipes.push(recipe)
      } else {
        groups.set(key, { key, output, recipes: [recipe] })
      }
    }
  }

  return [...groups.values()]
}

export function collectRecipeGroupsByItemType(
  groups: RecipeGroup[],
  resourceSpecs: Partial<Record<ResourceId, ResourceSpec>>,
  machineSpecs: Partial<Record<MachineId, MachineSpec>> = {},
): RecipeGroupCollection[] {
  const collections = new Map<string, RecipeGroupCollection>()

  for (const group of groups) {
    const collection = resourceCollection(group, resourceSpecs)
      ?? machineCollection(group, machineSpecs)
      ?? { key: `direct:${group.key}`, label: group.key }
    const existing = collections.get(collection.key)

    if (existing) {
      existing.groups.push(group)
      existing.grouped = true
      continue
    }

    collections.set(collection.key, {
      key: collection.key,
      label: collection.label,
      groups: [group],
      grouped: false,
    })
  }

  return [...collections.values()]
}

export function expandRecipeGroupCollections(
  collections: RecipeGroupCollection[],
  expandedCollectionKey: string | null,
): RecipeGroup[] {
  return collections.flatMap((collection) => (
    collection.grouped && collection.key === expandedCollectionKey
      ? collection.groups
      : collection.groups.slice(0, 1)
  ))
}
