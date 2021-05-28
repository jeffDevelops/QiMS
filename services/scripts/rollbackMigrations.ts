import path from 'path'
import dotenv from 'dotenv'
import { MigrationManager } from 'east'
import {
  NO_DB_HOST,
  NO_DB_NAME,
  NO_DB_PORT_WARNING,
  NO_DB_USER,
} from '../server/src/errors'
import { log, Colors } from '../server/src/utils/log'

dotenv.config({ path: '../.env' })

let url: string
if (!process.env.DATABASE_URL) {
  if (!process.env.DATABASE_USER) {
    log(NO_DB_USER, Colors.ERROR)
    process.exit(1)
  }

  if (!process.env.DATABASE_HOST) {
    log(NO_DB_HOST, Colors.ERROR)
    process.exit(1)
  }

  if (!process.env.DATABASE_PORT) {
    log(NO_DB_PORT_WARNING, Colors.WARN)
  }

  if (!process.env.DATABASE_NAME) {
    log(NO_DB_NAME, Colors.ERROR)
    process.exit(1)
  }

  url = `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`
} else {
  url = process.env.DATABASE_URL
}

;(async () => {
  const migrationsDirPath = path.join(__dirname, '../server/migrations')

  /** Instantiate, configure, and initialize an MigrationManager */
  const migrations = new MigrationManager()

  await migrations.configure({
    url,
    dir: migrationsDirPath,
    adapter: 'east-postgres',
    loadConfig: true,
  })

  const isInitialized = await migrations.isInitialized()
  if (!isInitialized) await migrations.init()

  try {
    await migrations.connect()
    await migrations.rollback({
      status: 'executed',
    })
  } finally {
    await migrations.disconnect()
    process.exit(0)
  }
})()
