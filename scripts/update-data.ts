import AdmZip from 'adm-zip'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

type GitHubRelease = {
  html_url: string
  tag_name: string
  published_at: string
  assets: Array<{
    browser_download_url: string
    name: string
    size: number
  }>
}

type GitHubTree = {
  tree: Array<{
    path: string
    type: 'blob' | 'tree'
    size?: number
    url: string
  }>
  truncated: boolean
}

type CurseFile = {
  id: number
  dateCreated: string
  displayName: string
  fileName: string
  fileLength: number
  gameVersions: string[]
  projectId: number
}

type SourceFile = {
  path: string
  bytes: number
  kind: string
}

type PackCatalog = {
  id: string
  name: string
  gameType: string
  minecraft: string
  loader: string
  latestVersion: string
  publishedAt: string
  sourceUrl: string
  sourceKind: string
  notes: string[]
  indexedFiles: SourceFile[]
  recipeSignalCount: number
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = join(rootDir, 'src', 'data', 'catalog.json')

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'GregCompanion-data-updater',
}

async function getJson<T>(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while fetching ${url}`)
  }

  return (await response.json()) as T
}

async function getBuffer(url: string) {
  const response = await fetch(url, { headers: { 'User-Agent': 'GregCompanion-data-updater' } })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} while downloading ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

function fileKind(path: string) {
  if (path.includes('/kubejs/server_scripts/')) return 'kubejs-server-script'
  if (path.endsWith('.zs')) return 'crafttweaker-script'
  if (path.endsWith('.recipe')) return 'ae2-recipe'
  if (path.endsWith('.java')) return 'mod-source-recipe-loader'
  if (path.endsWith('.yaml') || path.endsWith('.toml') || path.endsWith('.cfg')) return 'config'
  if (path.endsWith('.json') || path.endsWith('.json5') || path.endsWith('.jsonc')) return 'json-data'
  return 'source'
}

function isLikelyRecipeSource(path: string) {
  return /(^|\/)(kubejs\/server_scripts|scripts|recipes|GregTech)|recipe|Recipe|gtceu/i.test(path)
}

function recipeSignalCount(text: string) {
  const signals = [
    /\.recipes?\(/g,
    /event\.recipes\./g,
    /GTValues\.RA\./g,
    /RecipeBuilder/g,
    /addRecipe/g,
    /assembler|chemical|mixer|centrifuge|electrolyzer|distillation/gi,
  ]

  return signals.reduce((sum, pattern) => sum + [...text.matchAll(pattern)].length, 0)
}

async function githubTree(owner: string, repo: string, ref = 'master') {
  return getJson<GitHubTree>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`,
    githubHeaders,
  )
}

async function githubLatest(owner: string, repo: string) {
  return getJson<GitHubRelease>(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, githubHeaders)
}

async function buildGtnhCatalog(): Promise<PackCatalog> {
  const [packRelease, gtRelease, packTree, gtTree] = await Promise.all([
    githubLatest('GTNewHorizons', 'GT-New-Horizons-Modpack'),
    githubLatest('GTNewHorizons', 'GT5-Unofficial'),
    githubTree('GTNewHorizons', 'GT-New-Horizons-Modpack'),
    githubTree('GTNewHorizons', 'GT5-Unofficial'),
  ])

  const packFiles = packTree.tree.filter((entry) => entry.type === 'blob' && isLikelyRecipeSource(entry.path))
  const gtFiles = gtTree.tree.filter(
    (entry) =>
      entry.type === 'blob' &&
      /src\/main\/java\/.*(recipe|Recipe|loader|Loader)|docs\/RecipeBuilder\.md/.test(entry.path),
  )

  return {
    id: 'gtnh',
    name: 'GT New Horizons',
    gameType: 'Expert GregTech modpack',
    minecraft: '1.7.10',
    loader: 'Forge',
    latestVersion: packRelease.tag_name,
    publishedAt: packRelease.published_at,
    sourceUrl: packRelease.html_url,
    sourceKind: 'github-release-and-source-tree',
    notes: [
      `GT5-Unofficial latest recipe-code source: ${gtRelease.tag_name}`,
      'GTNH recipes are split across the pack repo, GT5-Unofficial, and GTNH addon mods.',
      'This pass indexes candidate source files; exact Java recipe normalization should be added per recipe builder family.',
    ],
    indexedFiles: [
      ...packFiles.map((entry) => ({
        path: `GT-New-Horizons-Modpack/${entry.path}`,
        bytes: entry.size ?? 0,
        kind: fileKind(entry.path),
      })),
      ...gtFiles.map((entry) => ({
        path: `GT5-Unofficial/${entry.path}`,
        bytes: entry.size ?? 0,
        kind: fileKind(entry.path),
      })),
    ].slice(0, 500),
    recipeSignalCount: packFiles.length + gtFiles.length,
  }
}

