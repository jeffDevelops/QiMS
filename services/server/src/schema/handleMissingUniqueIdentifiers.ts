import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { prompt, Separator } from 'inquirer'
import { Colors, log } from '../utils/log'
import { migrateLatest } from './migrateLatest'
import { writeDefaultPrismaSchema } from '../io/writeDefaultPrismaSchema'
import { createNewPrimaryKeyColumn } from '../migrations/createNewPrimaryKeyColumn'
import { addPrimaryKeyToExistingColumn } from '../migrations/addPrimaryKeyToExistingColumn'

enum MissingPKQuestionAnswers {
  Skip = 'Skip',
  New = 'Create New Primary Key Column',
}

/** Measures to eliminate magic string with dynamic and conditional question name */
const pkColumnCreationQuestionName = 'Primary Key Column Creation'
const getNameForPKColumnCreationQuestion = (modelName: string) =>
  `${modelName} ${pkColumnCreationQuestionName}`

/**
 * Because the generated schema is rewritten often, it's important get the most recent
 * value before writing to it.
 */
export const getSchema = () =>
  fs.readFileSync(path.join(__dirname, '../../src/prisma/schema.prisma')).toString()

const missingPrimaryKeyComment =
  '/// The underlying table does not contain a valid unique identifier and can therefore currently not be handled by the Prisma Client.'

/** Maintain a list of models the user has yet to process */
const modelsWithMissingUUIDs: string[] = []

/**
 * Gets input from the user about missing primary keys, and migrates the database to
 * include the user-specified primary keys.
 */
export const handleMissingUniqueIdentifiers = async () => {
  /** Get all tables whose rows are not uniquely identifiable */
  const blocks = getSchema().split('\n\n')
  modelsWithMissingUUIDs.push(
    ...blocks.filter((block) => block.startsWith(missingPrimaryKeyComment)),
  )

  /** If any unidentifiable models exist, prompt the user with whether they want to fix */
  if (modelsWithMissingUUIDs.length) {
    log(
      `QiMS requires that each table explicity declares how its rows can be uniquely
identified, and it found ${modelsWithMissingUUIDs.length} tables without primary keys.

For the following tables, let QiMS know which column should be
made the primary key, or you can create a primary key for each
table that doesn't have one.

You can also skip certain tables--you might do this if the
table is a join table and doesn't need to be surfaced (the
GraphQL API handles joins for you as necessary).
      `,
    )

    log(
      `⚠️  NOTE: After all of your selections have been made, the
tables will be migrated to include primary key constraints for the
columns you specified.
      `,
      Colors.WARN,
    )

    await recursivelyPromptUntilPrimaryKeysSuccessfullyAdded()

    /** Overwrite the schema.prisma with the default, so that the database can be freshly introspected again */
    writeDefaultPrismaSchema()

    /** Pull the schema after migrating */
    execSync('yarn prisma:db-pull')
  }
}

const recursivelyPromptUntilPrimaryKeysSuccessfullyAdded = async () => {
  /** Return when all of the models with missing UUIDs are processed by the user */
  if (modelsWithMissingUUIDs.length === 0) return

  await modelsWithMissingUUIDs.reduce(
    async (promise: Promise<void>, modelStr: string, index: number) => {
      await promise

      const [, declarationLine, ...columns] = modelStr.split('\n')

      const modelName = declarationLine.split(' ')[1]
      const modelColumnNames = columns.map(
        (column) => column.split(' ').filter((str) => !!str)[0], // Strip whitespace and get the column name for each schema.prisma column declaration within the model
      )

      if (modelsWithMissingUUIDs.length === 0) return promise
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
          name: getNameForPKColumnCreationQuestion(modelName),
          message: `What would you like to name the new primary key column on ${modelName}?`,

          validate: (input: string) => {
            /** Prevent the user from providing a column name that already exists */
            if (modelColumnNames.includes(input)) {
              log(
                `\nThat column already exists:
                  
${columns.find((column) => column.trim().startsWith(input))}
                  
Please input a column name that doesn't already exist for this model.\n`,
                Colors.ERROR,
              )

              return false
            }

            /** Prevent the user from entering an invalid column name*/
            if (!input.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
              log(
                `\nColumn name invalid. Valid column names must start with a letter or underscore,
may only contain alphanumeric characters and underscores.
                  
Please input a valid column name.\n`,
                Colors.ERROR,
              )

              return false
            }

            return true
          },
        },
      ]).then(async (answers) => {
        await Object.keys(answers).reduce(async (promise, questionName: string) => {
          await promise

          const columnName: string = answers[questionName].trim().split(' ')[0]

          let modelName: string
          let migrationFileName: string

          /** Don't do anything if the model was skipped */
          if (answers[questionName] === MissingPKQuestionAnswers.Skip) return

          /** Create new primary key column */
          if (questionName.match(new RegExp(`^.+${pkColumnCreationQuestionName}$`))) {
            modelName = questionName.replace(pkColumnCreationQuestionName, '').trim()
            migrationFileName = (await createNewPrimaryKeyColumn(modelName, columnName))
              .fileName

            /** Add new primary key to existing column */
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

            /**
             * If any migrations throw, the user is prompted again by calling this recursive function;
             * reflect successful migrations by remove them from the modelsWithMissingUUIDs, so the user
             * isn't prompted again about the successful ones.
             */

            /** Find the model by its name */
            const indexOfSuccessfulMigration = modelsWithMissingUUIDs.findIndex(
              (modelBlock: string) => !!modelBlock.includes(`model ${modelName} {\n`),
            )

            /** Appease TypeScript */
            if (indexOfSuccessfulMigration !== undefined) {
              /** Remove the successful migration */
              modelsWithMissingUUIDs.splice(indexOfSuccessfulMigration, 1)
            }
          } catch (error) {
            log(
              `So, here\'s the thing: qiMS tried to add a primary key constraint to table
      
\`${modelName}.${columnName}\`
      
but it couldn't, most likely because values in that column are not unique.
You can fix the duplicate values in the data and try again, select a
different column, or create a new primary key column.

Here's the actual error:
      
${error?.detail ? error.detail : JSON.stringify(error, null, 2)}
      `,
              Colors.ERROR,
            )

            if (error.code === '42601') throw new Error('SHIT DONT WERK')

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
