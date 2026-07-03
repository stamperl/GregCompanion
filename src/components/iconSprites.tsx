import type { ResourceId } from '../game/types'

// Pixel-art sprite definitions on a 12x12 grid. Each row string is one pixel
// row; '.' is transparent and any other character looks up a palette fill.
type SpriteDef = {
  palette: Record<string, string>
  rows: string[]
}

const wood = { O: '#3a2313', d: '#6f4526', b: '#b98a4a', h: '#dfb872' }
const stonePal = { O: '#2b2b2b', d: '#6e6e6e', b: '#9c9c9c', h: '#c9c9c9' }
const coalPal = { O: '#111111', d: '#23262a', b: '#33373d', h: '#5c636b', w: '#9aa3ad' }
const ironPal = { O: '#3f474b', d: '#8f9aa0', b: '#c3cbd1', h: '#e9edf0' }
const copperPal = { O: '#4c2c15', d: '#8a4d1f', b: '#c47433', h: '#e8a06a' }
const tinPal = { O: '#4f585e', d: '#97a4a6', b: '#ccd6d8', h: '#eef2f2' }

const ingotRows = [
  '............',
  '............',
  '..OOOOOOOO..',
  '.OhhhhhhhdO.',
  'OhhbbbbbbdO.',
  'ObbbbbbbddO.',
  'ObbbbbbdddO.',
  '.OOOOOOOOO..',
  '............',
  '............',
  '............',
  '............',
]

function oreRows(nuggetLine1: string, nuggetLine2: string) {
  return [
    'OOOOOOOOOOOO',
    'ObbbhbbbbdbO',
    'ObhbbbdbbbbO',
    nuggetLine1,
    'ObbdbbbbhbbO',
    'ObbbbhbbbbdO',
    nuggetLine2,
    'ObhbbbbdbbbO',
    'ObbbdbbbbhbO',
    'ObbbbbhbbbbO',
    'OdbbhbbbbdbO',
    'OOOOOOOOOOOO',
  ]
}

