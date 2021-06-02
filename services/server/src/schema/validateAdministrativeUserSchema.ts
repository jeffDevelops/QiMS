import fs from 'fs'
import path from 'path'
import { prompt } from 'inquirer'
import { execSync } from 'child_process'
import { Colors, log } from '../utils/log'
import { Preferences } from '../utils/Preferences'
import { migrateLatest } from './migrateLatest'
import { writeDefaultPrismaSchema } from '../io/writeDefaultPrismaSchema'
import { createQiAdministratorsTable } from '../migrations/createQiAdministratorsTable'
import { PRISMA_MISSING_PRIMARY_KEY_COMMENT } from '../config/constants'

/** Inquirer question names */
const MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME =
  'MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME'
const HANDLE_INVALID_QI_ADMINISTRATOR_MODEL_QUESTION_NAME =
  'HANDLE_INVALID_QI_ADMINISTRATOR_MODEL_QUESTION_NAME'
const USER_HAS_MANUALLY_RESOLVED_INVALID_SCHEMA_QUESTION_NAME =
  'USER_HAS_MANUALLY_RESOLVED_INVALID_SCHEMA_QUESTION_NAME'

enum MissingQiAdministratorsModelQuestionAnswers {
  CreateTable = `Create qi_administrator Table`,
  OptOut = 'Opt Out',
}
enum InvalidQiAdministratorsModelQuestionAnswers {
  ManuallyResolve = 'I will manually resolve the schema validation errors',
  OptOut = `Opt out of qiMS' administrative functionality, and launch in Schema Readonly Mode`,
}

enum AdministrativeUserSchemaValidationErrors {
  MISSING_PRIMARY_KEY_ID_FIELD = 'The table qi_administrator must have a primary key column called `id` with datatype INTEGER.',
  MISSING_NULLABLE_FIRST_NAME_FIELD = 'The table qi_administrator must have a nullable `first_name` column with datatype VARCHAR(255).',
  MISSING_NULLABLE_LAST_NAME_FIELD = 'The table qi_administrator must have a nullable `last_name` column with datatype VARCHAR(255).',
  MISSING_UNIQUE_EMAIL_FIELD = 'The table qi_administrator must have a unique `email` column with datatype VARCHAR(255), in case administrators get locked out of OAuth account(s).',
  MISSING_PASSWORD_FIELD = 'The table qi_administrator must have a password column with datatype VARCHAR(255), in case adminstrators get locked out of OAuth account(s).',
}

