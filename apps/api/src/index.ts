import { buildApp } from './app.js'
import { env, assertRequiredEnv } from './env.js'

const app = await buildApp()

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`O2O Engine running on :${env.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

try {
  assertRequiredEnv()
} catch (err) {
  console.error((err as Error).message)
  console.error('Server is running but business routes will fail until these variables are set in Railway.')
}
