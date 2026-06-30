import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const savesDir = path.join(rootDir, 'server', 'saves')

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
      if (body.length > 3_000_000) {
        reject(new Error('Save is too large.'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function normalizeSaveId(id: string) {
  return id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32)
}

function savePath(id: string) {
  return path.join(savesDir, `${id}.json`)
}

function isGameSave(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { resources?: unknown; machines?: unknown; completedQuests?: unknown }
    return Boolean(parsed && typeof parsed === 'object' && (parsed.resources || parsed.machines || parsed.completedQuests))
  } catch {
    return false
  }
}

function localSaveApi(): Plugin {
  return {
    name: 'local-save-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://local')
        if (!url.pathname.startsWith('/api/saves')) {
          next()
          return
        }

        try {
          await mkdir(savesDir, { recursive: true })

          if (req.method === 'GET' && url.pathname === '/api/saves') {
            const files = await readdir(savesDir)
            const saves = await Promise.all(
              files
                .filter((file) => file.endsWith('.json'))
                .map(async (file) => {
                  const id = path.basename(file, '.json')
                  const info = await stat(savePath(id))
                  return { id, updatedAt: info.mtime.toISOString(), size: info.size }
                }),
            )

            sendJson(res, 200, { saves: saves.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) })
            return
          }

          const match = url.pathname.match(/^\/api\/saves\/([^/]+)$/)
          const requestedId = match ? normalizeSaveId(decodeURIComponent(match[1])) : ''
          if (!requestedId) {
            sendJson(res, 400, { error: 'Use a save slot name with letters, numbers, dashes, or underscores.' })
            return
          }

          if (req.method === 'GET') {
            const save = await readFile(savePath(requestedId), 'utf8')
            sendJson(res, 200, { id: requestedId, save })
            return
          }

          if (req.method === 'PUT') {
            const body = JSON.parse(await readBody(req)) as { save?: unknown }
            if (typeof body.save !== 'string' || !isGameSave(body.save)) {
              sendJson(res, 400, { error: 'That does not look like a Block-Tech Idle save.' })
              return
            }

            await writeFile(savePath(requestedId), body.save, 'utf8')
            const info = await stat(savePath(requestedId))
            sendJson(res, 200, { id: requestedId, updatedAt: info.mtime.toISOString(), size: info.size })
            return
          }

          sendJson(res, 405, { error: 'Method not allowed.' })
        } catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            sendJson(res, 404, { error: 'No PC save exists for that slot yet.' })
            return
          }
          const message = error instanceof Error ? error.message : 'Save server error.'
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/GregCompanion/' : '/',
  plugins: [react(), localSaveApi()],
})
