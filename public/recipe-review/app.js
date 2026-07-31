const storageKey = 'click-foundry-recipe-workbench-v4'

const app = {
  data: null,
  originals: new Map(),
  drafts: new Map(),
  reviews: new Map(),
  selected: null,
  filter: 'all',
  kind: 'crafting',
  picker: null,
}

const $ = (id) => document.getElementById(id)
const clone = (value) => JSON.parse(JSON.stringify(value))
const keyOf = (recipe) => `${recipe.kind}:${recipe.id}`
const resourceById = (id) => app.data.resources.find((entry) => entry.id === id)
const machineById = (id) => app.data.machines.find((entry) => entry.id === id)
const fluidById = (id) => app.data.fluids.find((entry) => entry.id === id)
const toolFamilyById = (id) => app.data.toolFamilies.find((entry) => entry.id === id)
const labelOf = (id, kind = 'resource') => {
  if (kind === 'machine') return machineById(id)?.label || id
  if (kind === 'fluid') return fluidById(id)?.label || id
  return resourceById(id)?.label || id
}
const iconSrc = (id, kind = 'resource') => `../game-icons/${kind === 'machine' ? 'machines' : 'resources'}/${id}.png`
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character])

function allRecipes() {
  const base = app.kind === 'process' ? app.data.processRecipes : app.data.recipes
  const additions = [...app.drafts.values()].filter((recipe) => recipe.kind === app.kind && !app.originals.has(keyOf(recipe)))
  return [...base, ...additions]
}

function currentRecipe() {
  return app.drafts.get(app.selected) || app.originals.get(app.selected)
}

function reviewState(key) {
  return app.reviews.get(key) || 'unreviewed'
}

function isChanged(key) {
  const draft = app.drafts.get(key)
  if (!draft) return false
  const original = app.originals.get(key)
  return !original || JSON.stringify(draft) !== JSON.stringify(original)
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify({
    schemaVersion: 4,
    drafts: Object.fromEntries(app.drafts),
    reviews: Object.fromEntries(app.reviews),
  }))
}

function notify(message) {
  const toast = $('toast')
  toast.textContent = message
  toast.classList.add('visible')
  clearTimeout(notify.timeout)
  notify.timeout = setTimeout(() => toast.classList.remove('visible'), 1800)
}

function outputEntries(recipe) {
  if (recipe.kind === 'process') {
    return [
      ...(recipe.output ? [{ kind: 'resource', ...recipe.output }] : []),
      ...(recipe.secondaryOutput ? [{ kind: 'resource', ...recipe.secondaryOutput }] : []),
      ...(recipe.machineOutput ? [{ kind: 'machine', ...recipe.machineOutput }] : []),
      ...(recipe.fluidOutputs || (recipe.fluidOutput ? [recipe.fluidOutput] : [])).map((entry) => ({ kind: 'fluid', ...entry })),
    ]
  }
  return [
    ...(recipe.outputs || []).map((entry) => ({ kind: 'resource', ...entry })),
    ...(recipe.machineOutputs || []).map((entry) => ({ kind: 'machine', ...entry })),
    ...(recipe.fluidOutputs || []).map((entry) => ({ kind: 'fluid', ...entry })),
  ]
}

function primaryOutput(recipe) {
  return outputEntries(recipe)[0] || null
}

function processItemInputs(recipe) {
  return [recipe.input, recipe.secondaryInput, ...(recipe.extraInputs || [])].filter(Boolean)
}

function processFluidInputs(recipe) {
  return recipe.fluidInputs || (recipe.fluidInput ? [recipe.fluidInput] : [])
}

function searchableText(recipe) {
  const ids = recipe.kind === 'process'
    ? [
        ...processItemInputs(recipe).map((entry) => entry.id),
        ...(recipe.fuelInput ? [recipe.fuelInput.id] : []),
        ...processFluidInputs(recipe).map((entry) => entry.id),
        recipe.machineId,
      ]
    : [
        ...(recipe.pattern || []),
        ...(recipe.inputs || []).map((entry) => entry.id),
        ...(recipe.catalysts || []).map((entry) => entry.id),
        ...(recipe.machineInputs || []).map((entry) => entry.id),
      ]
  const outputs = outputEntries(recipe)
  return [
    recipe.id,
    recipe.name,
    recipe.description,
    recipe.tier,
    ...ids,
    ...ids.map((id) => labelOf(id, machineById(id) ? 'machine' : fluidById(id) ? 'fluid' : 'resource')),
    ...outputs.flatMap((entry) => [entry.id, labelOf(entry.id, entry.kind)]),
  ].filter(Boolean).join(' ').toLowerCase()
}

function filteredRecipes() {
  const query = $('search').value.trim().toLowerCase()
  return allRecipes().filter((base) => {
    const key = keyOf(base)
    const recipe = app.drafts.get(key) || base
    if (query && !searchableText(recipe).includes(query)) return false
    if (app.filter === 'unreviewed' && reviewState(key) !== 'unreviewed') return false
    if (app.filter === 'edited' && !isChanged(key)) return false
    if (app.filter === 'flagged' && reviewState(key) !== 'flagged') return false
    return true
  })
}

function effectiveStatus(key) {
  if (reviewState(key) !== 'unreviewed') return reviewState(key)
  return isChanged(key) ? 'edited' : 'unreviewed'
}

function imageMarkup(id, kind = 'resource') {
  if (!id) return ''
  if (kind === 'fluid') {
    const color = fluidById(id)?.color || '#7acbd1'
    return `<span class="fluid-glyph" style="--fluid-color:${escapeHtml(color)}" aria-hidden="true"></span>`
  }
  return `<img src="${iconSrc(id, kind)}" alt="" draggable="false" onerror="this.style.visibility='hidden'">`
}

