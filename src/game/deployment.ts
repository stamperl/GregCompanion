const deployedAt = import.meta.env.VITE_DEPLOYED_AT || new Date().toISOString()
const commitSha = import.meta.env.VITE_DEPLOY_VERSION || 'local'

export const deploymentInfo = {
  deployedAt,
  version: commitSha === 'local' ? 'local' : commitSha.slice(0, 7),
}
