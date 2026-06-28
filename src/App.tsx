import { Anvil, Axe, BookOpen, Check, Factory, Flame, Hammer, Pickaxe, RotateCcw, Sparkles, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { gatherTargets, machines, recipes, resourceLabels } from './game/content'
import {
  canCompleteQuest,
  canCraft,
  completeQuest,
  getBestToolForTarget,
  hitGatherTarget,
  loadGame,
  nextQuest,
  questProgress,
  saveGame,
  saveKey,
  startCraft,
  tickGame,
  visibleQuests,
  visibleRecipes,
} from './game/engine'
import type { ActiveCraft, GameState, MachineId, Quest, Recipe, ResourceAmount, ResourceId } from './game/types'

type FloatText = {
  id: number
  label: string
}

type Page = 'play' | 'guide'
type CraftSlot = ResourceId | null

const featuredResources: ResourceId[] = [
  'log',
  'plank',
  'stick',
  'woodenAxe',
  'stone',
  'copperOre',
  'tinOre',
  'coal',
  'clay',
  'sand',
  'rubberSap',
  'water',
  'primitiveCircuit',
]

const machineOrder: MachineId[] = [
  'workbench',
  'furnace',
  'steamBoiler',
  'steamHammer',
  'steamGrinder',
  'steamAssembler',
  'lvGenerator',
  'slowOreTap',
]

function formatAmount(amount: number) {
  if (amount >= 1000) return amount.toLocaleString()
  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(1)
}

function formatMs(ms: number) {
  return `${Math.max(0, ms / 1000).toFixed(1)}s`
}

function ResourcePill({ amount }: { amount: ResourceAmount }) {
  return (
    <span className="resource-pill">
      {resourceLabels[amount.id]} <strong>{formatAmount(amount.amount)}</strong>
    </span>
  )
}

function countGridItems(grid: CraftSlot[]) {
  return grid.reduce(
    (counts, id) => {
      if (id) counts[id] = (counts[id] ?? 0) + 1
      return counts
    },
    {} as Record<ResourceId, number>,
  )
}

function gridAmounts(grid: CraftSlot[]): ResourceAmount[] {
  return Object.entries(countGridItems(grid))
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id: id as ResourceId, amount }))
}

function ingredientKey(amounts: ResourceAmount[]) {
  return amounts
    .filter((amount) => amount.amount > 0)
    .map((amount) => `${amount.id}:${amount.amount}`)
    .sort()
    .join('|')
}

function findGridRecipe(grid: CraftSlot[], availableRecipes: Recipe[]) {
  const currentKey = ingredientKey(gridAmounts(grid))
  if (!currentKey) return undefined
  return availableRecipes.find((recipe) => ingredientKey(recipe.inputs) === currentKey)
}