function renderRecipeList() {
  const recipes = filteredRecipes()
  $('recipe-list').innerHTML = recipes.map((base) => {
    const key = keyOf(base)
    const recipe = app.drafts.get(key) || base
    const output = primaryOutput(recipe)
    return `
      <button class="recipe-row ${key === app.selected ? 'active' : ''}" data-recipe-key="${key}" title="${escapeHtml(recipe.name)}">
        <span class="recipe-row-icon">${output ? imageMarkup(output.id, output.kind) : ''}</span>
        <span class="recipe-row-copy">
          <strong>${escapeHtml(recipe.name)}</strong>
          <small>${escapeHtml(recipe.tier)} · ${escapeHtml(recipe.id)}</small>
        </span>
        <span class="review-dot ${effectiveStatus(key)}"></span>
      </button>
    `
  }).join('') || '<div class="empty-state">No recipes match this view.</div>'

  $('recipe-list').querySelectorAll('[data-recipe-key]').forEach((button) => {
    button.addEventListener('click', () => {
      app.selected = button.dataset.recipeKey
      render()
      scrollSelectedRecipeIntoView()
    })
  })

  const catalogue = allRecipes()
  const reviewed = catalogue.filter((recipe) => reviewState(keyOf(recipe)) !== 'unreviewed').length
  const changed = catalogue.filter((recipe) => isChanged(keyOf(recipe))).length
  $('catalogue-status').textContent = `${reviewed}/${catalogue.length} reviewed · ${changed} edited`
}

function displayCraftSlots(recipe) {
  if (recipe.pattern) {
    const slots = Array.from({ length: 9 }, (_, index) => {
      const entry = recipe.pattern[index] || null
      if (!entry) return null
      return typeof entry === 'string'
        ? { kind: 'resource', id: entry, amount: 1 }
        : { kind: 'machine', id: entry.id, amount: 1 }
    })
    const representedMachines = new Map()
    slots.forEach((slot) => {
      if (slot?.kind === 'machine') representedMachines.set(slot.id, (representedMachines.get(slot.id) || 0) + 1)
    })
    ;(recipe.machineInputs || []).forEach((entry) => {
      const missing = Math.max(0, entry.amount - (representedMachines.get(entry.id) || 0))
      for (let count = 0; count < missing; count += 1) {
        const emptyIndex = slots.findIndex((slot) => !slot)
        if (emptyIndex >= 0) slots[emptyIndex] = { kind: 'machine', id: entry.id, amount: 1 }
      }
    })
    return slots
  }
  const entries = [
    ...(recipe.inputs || []).map((entry) => ({ kind: 'resource', ...clone(entry), reusable: false })),
    ...(recipe.catalysts || []).map((entry) => ({ kind: 'resource', ...clone(entry), reusable: true })),
    ...(recipe.machineInputs || []).map((entry) => ({ kind: 'machine', ...clone(entry), reusable: false })),
  ]
  return Array.from({ length: 9 }, (_, index) => entries[index] || null)
}

function reusableIds(recipe) {
  return new Set((recipe.catalysts || []).map((entry) => entry.id))
}

function syncInputsFromPattern(recipe) {
  if (!recipe.pattern) return
  const reusable = reusableIds(recipe)
  const resourceCounts = new Map()
  const machineCounts = new Map()
  recipe.pattern.filter(Boolean).forEach((entry) => {
    if (typeof entry === 'string') {
      if (!reusable.has(entry)) resourceCounts.set(entry, (resourceCounts.get(entry) || 0) + 1)
    } else {
      machineCounts.set(entry.id, (machineCounts.get(entry.id) || 0) + 1)
    }
  })
  recipe.inputs = [...resourceCounts].map(([id, amount]) => ({ id, amount }))
  recipe.machineInputs = [...machineCounts].map(([id, amount]) => ({ id, amount }))
  recipe.catalysts = (recipe.catalysts || []).filter((entry) => recipe.pattern.includes(entry.id))
  recipe.durabilityCosts = (recipe.durabilityCosts || []).filter((entry) => recipe.pattern.includes(entry.id))
  if (!recipe.catalysts.length) delete recipe.catalysts
  if (!recipe.durabilityCosts.length) delete recipe.durabilityCosts
  if (!recipe.machineInputs.length) delete recipe.machineInputs
}

function writeDraft(recipe) {
  app.drafts.set(keyOf(recipe), clone(recipe))
  app.selected = keyOf(recipe)
  persist()
  render()
}

