import path from 'path'
import { Client } from 'pg'
import { MigrationManager } from 'east'
import { CustomNodeJsGlobal } from './types/Global'

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal

export const initializeMigrationManager = async () => {
  const migrationsDirPath = path.join(__dirname, '../migrations')

  /** Instantiate, configure, and initialize an MigrationManager */
  const migrations = new MigrationManager()

  await migrations.configure({
    dir: migrationsDirPath,
    adapter: 'east-postgres',
    url: global.env.DATABASE_URL,
    loadConfig: true,
  })

  const isInitialized = await migrations.isInitialized()
  if (!isInitialized) await migrations.init()

  global.migrations = migrations
}