function CraftProgress({ craft, recipe }: { craft: ActiveCraft; recipe: Recipe }) {
  const progress = Math.min(100, ((craft.durationMs - craft.remainingMs) / craft.durationMs) * 100)

  return (
    <div className="active-craft">
      <div>
        <strong>{recipe.name}</strong>
        <span>{formatMs(craft.remainingMs)}</span>
      </div>
      <div className="progress-track" aria-label={`${recipe.name} progress`}>
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function QuestCard({
  quest,
  state,
  onComplete,
}: {
  quest: Quest
  state: GameState
  onComplete: (questId: string) => void
}) {
  const completed = state.completedQuests.includes(quest.id)

  return (
    <article className={completed ? 'guide-card completed' : 'guide-card'}>
      <div className="section-title">
        <div>
          <p className="eyebrow">{quest.chapter}</p>
          <h3>{quest.title}</h3>
        </div>
        {completed && <Check size={20} />}
      </div>
      <p>{quest.description}</p>
      <div className="progress-track quest-progress">
        <span style={{ width: `${questProgress(state, quest) * 100}%` }} />
      </div>
      <div className="requirement-list">
        {(quest.requirements.resources ?? []).map((amount) => (
          <ResourcePill amount={amount} key={amount.id} />
        ))}
        {(quest.requirements.machines ?? []).map((amount) => (
          <span className="resource-pill" key={amount.id}>
            {machines[amount.id].name} <strong>{amount.amount}</strong>
          </span>
        ))}
      </div>
      {(quest.rewards.resources?.length || quest.rewards.machines?.length) && (
        <div className="reward-list" aria-label={`${quest.title} rewards`}>
          <span>Reward</span>
          {(quest.rewards.resources ?? []).map((amount) => (
            <ResourcePill amount={amount} key={amount.id} />
          ))}
          {(quest.rewards.machines ?? []).map((amount) => (
            <span className="resource-pill" key={amount.id}>
              {machines[amount.id].name} <strong>{amount.amount}</strong>
            </span>
          ))}
        </div>
      )}
      <button type="button" disabled={completed || !canCompleteQuest(state, quest)} onClick={() => onComplete(quest.id)}>
        {completed ? 'Claimed' : 'Claim reward'}
      </button>
    </article>
  )
}

function App() {
  const [state, setState] = useState<GameState>(() => loadGame(localStorage.getItem(saveKey)))
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([])
  const [page, setPage] = useState<Page>('play')
  const [craftGrid, setCraftGrid] = useState<CraftSlot[]>(() => Array.from({ length: 9 }, () => null))

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickGame(current, 250).state)
    }, 250)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem(saveKey, saveGame(state))
  }, [state])

  const unlockedRecipes = useMemo(() => visibleRecipes(state), [state])
  const guideQuests = useMemo(() => visibleQuests(state), [state])
  const visibleInventoryResources = featuredResources.filter((id) => {
    const isWoodLoop = id === 'log' || id === 'plank' || id === 'stick' || id === 'woodenAxe'
    return isWoodLoop || state.resources[id] > 0
  })
  const activeQuest = nextQuest(state)
  const gridCounts = countGridItems(craftGrid)
  const matchingRecipe = findGridRecipe(craftGrid, unlockedRecipes)
  const tree = gatherTargets.tree
  const currentTool = getBestToolForTarget(state, 'tree')
  const treeProgress = state.gatherProgress.tree ?? 0
  const treeProgressPercent = Math.min(100, (treeProgress / tree.hardness) * 100)
  const totalMachines = machineOrder.reduce((sum, id) => sum + state.machines[id], 0)
  const steamUnlocked = state.completedQuests.includes('pressureProgress')
  const lvUnlocked = state.completedQuests.includes('firstCurrent')

  const addFloatText = (label: string) => {
    const id = Date.now() + Math.random()
    setFloatTexts((current) => [...current.slice(-4), { id, label }])
    window.setTimeout(() => {
      setFloatTexts((current) => current.filter((floatText) => floatText.id !== id))
    }, 850)
  }

  const handleHitTree = () => {
    setState((current) => {
      const result = hitGatherTarget(current, 'tree')
      if (result.completed) {
        addFloatText('Log gained')
      } else if (result.tool.id === 'woodenAxe') {
        addFloatText('Axe bites')
      } else {
        addFloatText('Tree cracked')
      }
      return result.state
    })
  }

  const handleCraft = (recipeId: string) => {
    const recipe = recipes.find((candidate) => candidate.id === recipeId)
    if (recipe) addFloatText(recipe.id === 'craft_wooden_axe' ? 'axe equipped soon' : recipe.machineOutputs ? 'building...' : 'crafting...')
    setState((current) => startCraft(current, recipeId))
  }

  const handleAddToCraftGrid = (resourceId: ResourceId) => {
    const used = gridCounts[resourceId] ?? 0
    if (state.resources[resourceId] - used < 1) {
      addFloatText('none left')
      return
    }

    const emptySlot = craftGrid.findIndex((slot) => slot === null)
    if (emptySlot === -1) {
      addFloatText('grid full')
      return
    }

    setCraftGrid((current) => current.map((slot, index) => (index === emptySlot ? resourceId : slot)))
  }

  const handleRemoveCraftSlot = (slotIndex: number) => {
    setCraftGrid((current) => current.map((slot, index) => (index === slotIndex ? null : slot)))
  }

  const handleClearCraftGrid = () => {
    setCraftGrid(Array.from({ length: 9 }, () => null))
  }

  const handleCraftFromGrid = () => {
    if (!matchingRecipe || !canCraft(state, matchingRecipe)) return
    handleCraft(matchingRecipe.id)
    handleClearCraftGrid()
  }

  const handleCompleteQuest = (questId: string) => {
    setState((current) => completeQuest(current, questId))
    addFloatText('reward claimed')
  }

  const handleReset = () => {
    localStorage.removeItem(saveKey)
    setState(loadGame(null))
    handleClearCraftGrid()
    setPage('play')
    addFloatText('fresh save')
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">Block-tech idle</p>
          <h1>Click Foundry</h1>
        </div>
        <button type="button" className="icon-button" aria-label="Reset save" title="Reset save" onClick={handleReset}>
          <RotateCcw size={18} />
        </button>
      </header>

      <section className="status-grid" aria-label="Progress summary">
        <div>
          <Sparkles size={18} />
          <span>Guide</span>
          <strong>{activeQuest?.chapter ?? 'Complete'}</strong>
        </div>
        <div>
          <Factory size={18} />
          <span>Machines</span>
          <strong>{totalMachines}</strong>
        </div>
        <div>
          <Zap size={18} />
          <span>Era</span>
          <strong>{lvUnlocked ? 'LV' : steamUnlocked ? 'Steam' : 'Manual'}</strong>
        </div>
      </section>

      <section className="page-tabs" aria-label="Game pages">
        <button type="button" className={page === 'play' ? 'active' : ''} onClick={() => setPage('play')}>
          <Pickaxe size={18} />
          Play
        </button>
        <button type="button" className={page === 'guide' ? 'active' : ''} onClick={() => setPage('guide')}>
          <BookOpen size={18} />
          Guide
        </button>
      </section>

      {page === 'play' ? (
        <>
          <section className="resource-bar" aria-label="Resources">
            {visibleInventoryResources.map((id) => (
              <div className={state.resources[id] > 0 ? 'resource-cell stocked' : 'resource-cell'} key={id}>
                <span>{resourceLabels[id]}</span>
                <strong>{formatAmount(state.resources[id])}</strong>
              </div>
            ))}
          </section>

          <section className="tap-panel" aria-label="Manual gathering">
            <div className="mine-face">
              <div className="block-sprite" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div>
                <h2>{tree.name}</h2>
                <p>{tree.description}</p>
              </div>
              <div className="float-layer" aria-live="polite">
                {floatTexts.map((floatText) => (
                  <span key={floatText.id}>{floatText.label}</span>
                ))}
              </div>
            </div>

            <div className="break-panel">
              <div className="break-stats">
                <span>Tool: <strong>{currentTool.name}</strong></span>
                <span>Drop: <strong>{tree.drops.map((drop) => `${drop.amount} ${resourceLabels[drop.id]}`).join(', ')}</strong></span>
                <span>Hit: <strong>{currentTool.damageByTarget.tree ?? 1}/{tree.hardness}</strong></span>
              </div>
              <div className="progress-track">
                <span style={{ width: `${treeProgressPercent}%` }} />
              </div>
              <button type="button" className="hit-button" onClick={handleHitTree}>
                <Axe size={20} />
                Hit tree
              </button>
            </div>
          </section>

          <section className="workshop-grid">
            <div className="panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Hand crafting</p>
                  <h2>Crafting grid</h2>
                </div>
                <Hammer size={22} />
              </div>

              <div className="crafting-bench">
                <div className="craft-grid" aria-label="Crafting grid">
                  {craftGrid.map((slot, index) => (
                    <button
                      type="button"
                      className={slot ? 'craft-slot filled' : 'craft-slot'}
                      aria-label={slot ? `Remove ${resourceLabels[slot]}` : `Empty crafting slot ${index + 1}`}
                      onClick={() => handleRemoveCraftSlot(index)}
                      key={`${slot ?? 'empty'}-${index}`}
                    >
                      {slot ? resourceLabels[slot] : ''}
                    </button>
                  ))}
                </div>

                <div className="craft-output" aria-live="polite">
                  <span>Output</span>
                  <strong>
                    {matchingRecipe
                      ? matchingRecipe.outputs.length > 0
                        ? matchingRecipe.outputs.map((amount) => `${amount.amount} ${resourceLabels[amount.id]}`).join(', ')
                        : matchingRecipe.machineOutputs?.map((amount) => `${amount.amount} ${machines[amount.id].name}`).join(', ')
                      : 'No match'}
                  </strong>
                  {matchingRecipe && <small>{formatMs(matchingRecipe.durationMs)}</small>}
                </div>

                <div className="craft-actions">
                  <button type="button" onClick={handleClearCraftGrid}>
                    Clear
                  </button>
                  <button type="button" disabled={!matchingRecipe || !canCraft(state, matchingRecipe)} onClick={handleCraftFromGrid}>
                    Craft match
                  </button>
                </div>

                <div className="craft-inventory" aria-label="Crafting inventory">
                  {visibleInventoryResources
                    .filter((id) => state.resources[id] > 0)
                    .map((id) => {
                      const available = state.resources[id] - (gridCounts[id] ?? 0)
                      return (
                        <button type="button" disabled={available < 1} onClick={() => handleAddToCraftGrid(id)} key={id}>
                          <span>{resourceLabels[id]}</span>
                          <strong>{formatAmount(available)}</strong>
                        </button>
                      )
                    })}
                </div>

                <div className="recipe-hints" aria-label="Recipe hints">
                  {unlockedRecipes.map((recipe) => (
                    <article className={matchingRecipe?.id === recipe.id ? 'recipe-hint matched' : 'recipe-hint'} key={recipe.id}>
                      <div>
                        <h3>{recipe.name}</h3>
                        <p>{recipe.description}</p>
                      </div>
                      <div className="requirement-list">
                        {recipe.inputs.map((amount) => (
                          <ResourcePill amount={amount} key={amount.id} />
                        ))}
                        {recipe.requiredMachine && <span className="resource-pill">{machines[recipe.requiredMachine].name}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Machines</p>
                  <h2>Workshop</h2>
                </div>
                <Anvil size={22} />
              </div>

              <div className="machine-list">
                {machineOrder.map((id) => {
                  const machine = machines[id]
                  const count = state.machines[id]
                  const progress = machine.intervalMs ? ((state.machineProgress[id] ?? 0) / machine.intervalMs) * 100 : 0

                  return (
                    <article className={count > 0 ? 'machine-card online' : 'machine-card'} key={id}>
                      <div>
                        <h3>{machine.name}</h3>
                        <p>{machine.description}</p>
                      </div>
                      <strong>x{count}</strong>
                      {machine.intervalMs && count > 0 && (
                        <div className="progress-track">
                          <span style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="guide-page" aria-label="Quest guide">
          <div className="section-title">
            <div>
              <p className="eyebrow">Optional guide</p>
              <h2>Quest book</h2>
            </div>
            <BookOpen size={22} />
          </div>

          <div className="guide-list">
            {guideQuests.map((quest) => (
              <QuestCard quest={quest} state={state} onComplete={handleCompleteQuest} key={quest.id} />
            ))}
          </div>
        </section>
      )}

      {state.activeCrafts.length > 0 && (
        <section className="active-stack" aria-label="Active crafting">
          <div className="section-title">
            <div>
              <p className="eyebrow">Running</p>
              <h2>Queue</h2>
            </div>
            <Flame size={22} />
          </div>
          {state.activeCrafts.map((craft) => {
            const recipe = recipes.find((candidate) => candidate.id === craft.recipeId)
            return recipe ? <CraftProgress craft={craft} recipe={recipe} key={`${craft.recipeId}-${craft.startedAt}`} /> : null
          })}
        </section>
      )}
    </main>
  )
}

export default App