function setGridSlot(index, id, kind = 'resource', reusable = false) {
  const recipe = clone(currentRecipe())
  if (recipe.pattern) {
    recipe.pattern = displayCraftSlots(recipe).map((slot) => (
      slot ? (slot.kind === 'machine' ? { kind: 'machine', id: slot.id } : slot.id) : null
    ))
    const previousEntry = recipe.pattern[index]
    const previousId = typeof previousEntry === 'string' ? previousEntry : null
    recipe.pattern[index] = id ? (kind === 'machine' ? { kind: 'machine', id } : id) : null
    if (previousId && !recipe.pattern.includes(previousId)) {
      recipe.catalysts = (recipe.catalysts || []).filter((entry) => entry.id !== previousId)
      recipe.durabilityCosts = (recipe.durabilityCosts || []).filter((entry) => entry.id !== previousId)
    }
    if (id && kind === 'resource') {
      recipe.catalysts = (recipe.catalysts || []).filter((entry) => entry.id !== id)
      recipe.durabilityCosts = (recipe.durabilityCosts || []).filter((entry) => entry.id !== id)
      if (reusable) {
        recipe.catalysts.push({ id, amount: 1 })
        recipe.durabilityCosts.push({ id, amount: 1 })
      }
    }
    syncInputsFromPattern(recipe)
  } else {
    const slots = displayCraftSlots(recipe)
    slots[index] = id ? { kind, id, amount: slots[index]?.id === id && slots[index]?.kind === kind ? slots[index].amount : 1, reusable } : null
    const combine = (entries) => [...entries.reduce((amounts, entry) => {
      amounts.set(entry.id, (amounts.get(entry.id) || 0) + entry.amount)
      return amounts
    }, new Map())].map(([entryId, amount]) => ({ id: entryId, amount }))
    recipe.inputs = combine(slots.filter((entry) => entry?.kind === 'resource' && !entry.reusable))
    recipe.machineInputs = combine(slots.filter((entry) => entry?.kind === 'machine'))
    const catalysts = combine(slots.filter((entry) => entry?.kind === 'resource' && entry.reusable))
    if (catalysts.length) {
      recipe.catalysts = catalysts
      recipe.durabilityCosts = clone(catalysts)
    } else {
      delete recipe.catalysts
      delete recipe.durabilityCosts
    }
    if (!recipe.machineInputs.length) delete recipe.machineInputs
  }
  writeDraft(recipe)
}

function setCraftOutput(id, kind) {
  const recipe = clone(currentRecipe())
  const previous = primaryOutput(recipe)
  const amount = previous?.amount || 1
  if (kind === 'machine') {
    recipe.outputs = []
    recipe.machineOutputs = [{ id, amount }]
    delete recipe.fluidOutputs
  } else if (kind === 'fluid') {
    recipe.outputs = []
    delete recipe.machineOutputs
    recipe.fluidOutputs = [{ id, amount }]
  } else {
    recipe.outputs = [{ id, amount }]
    delete recipe.machineOutputs
    delete recipe.fluidOutputs
  }
  writeDraft(recipe)
}

function setCraftOutputAmount(amount) {
  const recipe = clone(currentRecipe())
  const nextAmount = Math.max(1, Math.floor(Number(amount) || 1))
  if (recipe.outputs?.[0]) recipe.outputs[0].amount = nextAmount
  if (recipe.machineOutputs?.[0]) recipe.machineOutputs[0].amount = nextAmount
  if (recipe.fluidOutputs?.[0]) recipe.fluidOutputs[0].amount = nextAmount
  writeDraft(recipe)
}

function setMachineComponent(index, id) {
  const recipe = clone(currentRecipe())
  const values = clone(recipe.machineInputs || [])
  if (id) values[index] = { id, amount: values[index]?.amount || 1 }
  else values.splice(index, 1)
  recipe.machineInputs = values
  if (!values.length) delete recipe.machineInputs
  writeDraft(recipe)
}

function setMachineComponentAmount(index, amount) {
  const recipe = clone(currentRecipe())
  if (!recipe.machineInputs?.[index]) return
  recipe.machineInputs[index].amount = Math.max(1, Math.floor(Number(amount) || 1))
  writeDraft(recipe)
}

function assignProcessItemInputs(recipe, entries) {
  delete recipe.input
  delete recipe.secondaryInput
  delete recipe.extraInputs
  if (entries[0]) recipe.input = entries[0]
  if (entries[1]) recipe.secondaryInput = entries[1]
  if (entries.length > 2) recipe.extraInputs = entries.slice(2)
}

function assignProcessFluidInputs(recipe, entries) {
  delete recipe.fluidInput
  delete recipe.fluidInputs
  if (entries.length === 1) recipe.fluidInput = entries[0]
  if (entries.length > 1) recipe.fluidInputs = entries
}

function assignProcessOutputs(recipe, entries) {
  delete recipe.output
  delete recipe.secondaryOutput
  delete recipe.machineOutput
  delete recipe.fluidOutput
  delete recipe.fluidOutputs
  const resources = entries.filter((entry) => entry.kind === 'resource')
  const machines = entries.filter((entry) => entry.kind === 'machine')
  const fluids = entries.filter((entry) => entry.kind === 'fluid')
  if (resources[0]) recipe.output = { id: resources[0].id, amount: resources[0].amount }
  if (resources[1]) recipe.secondaryOutput = { id: resources[1].id, amount: resources[1].amount }
  if (machines[0]) recipe.machineOutput = { id: machines[0].id, amount: machines[0].amount }
  if (fluids.length === 1) recipe.fluidOutput = { id: fluids[0].id, amount: fluids[0].amount, ...(fluids[0].bufferId ? { bufferId: fluids[0].bufferId } : {}) }
  if (fluids.length > 1) recipe.fluidOutputs = fluids.map(({ id, amount, bufferId }) => ({ id, amount, ...(bufferId ? { bufferId } : {}) }))
}

function setProcessEntry(type, index, id, kind) {
  const recipe = clone(currentRecipe())
  if (type === 'itemInput') {
    const entries = processItemInputs(recipe)
    if (id) entries[index] = { id, amount: entries[index]?.amount || 1 }
    else entries.splice(index, 1)
    assignProcessItemInputs(recipe, entries)
  } else if (type === 'fluidInput') {
    const entries = clone(processFluidInputs(recipe))
    if (id) entries[index] = { id, amount: entries[index]?.amount || 1 }
    else entries.splice(index, 1)
    assignProcessFluidInputs(recipe, entries)
  } else if (type === 'fuelInput') {
    if (id) recipe.fuelInput = { id, amount: recipe.fuelInput?.amount || 1 }
    else delete recipe.fuelInput
  } else if (type === 'output') {
    const entries = outputEntries(recipe)
    if (id) entries[index] = { kind, id, amount: entries[index]?.amount || 1 }
    else entries.splice(index, 1)
    assignProcessOutputs(recipe, entries)
  } else if (type === 'machine') {
    recipe.machineId = id
  }
  writeDraft(recipe)
}

