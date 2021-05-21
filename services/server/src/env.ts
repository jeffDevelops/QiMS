import dotenv from 'dotenv'
import { log, Colors } from './utils/log'

dotenv.config({ path: '../../.env' })

type Env =
  | {
      BACKEND_PORT: number
      DATABASE_USER: string
      DATABASE_PASSWORD: string | undefined
      DATABASE_HOST: string
      DATABASE_PORT: number
      DATABASE_NAME: string
    }
  | {
      BACKEND_PORT: number
      DATABASE_CONNECTION_STRING: string
    }

/**
 * Builds a succincter env object that throws immediately upon startup
 * if certain environment variables aren't present
 */
const env: Env = (() => {
  let BACKEND_PORT: number | undefined
  /**
   * -------- BACKEND_PORT ---------
   */

  /** Default to 8888, if the port isn't specified */
  if (!process.env.BACKEND_PORT) {
    log('No port specified in env. Defaulting to 8888...')
    BACKEND_PORT = 8888
  } else {
    /** Ensure the BACKEND_PORT is parseable into an integer */
    try {
      BACKEND_PORT = parseInt(process.env.BACKEND_PORT)
    } catch (error) {
      throw log(
        `Environment variable BACKEND_PORT must be parseable into an integer.`,
        Colors.ERROR,
      )
    }
  }

  /**
   * ---------- DATABASE_CONNECTION_STRING ---------
   */
  if (process.env.DATABASE_CONNECTION_STRING) {
    log(`
Using DATABASE_CONNECTION_STRING from /.env.

Note: if you experience connection issues to your database,
another .env config option is to break the URL down into
individual DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST,
DATABASE_PORT, and DATABASE_NAME variables for an easier
debugging experience.
    `)

    return {
      BACKEND_PORT,
      DATABASE_CONNECTION_STRING: process.env.DATABASE_CONNECTION_STRING,
    }
  }

  /**
   * ---------- DATABASE_USER ---------
   */

  let DATABASE_USER: string | undefined
  if (!process.env.DATABASE_USER)
    throw log(
      `
Environment variable DATABASE_USER missing at runtime.
Please add the username to the DATABASE_USER key in
/.env. If you're running Postgres locally,
this is often the name of your system's user, which will
often appear on the command prompt in your Terminal.

Or, if you have your database connection string, the value
you need is whatever appears in the URL for "user" before the
second colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality
        `,
      Colors.ERROR,
    )
  DATABASE_USER = process.env.DATABASE_USER

  /**
   * ---------- DATABASE_PASSWORD ---------
   */
  let DATABASE_PASSWORD: string | undefined
  if (!process.env.DATABASE_PASSWORD && !process.env.DATABASE_PASSWORD_OPT_OUT) {
    log(
      `
No DATABASE_PASSWORD specified in environment variables.
Assuming connection doesn't require one.

If connection permission is denied, ensuring this key is
present in /.env is probably the first thing
to check.

If you have your database connection string, the value
you need is whatever appears in the URL for "password"
after the second colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality

We hope that you'll remove this warning by protecting
your database with a password, but you may suppress
this warning by adding DATABASE_PASSWORD_OPT_OUT=true
to /.env
    `,
      Colors.WARN,
    )
    log(`Trying anyway...\n`)
    DATABASE_PASSWORD = ''
  }

  /**
   * ---------- DATABASE_HOST ---------
   */
  let DATABASE_HOST: string
  if (!process.env.DATABASE_HOST) {
    throw log(
      `
No DATABASE_HOST specified in environment variables. Please
add the hostname to the DATABASE_HOST key in
/.env.

If you have your database connection string, the value
you need is whatever appears in the URL for "host" after the
'@' in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality
    `,
      Colors.ERROR,
    )
  }
  DATABASE_HOST = process.env.DATABASE_HOST

  /**
   * ---------- DATABASE_PORT ---------
   */
  let DATABASE_PORT: number
  if (!process.env.DATABASE_PORT) {
    log(
      `
No DATABASE_PORT specified in environment variables.
Defaulting to 5432 (the default PostrgresQL port).

If connection fails, ensuring this key is present in
/.env is probably the first thing to check.

If you have your database connection string, the value
you need is whatever appears in the URL for "host" after
the third colon in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality

To suppress this warning, add DATABASE_PORT=5432 to
/.env (if that's where the database
service is running).
       `,
      Colors.WARN,
    )
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
   * ---------- DATABASE_HOST ---------
   */
  let DATABASE_NAME: string
  if (!process.env.DATABASE_NAME) {
    throw log(
      `
No DATABASE_NAME specified in environment variables.

If you have your database connection string, the value
you need is whatever appears in the URL for "databaseName"
after the third forward slash in:

'postgresql://user:[password]@host[:port]/databaseName[?param1=param1&param2=param2]'*

* Square brackets ([]) signify optionality
     `,
      Colors.ERROR,
    )
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
})()

export default env