export const iconSprites: Partial<Record<ResourceId, SpriteDef>> = {
  log: {
    palette: wood,
    rows: [
      '..OOOOOOOO..',
      '.OddddddddO.',
      'OdbbbbbbbbdO',
      'OdbhhhhhhbdO',
      'OdbhddddhbdO',
      'OdbhdbbdhbdO',
      'OdbhdbbdhbdO',
      'OdbhddddhbdO',
      'OdbhhhhhhbdO',
      'OdbbbbbbbbdO',
      '.OddddddddO.',
      '..OOOOOOOO..',
    ],
  },
  plank: {
    palette: wood,
    rows: [
      'OOOOOOOOOOOO',
      'ObbbbbdbbbbO',
      'OhbhhhdhhbhO',
      'OddddddddddO',
      'ObdbbbbbbbbO',
      'OhhhdhhhhbhO',
      'OddddddddddO',
      'ObbbbbbdbbbO',
      'OhbhhhhdhhhO',
      'OddddddddddO',
      'ObbbbdbbbbdO',
      'OOOOOOOOOOOO',
    ],
  },
  stick: {
    palette: wood,
    rows: [
      '.........OO.',
      '........ObbO',
      '.......ObhbO',
      '......ObhbO.',
      '.....ObhbO..',
      '....ObhbO...',
      '...ObhbO....',
      '..ObhbO.....',
      '.ObhbO......',
      'ObhbO.......',
      'ObbO........',
      '.OO.........',
    ],
  },
  stone: {
    palette: stonePal,
    rows: [
      '............',
      '...OOOOOO...',
      '..OhhhbbbO..',
      '.OhhbbbbbbO.',
      '.OhbbbbbbdO.',
      'OhbbbbbbbdO.',
      'ObbbbbbbddO.',
      'ObbbbbbdddO.',
      '.ObbbdddddO.',
      '..ObbdddddO.',
      '...OOOOOO...',
      '............',
    ],
  },
  cobblestone: {
    palette: stonePal,
    rows: [
      'OOOOOOOOOOOO',
      'OhbbOdbbbOhO',
      'ObbdObbhbObO',
      'ObbbOObbOObO',
      'OOObbOOObbOO',
      'ObObbbOhbbdO',
      'ObObhbObbbbO',
      'OOOObbOObbOO',
      'OhbOObbOOObO',
      'ObbbObhbObbO',
      'ObdbObbbOhbO',
      'OOOOOOOOOOOO',
    ],
  },
  flint: {
    palette: { O: '#101216', d: '#2c3138', b: '#3d434c', h: '#79828e' },
    rows: [
      '............',
      '....OOO.....',
      '...OhdbO....',
      '..OhddbbO...',
      '.OhdddbbbO..',
      '.OdddbbbbO..',
      '..ObbbbbbO..',
      '...ObbbbO...',
      '....ObbO....',
      '.....OO.....',
      '............',
      '............',
    ],
  },
  gravel: {
    palette: { O: '#3c3029', d: '#6a5c50', b: '#8d8175', h: '#b3a798' },
    rows: [
      'OOOOOOOOOOOO',
      'ObbhObbdObbO',
      'ObbbOhbbObdO',
      'OOOOObbbOOOO',
      'ObbdOOOOObhO',
      'OhbbObbhObbO',
      'ObbbObbbOObO',
      'OOOOOObbOObO',
      'ObbhOOOOOOOO',
      'ObbbObhbObdO',
      'OdbbObbbObbO',
      'OOOOOOOOOOOO',
    ],
  },
  coal: {
    palette: coalPal,
    rows: [
      '............',
      '...OOOOOO...',
      '..OhwhbbbO..',
      '.OhwhbbbbdO.',
      '.OhhbbbbbdO.',
      'ObbbbbbbbdO.',
      'ObbbbbbbddO.',
      'ObbbbbbdddO.',
      '.ObbbdddddO.',
      '..ObdddddO..',
      '...OOOOOO...',
      '............',
    ],
  },
  charcoal: {
    palette: { O: '#170f08', d: '#2e1d12', b: '#3d2c1b', h: '#63482a', w: '#e2762e' },
    rows: [
      '............',
      '...OOOOOO...',
      '..OhhbbbbO..',
      '.OhbbbbwbdO.',
      '.OhbbbwwbdO.',
      'ObbbbbbwbdO.',
      'ObbbbbbbddO.',
      'ObbbbbbdddO.',
      '.ObbbdddddO.',
      '..ObdddddO..',
      '...OOOOOO...',
      '............',
    ],
  },
  ironOre: {
    palette: { ...stonePal, n: '#d8dde0', m: '#9fa8ad' },
    rows: oreRows('ObbnnbbbbbbO', 'ObbbbbbnnbbO').map((row, index) => (index === 3 ? 'ObbnnbbbmbbO' : index === 6 ? 'ObmbbbbnnbbO' : row)),
  },
  copperOre: {
    palette: { ...stonePal, n: '#d4763a', m: '#8a4d1f' },
    rows: oreRows('ObbnnbbbbbbO', 'ObbbbbbnnbbO').map((row, index) => (index === 3 ? 'ObbnnbbbmbbO' : index === 6 ? 'ObmbbbbnnbbO' : row)),
  },
  tinOre: {
    palette: { ...stonePal, n: '#dfe7e9', m: '#97a4a6' },
    rows: oreRows('ObbnnbbbbbbO', 'ObbbbbbnnbbO').map((row, index) => (index === 3 ? 'ObbnnbbbmbbO' : index === 6 ? 'ObmbbbbnnbbO' : row)),
  },
  ironIngot: { palette: ironPal, rows: ingotRows },
  copperIngot: { palette: copperPal, rows: ingotRows },
  tinIngot: { palette: tinPal, rows: ingotRows },
  mortar: {
    palette: { O: '#2b2b2b', d: '#6e6e6e', b: '#9c9c9c', h: '#c9c9c9', w: '#8a6b3f', v: '#b98a4a' },
    rows: [
      '.......OO...',
      '......OvwO..',
      '.....OvwO...',
      '....OvwO....',
      'OOOOvwOOOOO.',
      'OhhhOOhhhhO.',
      '.OhbbbbbbO..',
      '.ObbbbbbbO..',
      '..ObbbbbO...',
      '...ObbbO....',
      '..OOOOOOO...',
      '............',
    ],
  },
}

function spriteRects(def: SpriteDef) {
  const rects: Array<{ x: number; y: number; width: number; fill: string }> = []
  def.rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const cell = row[x]
      if (cell === '.') {
        x += 1
        continue
      }
      let end = x
      while (end + 1 < row.length && row[end + 1] === cell) end += 1
      const fill = def.palette[cell]
      if (fill) rects.push({ x, y, width: end - x + 1, fill })
      x = end + 1
    }
  })
  return rects
}

export function hasIconSprite(id: ResourceId) {
  return id in iconSprites
}

export function IconSpriteDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {(Object.keys(iconSprites) as ResourceId[]).map((id) => {
          const def = iconSprites[id]
          if (!def) return null
          return (
            <symbol id={`sprite-${id}`} viewBox="0 0 12 12" key={id}>
              {spriteRects(def).map((rect, index) => (
                <rect x={rect.x} y={rect.y} width={rect.width} height={1} fill={rect.fill} key={index} />
              ))}
            </symbol>
          )
        })}
      </defs>
    </svg>
  )
}
