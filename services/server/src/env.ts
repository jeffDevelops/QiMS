import dotenv from 'dotenv'
import { log, Colors } from './utils/log'
import { Env } from './types/Env'
import {
  NO_DB_HOST,
  NO_DB_NAME,
  NO_DB_PASSWORD_WARNING,
  NO_DB_PORT_WARNING,
  NO_DB_USER,
  UNPARSEABLE_PORT_VALUE,
  USING_DB_URL_WARNING,
} from './errors'

dotenv.config({ path: '../../.env' })

/**
 * Builds a succincter env object that throws immediately upon startup
 * if certain environment variables aren't present
 */
export const generateEnv = (): Env => {
  let BACKEND_PORT: number | undefined
  /**
   * -------- BACKEND_PORT ---------
   */

  /** Default to 8888, if the port isn't specified */
  if (!process.env.BACKEND_PORT) {
    log('No port specified in .env. Defaulting to 8888...\n')
    BACKEND_PORT = 8888
  } else {
    /** Ensure the BACKEND_PORT is parseable into an integer */
    try {
      BACKEND_PORT = parseInt(process.env.BACKEND_PORT)
    } catch (error) {
      log(UNPARSEABLE_PORT_VALUE, Colors.ERROR)
      process.exit(1)
    }
  }

  /**
   * ---------- DATABASE_URL ---------
   */
  if (process.env.DATABASE_URL) {
    log(USING_DB_URL_WARNING)

    return {
      BACKEND_PORT,
      DATABASE_URL: process.env.DATABASE_URL,
    }
  }

  /**
   * ---------- DATABASE_USER ---------
   */

  let DATABASE_USER: string | undefined
  if (!process.env.DATABASE_USER) {
    process.exit(1)
  }
  DATABASE_USER = process.env.DATABASE_USER

  log(NO_DB_USER, Colors.ERROR)
  /**
   * ---------- DATABASE_PASSWORD ---------
   */
  let DATABASE_PASSWORD: string | undefined
  if (!process.env.DATABASE_PASSWORD && !process.env.DATABASE_PASSWORD_OPT_OUT) {
    log(NO_DB_PASSWORD_WARNING, Colors.WARN)
    log(`🤞 Trying anyway...\n`)
    DATABASE_PASSWORD = ''
  }

  /**
   * ---------- DATABASE_HOST ---------
   */
  let DATABASE_HOST: string
  if (!process.env.DATABASE_HOST) {
    log(NO_DB_HOST, Colors.ERROR)
    process.exit(1)
  }
  DATABASE_HOST = process.env.DATABASE_HOST

  /**
   * ---------- DATABASE_PORT ---------
   */
  let DATABASE_PORT: number
  if (!process.env.DATABASE_PORT) {
    log(NO_DB_PORT_WARNING, Colors.WARN)
    DATABASE_PORT = 5432
  } else {
    try {
      /** Ensure the DATABASE_PORT is parseable into an integer */
      DATABASE_PORT = parseInt(process.env.DATABASE_PORT)
    } catch (error) {
      throw log(
        `Environment variable DATABASE_PORT must be parseable into an integer.`,
        Colors.ERROR,
      )
    }
  }

  /**
   * ---------- DATABASE_NAME ---------
   */
  let DATABASE_NAME: string
  if (!process.env.DATABASE_NAME) {
    log(NO_DB_NAME, Colors.ERROR)
    process.exit(1)
  }
  DATABASE_NAME = process.env.DATABASE_NAME

  /**
   * --- env ---
   */
  return {
    BACKEND_PORT,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_HOST,
    DATABASE_PORT,
    DATABASE_NAME,
  }
}
