import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const cssPath = path.join(root, 'src/App.css')
const source = readFileSync(cssPath, 'utf8')

function matchingBrace(text, openingIndex) {
  let depth = 0
  let quote = ''
  let comment = false
  for (let index = openingIndex; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (comment) {
      if (char === '*' && next === '/') {
        comment = false
        index += 1
      }
      continue
    }
    if (!quote && char === '/' && next === '*') {
      comment = true
      index += 1
      continue
    }
    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}' && --depth === 0) return index
  }
  throw new Error(`Unmatched CSS block at ${openingIndex}`)
}

function isLegacyPixelSelector(selector) {
  const selectors = selector.split(',').map((part) => part.trim()).filter(Boolean)
  return selectors.length > 0 && selectors.every((part) => /\.pixel-(?!icon\b|grid\b)[A-Za-z0-9_-]+/.test(part))
}

function pruneBlock(text) {
  let result = ''
  let cursor = 0
  while (cursor < text.length) {
    const opening = text.indexOf('{', cursor)
    if (opening < 0) return result + text.slice(cursor)
    const closing = matchingBrace(text, opening)
    const preludeStart = Math.max(text.lastIndexOf('}', opening - 1), text.lastIndexOf(';', opening - 1)) + 1
    result += text.slice(cursor, preludeStart)
    const prelude = text.slice(preludeStart, opening)
    const body = text.slice(opening + 1, closing)
    if (prelude.trim().startsWith('@')) {
      result += `${prelude}{${pruneBlock(body)}}`
    } else if (!isLegacyPixelSelector(prelude)) {
      result += `${prelude}{${body}}`
    }
    cursor = closing + 1
  }
  return result
}

const pruned = pruneBlock(source)
  .replace(/\n{4,}/g, '\n\n\n')
  .trimEnd() + '\n'

writeFileSync(cssPath, pruned)
console.log(`Removed ${source.length - pruned.length} bytes of legacy item CSS art.`)