function curseForgeDownloadUrl(file: CurseFile) {
  const folder = Math.floor(file.id / 1000)
  const part = file.id % 1000
  return `https://edge.forgecdn.net/files/${folder}/${part}/${encodeURIComponent(file.fileName)}`
}

async function buildSkyGregCatalog(): Promise<PackCatalog> {
  const filesResponse = await getJson<{ data: CurseFile[] }>(
    'https://www.curseforge.com/api/v1/mods/952034/files?pageSize=1',
  )
  const latest = filesResponse.data[0]
  const zip = new AdmZip(await getBuffer(curseForgeDownloadUrl(latest)))
  const entries = zip.getEntries()

  const sourceEntries = entries.filter((entry) => !entry.isDirectory && isLikelyRecipeSource(entry.entryName))
  const recipeSignals = sourceEntries.reduce((sum, entry) => {
    if (!/\.(js|json|json5|jsonc|yaml|toml)$/i.test(entry.entryName)) return sum
    const text = entry.getData().toString('utf8')
    return sum + recipeSignalCount(text)
  }, 0)

  return {
    id: 'sky-greg',
    name: 'Sky Greg',
    gameType: 'Skyblock GregTech CEu Modern modpack',
    minecraft: latest.gameVersions.find((version) => /^\d+\.\d+/.test(version)) ?? '1.20.1',
    loader: latest.gameVersions.find((version) => version === 'Forge') ?? 'Forge',
    latestVersion: latest.displayName.replace(/\.zip$/i, ''),
    publishedAt: latest.dateCreated,
    sourceUrl: `https://www.curseforge.com/minecraft/modpacks/sky-greg/files/${latest.id}`,
    sourceKind: 'curseforge-release-zip',
    notes: [
      'CurseForge HTML is protected by a browser challenge, so this updater uses the public JSON file endpoint and CDN zip.',
      'Sky Greg recipes and custom machines are mainly in KubeJS plus GTCEu config.',
      'This pass indexes KubeJS/config candidates and counts recipe-like statements for future parser work.',
    ],
    indexedFiles: sourceEntries
      .map((entry) => ({
        path: entry.entryName,
        bytes: entry.header.size,
        kind: fileKind(entry.entryName),
      }))
      .slice(0, 500),
    recipeSignalCount: recipeSignals,
  }
}

async function main() {
  const generatedAt = new Date().toISOString()
  const packs = await Promise.all([buildGtnhCatalog(), buildSkyGregCatalog()])
  const catalog = {
    generatedAt,
    schemaVersion: 1,
    sources: [
      'https://api.github.com/repos/GTNewHorizons/GT-New-Horizons-Modpack/releases/latest',
      'https://api.github.com/repos/GTNewHorizons/GT5-Unofficial/releases/latest',
      'https://www.curseforge.com/api/v1/mods/952034/files?pageSize=1',
    ],
    packs,
  }

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`Updated ${outputPath}`)
  for (const pack of packs) {
    console.log(`${pack.name}: ${pack.latestVersion}, ${pack.indexedFiles.length} files, ${pack.recipeSignalCount} signals`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
