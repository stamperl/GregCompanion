import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const dist = path.join(root, 'dist')
const html = readFileSync(path.join(dist, 'index.html'), 'utf8')
const mainJs = html.match(/src="[^"]*\/assets\/(index-[^"]+\.js)"/)?.[1]
const mainCss = html.match(/href="[^"]*\/assets\/(index-[^"]+\.css)"/)?.[1]
if (!mainJs || !mainCss) throw new Error('Could not locate the main JS and CSS assets in dist/index.html.')

const metrics = {
  mainJsBytes: statSync(path.join(dist, 'assets', mainJs)).size,
  mainCssBytes: statSync(path.join(dist, 'assets', mainCss)).size,
  lazyChunks: readdirSync(path.join(dist, 'assets')).filter((file) => file.endsWith('.js') && file !== mainJs),
}
const limits = { mainJsBytes: 500 * 1024, mainCssBytes: 300 * 1024 }
console.log(JSON.stringify({ metrics, limits }, null, 2))

const failures = Object.entries(limits)
  .filter(([key, limit]) => metrics[key] > limit)
  .map(([key, limit]) => `${key} is ${metrics[key]} bytes; limit is ${limit}.`)
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
