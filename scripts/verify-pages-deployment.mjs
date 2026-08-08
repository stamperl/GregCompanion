const deployUrl = process.env.PAGES_DEPLOY_URL ?? process.argv[2]
const expectedDevRevision = process.env.PAGES_EXPECTED_DEV_REVISION ?? process.argv[3]
const attempts = Number(process.env.PAGES_VERIFY_ATTEMPTS ?? 60)
const intervalMs = Number(process.env.PAGES_VERIFY_INTERVAL_MS ?? 10_000)

if (!deployUrl) throw new Error('Provide PAGES_DEPLOY_URL or a deployment URL argument.')

const baseUrl = new URL(deployUrl.endsWith('/') ? deployUrl : `${deployUrl}/`)

function cacheBusted(url) {
  const next = new URL(url)
  next.searchParams.set('verify', `${Date.now()}`)
  return next
}

async function fetchOk(url, label) {
  const response = await fetch(cacheBusted(url), { cache: 'no-store' })
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}: ${url}`)
  return response
}

async function verifyDeployment() {
  const pageResponse = await fetchOk(baseUrl, 'Page')
  const html = await pageResponse.text()
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1])
  const assets = [...new Set(assetPaths)]
  if (!assets.some((asset) => asset.endsWith('.js'))) throw new Error('Deployed page has no JavaScript entry asset.')
  if (!assets.some((asset) => asset.endsWith('.css'))) throw new Error('Deployed page has no stylesheet asset.')

  await Promise.all(assets.map((asset) => fetchOk(new URL(asset, baseUrl), `Asset ${asset}`)))

  if (expectedDevRevision) {
    const revisionResponse = await fetchOk(new URL('dev-revision.json', baseUrl), 'Dev revision')
    const manifest = await revisionResponse.json()
    if (String(manifest.revision) !== String(expectedDevRevision)) {
      throw new Error(`Expected dev revision ${expectedDevRevision}, received ${manifest.revision ?? 'missing'}.`)
    }
    if (!String(manifest.summary ?? '').trim()) {
      throw new Error('The deployed dev manifest has no release summary.')
    }
    if (!manifest.updatedAt || Number.isNaN(Date.parse(manifest.updatedAt))) {
      throw new Error('The deployed dev manifest has no valid publish timestamp.')
    }
  }

  console.log(`Verified ${baseUrl} with ${assets.length} loadable assets${expectedDevRevision ? ` at dev.${expectedDevRevision}` : ''}.`)
}

let lastError
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await verifyDeployment()
    process.exit(0)
  } catch (error) {
    lastError = error
    console.log(`Pages verification ${attempt}/${attempts} is waiting: ${error instanceof Error ? error.message : String(error)}`)
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

throw lastError