function setProcessAmount(type, index, amount) {
  const recipe = clone(currentRecipe())
  const nextAmount = Math.max(1, Number(amount) || 1)
  if (type === 'itemInput') {
    const entries = processItemInputs(recipe)
    if (entries[index]) entries[index].amount = nextAmount
    assignProcessItemInputs(recipe, entries)
  } else if (type === 'fluidInput') {
    const entries = clone(processFluidInputs(recipe))
    if (entries[index]) entries[index].amount = nextAmount
    assignProcessFluidInputs(recipe, entries)
  } else if (type === 'fuelInput' && recipe.fuelInput) {
    recipe.fuelInput.amount = nextAmount
  } else if (type === 'output') {
    const entries = outputEntries(recipe)
    if (entries[index]) entries[index].amount = nextAmount
    assignProcessOutputs(recipe, entries)
  }
  writeDraft(recipe)
}

function validateRecipe(recipe) {
  const issues = []
  const outputs = outputEntries(recipe)
  if (!outputs.length) issues.push('Recipe needs at least one output.')
  if (outputs.some((entry) => entry.amount < 1)) issues.push('Output amounts must be at least one.')
  if (recipe.kind === 'crafting') {
    if (recipe.pattern && recipe.pattern.length !== 9) issues.push('Shaped recipes require nine grid slots.')
    if (!recipe.pattern && !recipe.inputs?.length && !recipe.machineInputs?.length) issues.push('Recipe needs an input.')
    if (recipe.pattern && !recipe.pattern.some(Boolean) && !recipe.machineInputs?.length) issues.push('Crafting grid cannot be empty.')
  } else {
    if (!recipe.machineId) issues.push('Machine process needs a machine.')
    if (!processItemInputs(recipe).length && !processFluidInputs(recipe).length && !recipe.fuelInput) issues.push('Machine process needs an input.')
  }
  return issues
}

function reviewHeader(recipe, index, count) {
  const state = reviewState(app.selected)
  return `
    <div class="recipe-titlebar">
      <div>
        <span class="recipe-kicker">${escapeHtml(recipe.tier)} ${recipe.kind === 'process' ? 'machine process' : 'recipe'}</span>
        <h2>${escapeHtml(recipe.name)}</h2>
        <p>${escapeHtml(recipe.description)}</p>
      </div>
      <span class="position-counter">${Math.max(0, index) + 1} / ${count}</span>
    </div>
    <div class="review-actions">
      <button id="previous-recipe" aria-label="Previous recipe">‹</button>
      <button id="flag-recipe" class="flag-button ${state === 'flagged' ? 'active' : ''}">Needs work</button>
      <button id="approve-recipe" class="approve-button ${state === 'approved' ? 'active' : ''}">Approve</button>
      <button id="next-recipe" aria-label="Next recipe">›</button>
    </div>
  `
}

function amountControls(type, index, amount) {
  return `
    <div class="mini-amount-control">
      <button data-amount-step="${type}:${index}:-1" aria-label="Reduce amount">−</button>
      <input data-process-amount="${type}:${index}" type="number" min="1" value="${amount}" aria-label="Amount">
      <button data-amount-step="${type}:${index}:1" aria-label="Increase amount">+</button>
    </div>
  `
}

function renderCraftEditor(recipe, currentIndex, count) {
  const slots = displayCraftSlots(recipe)
  const output = primaryOutput(recipe)
  const reusable = reusableIds(recipe)
  const issues = validateRecipe(recipe)
  const station = recipe.stationType || recipe.recipeType || 'crafting table'
  return `
    ${reviewHeader(recipe, currentIndex, count)}
    <article class="crafting-card">
      <div class="crafting-card-header">
        <strong>Crafting Grid</strong>
        <div class="recipe-badges">
          <span class="recipe-badge">${recipe.pattern ? 'Shaped' : 'Shapeless'}</span>
          ${isChanged(app.selected) ? '<span class="recipe-badge">Edited</span>' : ''}
        </div>
      </div>
      <div class="crafting-stage">
        <div class="craft-grid">
          ${slots.map((slot, index) => {
            const family = slot?.kind === 'resource' ? toolFamilyById(slot.id) : null
            const isReusable = slot?.kind === 'resource' ? reusable.has(slot.id) : false
            const label = family && isReusable ? family.label : slot ? labelOf(slot.id, slot.kind) : `Empty slot ${index + 1}`
            return `
              <button class="craft-slot ${slot ? '' : 'empty'} ${isReusable ? 'reusable' : ''}" data-grid-slot="${index}" aria-label="${escapeHtml(label)}">
                ${slot ? imageMarkup(slot.id, slot.kind) : ''}
                ${slot?.amount > 1 ? `<span class="slot-amount">${slot.amount}</span>` : ''}
                ${isReusable ? '<span class="reusable-mark">∞</span>' : ''}
              </button>
            `
          }).join('')}
        </div>
        <div class="craft-arrow" aria-hidden="true"></div>
        <div class="output-area">
          <button class="output-slot ${output ? '' : 'empty'}" id="output-slot" aria-label="${output ? escapeHtml(labelOf(output.id, output.kind)) : 'Choose output'}">
            ${output ? imageMarkup(output.id, output.kind) : ''}
            ${output?.amount > 1 ? `<span class="slot-amount">${output.amount}</span>` : ''}
          </button>
          <div class="output-controls">
            <button id="output-minus" aria-label="Reduce output">−</button>
            <input id="output-amount" type="number" min="1" value="${output?.amount || 1}" aria-label="Output amount">
            <button id="output-plus" aria-label="Increase output">+</button>
          </div>
        </div>
      </div>
      <div class="recipe-tools">
        <button data-transform="mirror">Mirror</button>
        <button data-transform="rotate">Rotate</button>
        <button data-transform="compact">Compact</button>
        <button data-transform="mode">${recipe.pattern ? 'Shapeless' : 'Make shaped'}</button>
        <button data-transform="alternative">Clone alternative</button>
        <button data-transform="clear" class="danger-button">Clear grid</button>
        <button data-transform="revert" class="danger-button">${app.originals.has(app.selected) ? 'Revert' : 'Delete draft'}</button>
      </div>
    </article>
    <div class="recipe-meta">
      <div class="meta-cell"><span class="panel-label">Recipe ID</span><strong>${escapeHtml(recipe.id)}</strong></div>
      <div class="meta-cell"><span class="panel-label">Station</span><strong>${escapeHtml(station)}</strong></div>
      <div class="meta-cell"><span class="panel-label">Craft time</span><strong>${(recipe.durationMs / 1000).toFixed(1)}s</strong></div>
      <div class="meta-cell"><span class="panel-label">Tool families</span><strong>${[...reusable].filter((id) => toolFamilyById(id)).length}</strong></div>
    </div>
    <div class="recipe-validation ${issues.length ? 'invalid' : ''}">
      ${issues.length ? issues.map(escapeHtml).join(' ') : 'Recipe structure is valid and ready to export.'}
    </div>
  `
}