export const validateAdministrativeUserTable = async () => {
  if (Preferences.getPreferences().hasOptedOutOfAdministrativeUserTable) return

  const schema = fs
    .readFileSync(path.join(__dirname, '../../src/prisma/schema.prisma'))
    .toString()

  const qiAdministratorsModel = schema
    .split('\n\n')
    .find((modelBlock) => modelBlock.match(/^model qi_administrator {$/m))

  if (!qiAdministratorsModel) {
    logMissingAdministrativeUserTableWarning()

    await prompt({
      default: 0,
      type: 'rawlist',
      name: MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME,
      message: 'How would you like to handle this?',
      choices: [
        MissingQiAdministratorsModelQuestionAnswers.CreateTable,
        MissingQiAdministratorsModelQuestionAnswers.OptOut,
      ],
    }).then(async ({ MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME }) => {
      /** Handle opt out */
      if (
        MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME ===
        MissingQiAdministratorsModelQuestionAnswers.OptOut
      ) {
        handleOptOutOfQiMSAdministration()
        return

        /** Handle opt in */
      } else {
        log(`\n🗺️  🦆 Thanks! Writing a migration to create that table now...\n`)

        await createQiAdministratorsTable()
        await migrateLatest()
        execSync('yarn prisma:db-pull')
        return
      }
    })

    /** The qi_administrator model exists, but it must be validated */
  } else {
    return await recursivelyPromptUntilSchemaValid(qiAdministratorsModel)
  }
}

const recursivelyPromptUntilSchemaValid = async (model: string) => {
  const modelLines = model.split('\n')
  const problems: AdministrativeUserSchemaValidationErrors[] = []

  /** 1) The schema must have primary key field called id */
  if (
    modelLines[0] === PRISMA_MISSING_PRIMARY_KEY_COMMENT ||
    model.includes('@@ignore') ||
    !modelLines.some((line: string) =>
      normalizedColumnIsValid(line, 'id Int @id @default(autoincrement())'),
    )
  ) {
    problems.push(AdministrativeUserSchemaValidationErrors.MISSING_PRIMARY_KEY_ID_FIELD)
  }

  /** 2) The schema must have a nullable first_name field */
  if (
    !modelLines.some((line: string) =>
      normalizedColumnIsValid(line, 'first_name String? @db.VarChar(255)'),
    )
  ) {
    problems.push(
      AdministrativeUserSchemaValidationErrors.MISSING_NULLABLE_FIRST_NAME_FIELD,
    )
  }

  /** 3) The schema must have a nullable last_name field */
  if (
    !modelLines.some((line: string) =>
      normalizedColumnIsValid(line, 'last_name String? @db.VarChar(255)'),
    )
  ) {
    problems.push(
      AdministrativeUserSchemaValidationErrors.MISSING_NULLABLE_LAST_NAME_FIELD,
    )
  }

  /** 4) The schema must have a required unique email field */
  if (
    !modelLines.some((line: string) =>
      normalizedColumnIsValid(line, 'email_address String @unique @db.VarChar(255)'),
    )
  ) {
    problems.push(AdministrativeUserSchemaValidationErrors.MISSING_UNIQUE_EMAIL_FIELD)
  }

  /** 5) The schema must have a required password field */
  if (
    !modelLines.some((line: string) =>
      normalizedColumnIsValid(line, 'password String @db.VarChar(255)'),
    )
  ) {
    problems.push(AdministrativeUserSchemaValidationErrors.MISSING_PASSWORD_FIELD)
  }

  /** Recursive function exit condition (no validation errors) */
  if (problems.length === 0) return

  logQiAdministratorSchemaValidationErrors(problems)

  await prompt({
    default: 0,
    type: 'rawlist',
    name: HANDLE_INVALID_QI_ADMINISTRATOR_MODEL_QUESTION_NAME,
    message: 'How would you like to handle this?',
    choices: [
      InvalidQiAdministratorsModelQuestionAnswers.ManuallyResolve,
      InvalidQiAdministratorsModelQuestionAnswers.OptOut,
    ],
  }).then(async ({ HANDLE_INVALID_QI_ADMINISTRATOR_MODEL_QUESTION_NAME }) => {
    /** Handle opt out */
    if (
      HANDLE_INVALID_QI_ADMINISTRATOR_MODEL_QUESTION_NAME ===
      InvalidQiAdministratorsModelQuestionAnswers.OptOut
    ) {
      handleOptOutOfQiMSAdministration()
      return

      /** Handle manually resolve */
    } else {
      await prompt({
        type: 'confirm',
        name: USER_HAS_MANUALLY_RESOLVED_INVALID_SCHEMA_QUESTION_NAME,
        message: 'I have manually resolved the above schema issues.',
      }).then(async ({ USER_HAS_MANUALLY_RESOLVED_INVALID_SCHEMA_QUESTION_NAME }) => {
        /** Pull the schema, and reevaluate */
        if (USER_HAS_MANUALLY_RESOLVED_INVALID_SCHEMA_QUESTION_NAME) {
          /** Overwrite the schema.prisma with the default, so that the database can be freshly introspected again */
          writeDefaultPrismaSchema()

          /** Pull the schema after migrating */
          execSync('yarn prisma:db-pull')

          /** Recursively call the validation function again to reevaluate with the newly generated schema.prisma file */
          return await validateAdministrativeUserTable()
        }
      })
    }
  })
}

const logMissingAdministrativeUserTableWarning = () => {
  log(
    `
qiMS' administrative UI requires a table called qi_administrator to manage
administrative users that will use qiMS to make changes to the database
schema or to manage content (if so authorized).

You can either:

  1) [Recommended] Allow qiMS to write and run a migration on your behalf
  to create a qi_administrator table within the connected database.
    - Once created, you'll be able to log in as an administrator with
      your email and password when the admin UI launches.
    - Once created, you and any users you authorize are free to customize
      this table beyond the columns that qiMS needs to operate properly.

- OR -

  2) Opt out of qiMS' administrative functionality. qiMS will run in
  Schema Readonly Mode. This selection comes with considerably limiting
  implications:
    - qiMS will still be reactive to schema changes on launch, and it
      will still generate a GraphQL API, but it will not expose any means
      to modify the database schema.
    - qiMS' admin UI will be disabled, and nobody will be able to use it
      to make schema changes or manage content.
  `,
    Colors.WARN,
  )
}

const logOptOutMessage = () => {
  log(`
Noted! qiMS won't ask about this again.

You can change this preference in:

services/server/.qi/preferences.json#hasOptedOutOfAdministrativeUserTable.
 
If you do, qiMS will present this series of prompts again when it starts up.
  `)
}

/**
 *
 * @param columnDefinition The line of text with the column definition; looks like
 * ```
 *     id            Int     \@id \@default(autoincrement())
 * ```
 * @param normalizedMatcher The string to match after normalization (trim()'med column definition line with a single space as a separator)
 * @returns boolean
 */
const normalizedColumnIsValid = (columnDefinition: string, normalizedMatcher: string) => {
  const normalizedLine = columnDefinition
    .trim()
    .split(' ')
    .filter((str) => !!str)
    .join(' ')

  return normalizedLine === normalizedMatcher
}

const logQiAdministratorSchemaValidationErrors = (
  problems: AdministrativeUserSchemaValidationErrors[],
) => {
  log(
    `
qiMS found a table called \`qi_administrator\`, but its schema is invalid.
The schema must include the following columns and their respective data
structures. You're welcome to add additional columns, but the base schema
below is required:

model qi_administrator {
  id            Int     @id @default(autoincrement())
  first_name    String? @db.VarChar(255)
  last_name     String? @db.VarChar(255)
  email_address String  @unique @db.VarChar(255)
  password      String  @db.VarChar(255)

  /// ... your custom fields
}

Here are the validation problems it found: ${problems.map(
      (problem, i) => `\n${i + 1}) ${problem}`,
    )}

qiMS isn't equipped to solve these problems without the possibility of
data loss. 

For example, if one of the columns is of the wrong data type, it's
impossible for qiMS to know how to map the values in that column to the
new required data type.

These are the measures you can take to rectify the issues:

1) [Recommended] Resolve the issues manually. Rename columns and migrate
the data as necessary to satisfy the required base schema.

2) You can elect to launch qiMS in Schema Readonly Mode.

It's highly recommended not to modify the base schema of any \`qi_\`-
prepended tables or columns in order to avoid errors like this in
the future. 

Consult the documentation for required fields and datatypes
for \`qi_\`-prepended tables and columns.
  `,
    Colors.ERROR,
  )
}

const handleOptOutOfQiMSAdministration = () => {
  /** Write the opt out action to preferences, so users aren't asked again */
  const preferences = Preferences.getPreferences()
  Preferences.setPreferences({
    ...preferences,
    hasOptedOutOfAdministrativeUserTable: true,
  })

  /** Acknowledge the user's decision and return early */
  logOptOutMessage()
  return
}
