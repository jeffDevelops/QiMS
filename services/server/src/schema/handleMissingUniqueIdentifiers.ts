import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { prompt, Separator, QuestionCollection } from 'inquirer'
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

/**
 * Gets input from the user about missing primary keys, and migrates the database to
 * include the user-specified primary keys.
 */
export const handleMissingUniqueIdentifiers = async () => {
  const missingPrimaryKeyComment =
    '/// The underlying table does not contain a valid unique identifier and can therefore currently not be handled by the Prisma Client.'

  /** Get all tables whose rows are not uniquely identifiable */
  const blocks = getSchema().split('\n\n')
  const modelsWithMissingUUIDs = blocks.filter((block) =>
    block.startsWith(missingPrimaryKeyComment),
  )

  /** If any unidentifiable models exist, prompt the user with whether they want to fix */
  if (modelsWithMissingUUIDs.length) {
    log(
      `QiMS requires that each table explicity declares how its rows can be uniquely
identified, and it found ${modelsWithMissingUUIDs.length} tables without
primary keys.

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

    await prompt([
      ...modelsWithMissingUUIDs.reduce(
        (questions: any[], modelStr: string, index: number) => {
          const [, declarationLine, ...columns] = modelStr.split('\n')

          const modelName = declarationLine.split(' ')[1]
          const modelColumnNames = columns.map((column) => column.split(' ')[0])

          console.log({ modelColumnNames })

          questions.push(
            {
              default: 0,
              pageSize: 10,
              type: 'rawlist',
              name: modelName,
              message: `${index + 1}/${
                modelsWithMissingUUIDs.length
              } Which column is the primary key for model ${modelName}`,
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
              message: `What would you like to name the new primary key column on ${modelName}`,
              validate: (answers: any) =>
                // Prevent the user from prividing a column name that already exists
                !modelColumnNames.includes(
                  answers[getNameForPKColumnCreationQuestion(modelName)],
                ),
            },
          )
          return questions
        },
        [],
      ),
    ]).then(async (answers) => {
      log(`\n🗺️  🦆 Thanks! Writing migrations to include those constraints now...\n`)

      await Object.keys(answers).reduce(async (promise, questionName: string) => {
        await promise

        /** Don't do anything if the model was skipped */
        if (answers[questionName] === MissingPKQuestionAnswers.Skip) return

        if (questionName.match(new RegExp(`^.+${pkColumnCreationQuestionName}$`))) {
          const modelName = questionName.replace(pkColumnCreationQuestionName, '').trim()
          const columnName = answers[questionName].split(' ')[0]

          await createNewPrimaryKeyColumn(modelName, columnName)
        } else {
          /** Don't write a migration to add a PK to an existing column if the user has created a new column */
          if (answers[questionName] === MissingPKQuestionAnswers.New) return

          const columnName = answers[questionName]
            .split(' ') // Split the column declaration into constituent parts; creates an array that looks like ['', '', '', '', 'column_name', '', '', '', '', 'data type', '', '', '', '', 'prisma annotations']
            .filter((str: string) => !!str)[0] // Filter the empty strings out, and return the first string (the column name)

          await addPrimaryKeyToExistingColumn(answers[questionName], columnName)
        }

        return promise
      }, Promise.resolve())

      /** Once all primary key migrations are created run all */
      await migrateLatest()

      /** Overwrite the schema.prisma with the default, so that the database can be freshly introspected again */
      writeDefaultPrismaSchema()

      /** Pull the schema after migrating */
      execSync('yarn prisma:db-pull')
    })
  }
}