function processSlotMarkup(entry, type, index) {
  const label = labelOf(entry.id, entry.kind)
  return `
    <div class="process-entry">
      <button class="process-slot" data-process-entry="${type}:${index}" aria-label="${escapeHtml(label)}">
        ${imageMarkup(entry.id, entry.kind)}
        ${entry.amount > 1 ? `<span class="slot-amount">${entry.amount}</span>` : ''}
      </button>
      <span>${escapeHtml(label)}</span>
      ${amountControls(type, index, entry.amount)}
    </div>
  `
}

function renderProcessEditor(recipe, currentIndex, count) {
  const inputs = processItemInputs(recipe).map((entry) => ({ kind: 'resource', ...entry }))
  const fluids = processFluidInputs(recipe).map((entry) => ({ kind: 'fluid', ...entry }))
  const fuel = recipe.fuelInput ? [{ kind: 'resource', ...recipe.fuelInput }] : []
  const outputs = outputEntries(recipe)
  const issues = validateRecipe(recipe)
  return `
    ${reviewHeader(recipe, currentIndex, count)}
    <article class="crafting-card process-card">
      <div class="crafting-card-header">
        <strong>Machine Process</strong>
        <div class="recipe-badges">
          ${recipe.programNumber !== undefined ? `<span class="recipe-badge">Program ${recipe.programNumber}</span>` : ''}
          ${isChanged(app.selected) ? '<span class="recipe-badge">Edited</span>' : ''}
        </div>
      </div>
      <div class="process-stage">
        <section class="process-column">
          <span class="panel-label">Inputs</span>
          <div class="process-slot-list">
            ${inputs.map((entry, index) => processSlotMarkup(entry, 'itemInput', index)).join('')}
            ${fluids.map((entry, index) => processSlotMarkup(entry, 'fluidInput', index)).join('')}
            ${fuel.map((entry) => processSlotMarkup(entry, 'fuelInput', 0)).join('')}
            <div class="process-add-row">
              <button data-add-process="itemInput">+ Item</button>
              <button data-add-process="fluidInput">+ Fluid</button>
              ${recipe.fuelInput ? '' : '<button data-add-process="fuelInput">+ Fuel</button>'}
            </div>
          </div>
        </section>
        <div class="process-machine">
          <button id="process-machine-slot" aria-label="${escapeHtml(labelOf(recipe.machineId, 'machine'))}">
            ${imageMarkup(recipe.machineId, 'machine')}
          </button>
          <strong>${escapeHtml(labelOf(recipe.machineId, 'machine'))}</strong>
          <span>${(recipe.durationMs / 1000).toFixed(1)}s</span>
        </div>
        <section class="process-column">
          <span class="panel-label">Outputs</span>
          <div class="process-slot-list">
            ${outputs.map((entry, index) => processSlotMarkup(entry, 'output', index)).join('')}
            <div class="process-add-row">
              <button data-add-process="output">+ Output</button>
            </div>
          </div>
        </section>
      </div>
      <div class="recipe-tools process-tools">
        <button data-transform="alternative">Clone alternative</button>
        <button data-transform="revert" class="danger-button">${app.originals.has(app.selected) ? 'Revert' : 'Delete draft'}</button>
      </div>
    </article>
    <div class="recipe-meta">
      <div class="meta-cell"><span class="panel-label">Recipe ID</span><strong>${escapeHtml(recipe.id)}</strong></div>
      <div class="meta-cell"><span class="panel-label">Machine</span><strong>${escapeHtml(labelOf(recipe.machineId, 'machine'))}</strong></div>
      <div class="meta-cell"><span class="panel-label">Energy</span><strong>${recipe.euCost ? `${recipe.euCost} EU` : recipe.steamCostLitres ? `${recipe.steamCostLitres}L steam` : 'None'}</strong></div>
      <div class="meta-cell"><span class="panel-label">Program</span><strong>${recipe.programNumber ?? 'Auto'}</strong></div>
    </div>
    <div class="recipe-validation ${issues.length ? 'invalid' : ''}">
      ${issues.length ? issues.map(escapeHtml).join(' ') : 'Machine process is structurally valid and ready to export.'}
    </div>
  `
}

