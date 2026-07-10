import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const manifestPath = path.join(root, 'src/release-manifest.json')
const docsDir = path.join(root, 'docs/releases')
const publicDir = path.join(root, 'public/release-notes')
const logoPath = path.join(root, 'docs/releases/assets/click-foundry-logo-512.png')

function parseOptions() {
  const options = { notes: [] }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === '--revision' && next) {
      options.revision = next
      index += 1
    } else if (arg === '--title' && next) {
      options.title = next
      index += 1
    } else if (arg === '--note' && next) {
      options.notes.push(next)
      index += 1
    } else if (arg === '--notes' && next) {
      options.notes.push(...next.split('|').map((note) => note.trim()).filter(Boolean))
      index += 1
    } else if (arg === '--date' && next) {
      options.date = next
      index += 1
    } else {
      throw new Error(`Unknown or incomplete option: ${arg}`)
    }
  }
  return options
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function chromePath() {
  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'),
      ]
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null
}

function htmlFor(manifest, pdfName) {
  const notes = manifest.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('\n')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Click Foundry r${escapeHtml(manifest.revision)} Patch Notes</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #2c2419; background: #c9bc95; font-family: Georgia, "Times New Roman", serif; font-size: 13px; line-height: 1.48; }
      .page { min-height: 100vh; padding: 24px; border: 5px solid #2f271c; outline: 2px solid #efe7c6; background: linear-gradient(90deg, rgba(255,255,255,.12), transparent 18%, transparent 82%, rgba(0,0,0,.08)), #c7b98e; }
      .hero { display: grid; grid-template-columns: 96px 1fr; gap: 18px; align-items: center; padding-bottom: 16px; border-bottom: 4px solid #4a3924; }
      .logo { width: 96px; height: 96px; image-rendering: pixelated; border: 3px solid #4a3924; background: #b4a57e; }
      .eyebrow { margin: 0 0 4px; color: #a95e25; font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      h1, h2 { margin: 0; font-family: Arial, sans-serif; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
      h1 { font-size: 28px; line-height: 1; }
      .subtitle { margin: 8px 0 0; max-width: 650px; font-size: 14px; font-weight: 700; }
      section { break-inside: avoid; margin-top: 16px; padding: 14px; border: 2px solid #6d6041; background: rgba(239,231,198,.45); }
      h2 { margin-bottom: 8px; color: #3b3123; font-size: 15px; }
      ul { margin: 0; padding-left: 20px; }
      li { margin: 7px 0; }
      .footer { margin-top: 18px; padding-top: 10px; border-top: 3px solid #4a3924; color: #55452f; font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <img class="logo" src="assets/click-foundry-logo-512.png" alt="Click Foundry logo">
        <div>
          <p class="eyebrow">Click Foundry release notes</p>
          <h1>r${escapeHtml(manifest.revision)} ${escapeHtml(manifest.title)}</h1>
          <p class="subtitle">Gameplay-facing changes for the public build. Share the PDF version as ${escapeHtml(pdfName)}.</p>
        </div>
      </header>
      <section>
        <h2>Patch Notes</h2>
        <ul>
          ${notes}
        </ul>
      </section>
      <footer class="footer">Click Foundry r${escapeHtml(manifest.revision)} - ${escapeHtml(manifest.date)} - Public GitHub Pages build</footer>
    </main>
  </body>
</html>
`
}

const options = parseOptions()
const current = JSON.parse(readFileSync(manifestPath, 'utf8'))
const manifest = {
  revision: options.revision ?? current.revision,
  date: options.date ?? new Date().toISOString().slice(0, 10),
  title: options.title ?? current.title,
  notes: options.notes.length > 0 ? options.notes : current.notes,
}
const slug = `r${manifest.revision}-${slugify(manifest.title)}`
const htmlName = `${slug}.html`
const pdfName = `Click-Foundry-r${manifest.revision}-${slugify(manifest.title)}-Patch-Notes.pdf`
const publicPdfName = `click-foundry-r${manifest.revision}-patch-notes.pdf`

mkdirSync(docsDir, { recursive: true })
mkdirSync(publicDir, { recursive: true })
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(path.join(docsDir, htmlName), htmlFor(manifest, publicPdfName))

const browser = chromePath()
if (browser && existsSync(logoPath)) {
  const pdfPath = path.join(docsDir, pdfName)
  const result = spawnSync(browser, [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(path.join(docsDir, htmlName)).href,
  ], { stdio: 'inherit' })
  if (result.status === 0 && existsSync(pdfPath)) {
    copyFileSync(pdfPath, path.join(publicDir, publicPdfName))
  } else {
    console.warn('PDF generation failed; HTML and manifest were still written.')
  }
} else {
  console.warn('Chrome/Edge or release logo was not found; HTML and manifest were written without PDF output.')
}

console.log(`Generated release notes for r${manifest.revision}: ${manifest.title}`)
