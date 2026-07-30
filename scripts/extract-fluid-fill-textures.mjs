import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const sourceDir = path.join(root, 'public/game-icons/fluids')
const outputDir = path.join(root, 'public/game-icons/fluid-textures')

await mkdir(outputDir, { recursive: true })

const files = (await readdir(sourceDir)).filter((file) => file.endsWith('.png'))
await Promise.all(files.map(async (file) => {
  await sharp(path.join(sourceDir, file))
    .extract({ left: 22, top: 22, width: 84, height: 84 })
    .resize(128, 128, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(outputDir, file))
}))

console.log(`Extracted ${files.length} frame-free fluid textures.`)