function renderEditor() {
  const recipe = currentRecipe()
  if (!recipe) {
    $('recipe-editor').innerHTML = '<div class="empty-state">Choose a recipe from the catalogue.</div>'
    return
  }
  const recipes = filteredRecipes()
  const currentIndex = recipes.findIndex((entry) => keyOf(entry) === app.selected)
  $('recipe-editor').innerHTML = recipe.kind === 'process'
    ? renderProcessEditor(recipe, currentIndex, recipes.length)
    : renderCraftEditor(recipe, currentIndex, recipes.length)
  wireCommonEditor()
  if (recipe.kind === 'process') wireProcessEditor()
  else wireCraftEditor()
}

function wireCommonEditor() {
  $('previous-recipe').addEventListener('click', () => navigate(-1))
  $('next-recipe').addEventListener('click', () => navigate(1))
  $('approve-recipe').addEventListener('click', () => setReview('approved'))
  $('flag-recipe').addEventListener('click', () => setReview('flagged'))
  $('recipe-editor').querySelectorAll('[data-transform]').forEach((button) => {
    button.addEventListener('click', () => transformRecipe(button.dataset.transform))
  })
}

function wireCraftEditor() {
  $('recipe-editor').querySelectorAll('[data-grid-slot]').forEach((slot) => {
    slot.addEventListener('click', () => openPicker({
      type: 'grid',
      index: Number(slot.dataset.gridSlot),
      allowResources: true,
      allowMachines: true,
      allowFamilies: true,
      allowClear: true,
    }))
  })
  $('output-slot').addEventListener('click', () => openPicker({
    type: 'craftOutput',
    allowResources: true,
    allowMachines: true,
    allowFluids: true,
  }))
  $('output-minus').addEventListener('click', () => setCraftOutputAmount((primaryOutput(currentRecipe())?.amount || 1) - 1))
  $('output-plus').addEventListener('click', () => setCraftOutputAmount((primaryOutput(currentRecipe())?.amount || 1) + 1))
  $('output-amount').addEventListener('change', (event) => setCraftOutputAmount(event.target.value))
  wireAmountControls()
}

function wireProcessEditor() {
  $('process-machine-slot').addEventListener('click', () => openPicker({
    type: 'processMachine',
    allowMachines: true,
  }))
  $('recipe-editor').querySelectorAll('[data-process-entry]').forEach((slot) => {
    const [type, indexText] = slot.dataset.processEntry.split(':')
    const kindOptions = type === 'fluidInput'
      ? { allowFluids: true }
      : type === 'output'
        ? { allowResources: true, allowMachines: true, allowFluids: true }
        : { allowResources: true }
    slot.addEventListener('click', () => openPicker({
      type,
      index: Number(indexText),
      allowClear: true,
      ...kindOptions,
    }))
  })
  $('recipe-editor').querySelectorAll('[data-add-process]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.addProcess
      const index = type === 'itemInput'
        ? processItemInputs(currentRecipe()).length
        : type === 'fluidInput'
          ? processFluidInputs(currentRecipe()).length
          : type === 'output'
            ? outputEntries(currentRecipe()).length
            : 0
      openPicker({
        type,
        index,
        allowResources: type !== 'fluidInput',
        allowMachines: type === 'output',
        allowFluids: type === 'fluidInput' || type === 'output',
      })
    })
  })
  wireAmountControls()
}

function wireAmountControls() {
  $('recipe-editor').querySelectorAll('[data-process-amount]').forEach((input) => {
    input.addEventListener('change', () => {
      const [type, index] = input.dataset.processAmount.split(':')
      if (type === 'machineInput') setMachineComponentAmount(Number(index), input.value)
      else setProcessAmount(type, Number(index), input.value)
    })
  })
  $('recipe-editor').querySelectorAll('[data-amount-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const [type, indexText, stepText] = button.dataset.amountStep.split(':')
      const index = Number(indexText)
      const step = Number(stepText)
      if (type === 'machineInput') {
        const amount = currentRecipe().machineInputs?.[index]?.amount || 1
        setMachineComponentAmount(index, amount + step)
      } else {
        const amount = type === 'itemInput'
          ? processItemInputs(currentRecipe())[index]?.amount
          : type === 'fluidInput'
            ? processFluidInputs(currentRecipe())[index]?.amount
            : type === 'fuelInput'
              ? currentRecipe().fuelInput?.amount
              : outputEntries(currentRecipe())[index]?.amount
        setProcessAmount(type, index, (amount || 1) + step)
      }
    })
  })
}

function setReview(status) {
  const current = reviewState(app.selected)
  app.reviews.set(app.selected, current === status ? 'unreviewed' : status)
  persist()
  if (status === 'approved' && current !== status) navigate(1)
  else render()
}

function navigate(direction) {
  const recipes = filteredRecipes()
  if (!recipes.length) return
  const index = recipes.findIndex((recipe) => keyOf(recipe) === app.selected)
  const nextIndex = Math.min(recipes.length - 1, Math.max(0, index + direction))
  app.selected = keyOf(recipes[nextIndex])
  render()
  scrollSelectedRecipeIntoView()
}

function uniqueAlternativeId(recipe) {
  const prefix = `${recipe.id}_alternative`
  const ids = new Set([
    ...app.data.recipes.map((entry) => entry.id),
    ...app.data.processRecipes.map((entry) => entry.id),
    ...[...app.drafts.values()].map((entry) => entry.id),
  ])
  let index = 1
  while (ids.has(`${prefix}_${index}`)) index += 1
  return `${prefix}_${index}`
}

function cloneAlternative() {
  const recipe = clone(currentRecipe())
  recipe.id = uniqueAlternativeId(recipe)
  recipe.name = `${recipe.name} Alternative`
  writeDraft(recipe)
  notify('Alternative recipe created')
}

