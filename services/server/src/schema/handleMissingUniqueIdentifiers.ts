import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { Colors, log } from '../utils/log'
import { prompt, Separator } from 'inquirer'
import { migrateLatest } from './migrateLatest'
import { POSTGRES_COLUMN_IDENTIFIER_REGEX } from '../config/constants'
import { writeDefaultPrismaSchema } from '../io/writeDefaultPrismaSchema'
import { createNewPrimaryKeyColumn } from '../migrations/createNewPrimaryKeyColumn'
import { addPrimaryKeyToExistingColumn } from '../migrations/addPrimaryKeyToExistingColumn'
import { ADDING_PRIMARY_KEY_CONSTRAINT_FAILED } from '../errors/migration/addingPrimaryKeyConstraintFailed'
import { Preferences } from '../utils/Preferences'

enum MissingPKQuestionAnswers {
  Skip = 'Skip',
  New = 'Create New Primary Key Column',
}

/** Measure to eliminate magic string with dynamic and conditional question name */
const PK_COLUMN_CREATION_QUESTION_NAME = 'Primary Key Column Creation'

const PRISMA_MISSING_PRIMARY_KEY_COMMENT =
  '/// The underlying table does not contain a valid unique identifier and can therefore currently not be handled by the Prisma Client.'

/** Maintain a list of models the user has yet to process */
const modelsWithMissingUUIDs: string[] = []

/**
 * MAIN
 */

/**
 * Gets input from the user about missing primary keys, and migrates the database to
 * include the user-specified primary keys.
 */
export const handleMissingUniqueIdentifiers = async () => {
  const schema = fs
    .readFileSync(path.join(__dirname, '../../src/prisma/schema.prisma'))
    .toString()

  /** Get all tables whose rows are not uniquely identifiable */
  const blocks = schema.split('\n\n')
  modelsWithMissingUUIDs.push(
    ...blocks.filter((block) => block.startsWith(PRISMA_MISSING_PRIMARY_KEY_COMMENT)),
  )

  /** Don't prompt if the user has already skipped all of the models without UUIDs */
  if (
    Preferences.getPreferences().unsurfacedModels.every(
      (modelName: string) =>
        !!modelsWithMissingUUIDs.find(
          (modelDeclaration: string) =>
            !!modelDeclaration.match(new RegExp(`^model ${modelName} {$`, 'm')),
        ),
    )
  )
    return

  if (modelsWithMissingUUIDs.length) {
    /** If any unidentifiable models exist, prompt the user with whether they want to fix */
    /** Contextualize the user; warn them that their changes modify the database schema */
    logModelsWithMissingUUIDsWarning(modelsWithMissingUUIDs)

    /** Prompt the user for how they want to handle each model with a missing UUID */
    await recursivelyPromptUntilPrimaryKeysSuccessfullyAdded()

    /** Overwrite the schema.prisma with the default, so that the database can be freshly introspected again */
    writeDefaultPrismaSchema()

    /** Pull the schema after migrating */
    execSync('yarn prisma:db-pull')
  }
}

/**
 * HELPERS
 */

