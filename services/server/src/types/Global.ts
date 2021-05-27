import { Env } from './Env'
import { MigrationManager } from 'east'
import { Client } from 'pg'

// Add resolvers to the NodeJS global type
export interface CustomNodeJsGlobal extends NodeJS.Global {
  /** Environment */
  env: Env

  /** Make prisma and its generated resolvers globally available on subsequent process reloads */
  resolvers?: any
  prisma: any

  /** East MigrationManager class instance */
  migrations: MigrationManager
  migrationConnection: Client
}