function transformRecipe(action) {
  if (action === 'alternative') {
    cloneAlternative()
    return
  }
  if (action === 'revert') {
    if (app.originals.has(app.selected)) {
      app.drafts.delete(app.selected)
      persist()
      render()
      notify('Recipe restored')
    } else {
      app.drafts.delete(app.selected)
      app.reviews.delete(app.selected)
      const fallback = allRecipes()[0]
      app.selected = fallback ? keyOf(fallback) : null
      persist()
      render()
      notify('Draft recipe removed')
    }
    return
  }

  const recipe = clone(currentRecipe())
  if (recipe.kind !== 'crafting') return
  if (action === 'mode') {
    if (recipe.pattern) {
      const reusable = reusableIds(recipe)
      const resourceCounts = new Map()
      const machineCounts = new Map()
      recipe.pattern.filter(Boolean).forEach((entry) => {
        if (typeof entry === 'string') {
          if (!reusable.has(entry)) resourceCounts.set(entry, (resourceCounts.get(entry) || 0) + 1)
        } else {
          machineCounts.set(entry.id, (machineCounts.get(entry.id) || 0) + 1)
        }
      })
      recipe.inputs = [...resourceCounts].map(([id, amount]) => ({ id, amount }))
      recipe.machineInputs = [...machineCounts].map(([id, amount]) => ({ id, amount }))
      if (!recipe.machineInputs.length) delete recipe.machineInputs
      delete recipe.pattern
    } else {
      const expanded = []
      recipe.inputs.forEach((entry) => {
        for (let count = 0; count < entry.amount && expanded.length < 9; count += 1) expanded.push(entry.id)
      })
      ;(recipe.machineInputs || []).forEach((entry) => {
        for (let count = 0; count < entry.amount && expanded.length < 9; count += 1) {
          expanded.push({ kind: 'machine', id: entry.id })
        }
      })
      recipe.pattern = Array.from({ length: 9 }, (_, index) => expanded[index] || null)
      syncInputsFromPattern(recipe)
    }
  } else if (action === 'clear') {
    if (recipe.pattern) recipe.pattern = Array(9).fill(null)
    recipe.inputs = []
    delete recipe.machineInputs
    delete recipe.catalysts
    delete recipe.durabilityCosts
  } else {
    if (!recipe.pattern) {
      notify('Make this recipe shaped to move its slots')
      return
    }
    const pattern = Array.from({ length: 9 }, (_, index) => recipe.pattern[index] || null)
    if (action === 'mirror') {
      recipe.pattern = [pattern[2], pattern[1], pattern[0], pattern[5], pattern[4], pattern[3], pattern[8], pattern[7], pattern[6]]
    }
    if (action === 'rotate') {
      recipe.pattern = [pattern[6], pattern[3], pattern[0], pattern[7], pattern[4], pattern[1], pattern[8], pattern[5], pattern[2]]
    }
    if (action === 'compact') {
      const occupied = pattern.map((id, index) => id ? { id, row: Math.floor(index / 3), column: index % 3 } : null).filter(Boolean)
      if (occupied.length) {
        const minRow = Math.min(...occupied.map((slot) => slot.row))
        const minColumn = Math.min(...occupied.map((slot) => slot.column))
        recipe.pattern = Array(9).fill(null)
        occupied.forEach((slot) => {
          recipe.pattern[(slot.row - minRow) * 3 + (slot.column - minColumn)] = slot.id
        })
      }
    }
    syncInputsFromPattern(recipe)
  }
  writeDraft(recipe)
}

function openPicker(options) {
  app.picker = options
  $('picker-search').value = ''
  const labels = {
    grid: `Crafting slot ${options.index + 1}`,
    craftOutput: 'Recipe output',
    machineInput: 'Machine component',
    processMachine: 'Processing machine',
    itemInput: 'Item input',
    fluidInput: 'Fluid input',
    fuelInput: 'Fuel input',
    output: 'Process output',
  }
  $('picker-eyebrow').textContent = labels[options.type] || 'Recipe slot'
  $('picker-title').textContent = options.allowFamilies ? 'Choose ingredient or tool family' : 'Choose entry'
  $('picker-clear').style.display = options.allowClear ? '' : 'none'
  renderPickerItems()
  $('item-picker').showModal()
  setTimeout(() => $('picker-search').focus(), 50)
}

function pickerEntries() {
  const entries = []
  if (app.picker?.allowFamilies) {
    entries.push(...app.data.toolFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      kind: 'resource',
      reusable: true,
      family,
    })))
  }
  if (app.picker?.allowResources) entries.push(...app.data.resources.map((entry) => ({ ...entry, kind: 'resource' })))
  if (app.picker?.allowMachines) entries.push(...app.data.machines.map((entry) => ({ ...entry, kind: 'machine' })))
  if (app.picker?.allowFluids) entries.push(...app.data.fluids.map((entry) => ({ ...entry, kind: 'fluid' })))
  return entries
}