async function recursivelyPromptUntilPrimaryKeysSuccessfullyAdded() {
  /** Recursive function exit condition - remove this call from the stack when all models have been processed */
  if (modelsWithMissingUUIDs.length === 0) return

  await modelsWithMissingUUIDs.reduce(
    async (promise: Promise<void>, modelStr: string, index: number) => {
      await promise

      const [, declarationLine, ...columns] = modelStr.split('\n')

      const modelName = declarationLine.split(' ')[1]
      const modelColumnNames = columns.map(
        (column) => column.split(' ').filter((str) => !!str)[0], // Strip whitespace and get the column name for each schema.prisma column declaration within the model
      )

      /** Stop this iteration if all models have been processed */
      if (modelsWithMissingUUIDs.length === 0) return promise

      /**
       * Don't prompt if the model has already been marked as unsurfaced in
       * preferences (the user has previously skipped)
       */
      if (Preferences.getPreferences().unsurfacedModels.includes(modelName))
        return promise

      await prompt([
        {
          default: 0,
          pageSize: 10,
          type: 'rawlist',
          name: modelName,
          message: `Which column is the primary key for model ${modelName}?`,
          choices: [
            ...columns.map((column) => column),
            new Separator(),
            MissingPKQuestionAnswers.New,
            MissingPKQuestionAnswers.Skip,
          ],
        },
        {
          type: 'input',
          when: (answers: any) => answers[modelName] === MissingPKQuestionAnswers.New,
          name: `${modelName} ${PK_COLUMN_CREATION_QUESTION_NAME}`,
          message: `What would you like to name the new primary key column on ${modelName}?`,
          validate: (userInput: string) => {
            /** Prevent the user from providing a column name that already exists */
            if (modelColumnNames.includes(userInput)) {
              logColumnAlreadyExistsValidationError(columns, userInput)
              return false
            }

            /** Prevent the user from entering an invalid column name*/
            if (!userInput.match(POSTGRES_COLUMN_IDENTIFIER_REGEX)) {
              logColumnNameValidationError(userInput)
              return false
            }

            return true
          },
        },
      ]).then(async (answers) => {
        /**
         * Loop through questions and create and run migrations for each model
         * with no UUID. The options are:
         * 1) User has skipped (return early)
         * 2) User has elected to add a completely new primary key column
         * 3) User has elected to add a primary key to an existing column
         */
        await Object.keys(answers).reduce(async (promise, questionName: string) => {
          await promise

          const columnName: string = answers[questionName].trim().split(' ')[0]

          let modelName: string
          let migrationFileName: string

          /**
           * 1) User has skipped; record the unsurfaced model in preferences,
           * remove the model from the list of models to process, and return early
           */
          if (answers[questionName] === MissingPKQuestionAnswers.Skip) {
            modelName = questionName.replace(PK_COLUMN_CREATION_QUESTION_NAME, '').trim()

            const preferences = Preferences.getPreferences()
            Preferences.setPreferences({
              ...preferences,
              unsurfacedModels: [...preferences.unsurfacedModels, modelName],
            })

            removeModelFromListToProcess(modelName)

            return
          }

          /** 2) User has elected to add a completely new primary key column */
          if (questionName.match(new RegExp(`^.+${PK_COLUMN_CREATION_QUESTION_NAME}$`))) {
            modelName = questionName.replace(PK_COLUMN_CREATION_QUESTION_NAME, '').trim()
            migrationFileName = (await createNewPrimaryKeyColumn(modelName, columnName))
              .fileName

            /** 3) User has elected to add a primary key to an existing column */
          } else {
            /** Don't write a migration to add a PK to an existing column if the user has created a new column */
            if (answers[questionName] === MissingPKQuestionAnswers.New) return

            modelName = questionName
            migrationFileName = (
              await addPrimaryKeyToExistingColumn(questionName, columnName)
            ).fileName
          }

          try {
            log(
              `\n🗺️  🦆 Thanks! Writing migrations to include those constraints now...\n`,
            )

            await migrateLatest()

            removeModelFromListToProcess(modelName)
          } catch (error) {
            log(
              ADDING_PRIMARY_KEY_CONSTRAINT_FAILED(error, modelName, columnName),
              Colors.ERROR,
            )

            /** Remove the failed migration */
            fs.rmSync(path.join(__dirname, `../../migrations/${migrationFileName}`))

            await recursivelyPromptUntilPrimaryKeysSuccessfullyAdded()
          }

          return promise
        }, Promise.resolve())
      })
    },
    Promise.resolve(),
  )
}

function removeModelFromListToProcess(modelName: string) {
  /** Find the model by its name */
  const indexOfSuccessfulMigration = modelsWithMissingUUIDs.findIndex(
    (modelBlock: string) => !!modelBlock.includes(`model ${modelName} {\n`),
  )

  /** Remove the successful migration */
  modelsWithMissingUUIDs.splice(indexOfSuccessfulMigration, 1)
}

function logModelsWithMissingUUIDsWarning(modelsWithMissingUUIDs: string[]) {
  log(
    `
qiMS requires that each table explicity declares how its rows
can be uniquely identified, and it found ${modelsWithMissingUUIDs.length} tables without
primary keys.

For the following tables, let qiMS know which column should be
made the primary key, or you can create a primary key column
for each table that doesn't have one.

You can also skip certain tables--you might elect to do this
if the table is a join table and doesn't need to be surfaced
(the GraphQL API handles joins for you as necessary). You can
always come back to unsurfaced models in the UI.

⚠️  PLEASE NOTE: qiMS will write and run a migration for each
of the ${modelsWithMissingUUIDs.length} tables you add primary keys to. This action writes
directly to the database schema and may affect the behavior of
any existing APIs consuming this database. 

qiMS saves all of its migrations to the root migrations
folder in this project. As long as no other systems are
migrating this database, you can revert all changes that
qiMS makes by running:

yarn qi:rollback

This command rolls back all migrations that qiMS has created.

- OR -

You can roll back all migrations, remove all saved
preferences, and REMOVE THE MIGRATION FILES. Be careful when
running this command! qiMS will behave as if it is connecting
to this database for the first time afterwards.

yarn qi:hard-reset\n`,
    Colors.WARN,
  )
}

function logColumnAlreadyExistsValidationError(columns: string[], userInput: string) {
  log(
    `\nThat column already exists:
      
${columns.find((column) => column.trim().startsWith(userInput))}
      
Please input a column name that doesn't already exist for this model.\n`,
    Colors.ERROR,
  )
}

function logColumnNameValidationError(userInput: string) {
  log(
    `\nColumn name ${userInput} invalid. Valid column names must start with a letter or underscore,
and may only contain alphanumeric characters and underscores.
      
Please input a valid column name.\n`,
    Colors.ERROR,
  )
}
