import fs from 'fs'
import path from 'path'
import { CustomNodeJsGlobal } from '../types/Global'
import { log } from '../utils/log'

// Allow global.resolvers to persist across reloads in development
declare const global: CustomNodeJsGlobal

export const migrateLatest = async () => {
  log('\nChecking for migrations...\n')
  const migrationsDirPath = path.join(__dirname, '../../migrations')

  /** Throw if no migrations directory exists */
  if (!fs.existsSync(migrationsDirPath)) {
    throw new Error('Migrations directory at server/migrations does not exist.')
  }

  /** Log target migrations before execution */
  global.migrations.once('beforeMigrateMany', ({ migrationNames }) => {
    if (migrationNames.length > 0) {
      log(
        `Found new migrations! Applying:\n${migrationNames.map(
          (migration) => `${migration}\n`,
        )}`,
      )
    }
  })

  try {
    await global.migrations.connect()
    await global.migrations.migrate({ status: 'new' })
  } finally {
    await global.migrations.disconnect()
  }
}