function renderPickerItems() {
  const query = $('picker-search').value.trim().toLowerCase()
  const entries = pickerEntries().filter((entry) => !query || `${entry.id} ${entry.label}`.toLowerCase().includes(query))
  $('picker-items').innerHTML = entries.map((entry) => `
    <button class="picker-item ${entry.reusable ? 'family' : ''}" data-picker-id="${entry.id}" data-picker-kind="${entry.kind}" data-picker-reusable="${entry.reusable ? 'true' : 'false'}" title="${escapeHtml(entry.label)}">
      ${imageMarkup(entry.id, entry.kind)}
      ${entry.reusable ? '<span class="picker-family-mark">∞</span>' : ''}
      <span>${escapeHtml(entry.label)}</span>
    </button>
  `).join('')
  $('picker-items').querySelectorAll('[data-picker-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.pickerId
      const kind = button.dataset.pickerKind
      const reusable = button.dataset.pickerReusable === 'true'
      if (app.picker.type === 'grid') setGridSlot(app.picker.index, id, kind, reusable)
      else if (app.picker.type === 'craftOutput') setCraftOutput(id, kind)
      else if (app.picker.type === 'machineInput') setMachineComponent(app.picker.index, id)
      else if (app.picker.type === 'processMachine') setProcessEntry('machine', 0, id, kind)
      else setProcessEntry(app.picker.type, app.picker.index, id, kind)
      $('item-picker').close()
    })
  })
}

function clearPickerEntry() {
  if (app.picker.type === 'grid') setGridSlot(app.picker.index, null)
  else if (app.picker.type === 'machineInput') setMachineComponent(app.picker.index, null)
  else setProcessEntry(app.picker.type, app.picker.index, null)
  $('item-picker').close()
}

function scrollSelectedRecipeIntoView() {
  requestAnimationFrame(() => {
    document.querySelector('.recipe-row.active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  })
}

function reviewPatch() {
  const changes = [...app.drafts.entries()]
    .filter(([key]) => isChanged(key))
    .map(([key, after]) => ({
      key,
      operation: app.originals.has(key) ? 'update' : 'add',
      kind: after.kind,
      id: after.id,
      before: app.originals.get(key) || null,
      after,
      issues: validateRecipe(after),
    }))
  const reviews = [...app.reviews.entries()]
    .filter(([, status]) => status !== 'unreviewed')
    .map(([key, status]) => ({ key, id: key.split(':').slice(1).join(':'), status }))
  return {
    schemaVersion: 4,
    type: 'click-foundry-recipe-review',
    exportedAt: new Date().toISOString(),
    sourceGeneratedAt: app.data.generatedAt,
    changes,
    reviews,
  }
}

function exportPatch() {
  const patch = reviewPatch()
  const blob = new Blob([`${JSON.stringify(patch, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `click-foundry-recipe-review-${new Date().toISOString().slice(0, 10)}.json`,
  })
  link.click()
  URL.revokeObjectURL(url)
  notify(`${patch.changes.length} edits exported`)
}

async function copyPatch() {
  const text = JSON.stringify(reviewPatch(), null, 2)
  try {
    await navigator.clipboard.writeText(text)
    notify('Review patch copied')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    notify(copied ? 'Review patch copied' : 'Use Export to save this review')
  }
}

async function importPatch(file) {
  const payload = JSON.parse(await file.text())
  if (!['click-foundry-recipe-review', 'click-foundry-recipe-patch'].includes(payload.type)) {
    throw new Error('This is not a Click Foundry recipe review file.')
  }
  for (const change of payload.changes || []) {
    const key = change.key || `${change.kind || 'crafting'}:${change.id}`
    if (change.after) app.drafts.set(key, change.after)
  }
  for (const review of payload.reviews || []) {
    const key = review.key || `${review.kind || 'crafting'}:${review.id}`
    app.reviews.set(key, review.status)
  }
  persist()
  render()
  notify('Review file imported')
}

function render() {
  renderRecipeList()
  renderEditor()
}

function loadStoredReview() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    Object.entries(stored.drafts || {}).forEach(([key, recipe]) => {
      if (recipe?.kind && recipe?.id) app.drafts.set(key, recipe)
    })
    Object.entries(stored.reviews || {}).forEach(([key, status]) => {
      if (['approved', 'flagged', 'unreviewed'].includes(status)) app.reviews.set(key, status)
    })
  } catch {
    localStorage.removeItem(storageKey)
  }
}

function selectFirstVisible() {
  const recipes = filteredRecipes()
  if (!recipes.length) {
    app.selected = null
    return
  }
  if (!recipes.some((recipe) => keyOf(recipe) === app.selected)) app.selected = keyOf(recipes[0])
}

$('search').addEventListener('input', () => {
  selectFirstVisible()
  render()
})

$('review-filter').querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    app.filter = button.dataset.filter
    $('review-filter').querySelectorAll('[data-filter]').forEach((entry) => entry.classList.toggle('active', entry === button))
    selectFirstVisible()
    render()
  })
})

$('kind-filter').querySelectorAll('[data-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    app.kind = button.dataset.kind
    $('kind-filter').querySelectorAll('[data-kind]').forEach((entry) => entry.classList.toggle('active', entry === button))
    $('search').value = ''
    app.selected = null
    selectFirstVisible()
    render()
  })
})

$('export-button').addEventListener('click', exportPatch)
$('copy-button').addEventListener('click', copyPatch)
$('import-button').addEventListener('click', () => $('import-file').click())
$('import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    await importPatch(file)
  } catch (error) {
    alert(error.message)
  } finally {
    event.target.value = ''
  }
})
$('picker-close').addEventListener('click', () => $('item-picker').close())
$('picker-search').addEventListener('input', renderPickerItems)
$('picker-clear').addEventListener('click', clearPickerEntry)

fetch('./recipes.json', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  })
  .then((data) => {
    app.data = data
    data.recipes.forEach((recipe) => app.originals.set(keyOf(recipe), recipe))
    data.processRecipes.forEach((recipe) => app.originals.set(keyOf(recipe), recipe))
    loadStoredReview()
    selectFirstVisible()
    render()
  })
  .catch((error) => {
    $('catalogue-status').textContent = `Could not load catalogue: ${error.message}`
    $('recipe-editor').innerHTML = '<div class="empty-state">Run npm run recipes:review, then serve the project with npm run dev.</div>'
  })
