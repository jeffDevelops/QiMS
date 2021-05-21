import { Pool } from 'pg'
import env from './env'

export const pg = (() => {
  /** If the user has opted into using a connection URL */
  if ('DATABASE_CONNECTION_STRING' in env) {
    return new Pool({
      connectionString: env.DATABASE_CONNECTION_STRING,
    })
  }

  /** Otherwise, the user has opted into using individual connection variables */
  return new Pool({
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    host: env.DATABASE_HOST,
    database: env.DATABASE_NAME,
    port: env.DATABASE_PORT,
  })
})()
