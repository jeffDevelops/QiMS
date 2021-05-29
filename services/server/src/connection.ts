import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { writeDefaultPrismaSchema } from './io/writeDefaultPrismaSchema'
import { log } from './utils/log'
import { handleMissingUniqueIdentifiers } from './schema/handleMissingUniqueIdentifiers'
import { CustomNodeJsGlobal } from './types/Global'
import { initializeMigrationManager } from './migrations'

// Prevent multiple instances of Prisma Client in development
declare const global: CustomNodeJsGlobal

export const establishConnection = async () => {
  const datasourcesConfig = (() => {
    /** If the user has configured the database connection with a connection string */
    if ('DATABASE_URL' in global.env)
      return {
        datasources: { db: { url: global.env.DATABASE_URL } },
      }

    /** Otherwise, the user has opted into using individual connection variables */
    const url = `postgresql://${global.env.DATABASE_USER}:${global.env.DATABASE_PASSWORD}@${global.env.DATABASE_HOST}:${global.env.DATABASE_PORT}/${global.env.DATABASE_NAME}`

    /** The database URL must be available for Prisma introspection, so assign it here, if it hasn't been already */
    global.env.DATABASE_URL = url

    return { datasources: { db: { url } } }
  })()

  await initializeMigrationManager()

  log(`
🧐  Introspecting your database schema...
  `)
  writeDefaultPrismaSchema()
  execSync('yarn prisma:db-pull')

  await handleMissingUniqueIdentifiers()

  log(
    `✍️  Auto-generating your GraphQL API. This could take a minute, depending on the number of tables...\n`,
  )

  execSync('yarn prisma:generate')

  /**@ts-ignore Once Prisma generate has been called, dynamically import the generated module -- it will now have all of the generated methods */
  const { PrismaClient } = await import('./generated/client')

  // TODO: populate from environment variables
  const loggingConfig = {
    log: [
      { level: 'info', emit: 'event' as 'event' },
      { level: 'query', emit: 'event' as 'event' },
      { level: 'warn', emit: 'event' as 'event' },
      { level: 'error', emit: 'event' as 'event' },
    ],
  }

  /**
   * Instantiate the database client; because the PrismaClient and its corresponding
   * type annotations are only available after the schema is generated, the config
   * can't be strictly typed because the definitions don't exist yet, and must be typed
   * as `any`.
   */
  const instance =
    global.prisma || new PrismaClient({ ...loggingConfig, ...datasourcesConfig } as any)

  /** Prevent nodemon reloads from spawning a new connection to the database each reload */
  if (process.env.NODE_ENV === 'development') global.prisma = instance

  return global.prisma
}
