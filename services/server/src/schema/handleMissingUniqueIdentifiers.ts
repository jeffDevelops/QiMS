import fs from 'fs'
import path from 'path'
import { prompt } from 'inquirer'
import { Colors, log } from '../utils/log'
import { writeMigration } from '../io/writeMigration'
import { migrateLatest } from './migrateLatest'

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
primary keys. For the following tables, let QiMS know which column should
be made the primary key.
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

          questions.push({
            default: 0,
            pageSize: 10,
            type: 'rawlist',
            name: modelName,
            message: `${index + 1}/${
              modelsWithMissingUUIDs.length
            } Which column is the primary key for model ${modelName}`,
            choices: [
              ...columns.map((column) => column),
              '  Skip (I understand that this model will not be queryable)',
            ],
          })
          return questions
        },
        [],
      ),
    ]).then(async (answers) => {
      log(`\n🗺️  🦆 Thanks! Writing migrations to include those constraints now...\n`)

      await Object.keys(answers).reduce(async (promise, modelName: string) => {
        await promise

        if (
          answers[modelName] ===
          '  Skip (I understand that this model will not be queryable)'
        )
          return

        /** Isolate the model block within the schema.prisma file */
        const schema = getSchema()
        const modelStartIndex = schema.indexOf(
          `${missingPrimaryKeyComment}\nmodel ${modelName} {\n`,
        )
        const modelEndIndexFromStart = schema.substring(modelStartIndex).indexOf(`}`) + 1

        const model = schema.substring(
          modelStartIndex +
            missingPrimaryKeyComment.length /** Remove the missing primary key comment annotation */,
          modelStartIndex + modelEndIndexFromStart,
        )

        /**
         * Within that model, add the @id column annotation to the column the user specified,
         * and remove the @@ignore model annotation
         */
        const newModel = model
          .replace(answers[modelName], `${answers[modelName]} @id`)
          .replace('@@ignore', '')

        /** Write the new model to the schema.prisma file */
        const newSchema =
          schema.substring(0, modelStartIndex) + // Keep everything before the new model
          newModel + // Add the new model
          schema.substring(modelStartIndex + modelEndIndexFromStart) // Keep everything after the new model

        fs.writeFileSync(
          path.join(__dirname, '../../src/prisma/schema.prisma'),
          newSchema,
        )

        const columnName = answers[modelName]
          .split(' ') // Split the column declaration into constituent parts
          .filter((str: string) => !!str)[0] // Filter the empty strings out, and return the first string (the column name)

        /** Generate the migration in server/src/migrations */
        await writeMigration(
          `ALTER TABLE ${modelName} ADD CONSTRAINT ${modelName}_pkey PRIMARY KEY (${columnName});`,
          `ALTER TABLE ${modelName} DROP CONSTRAINT ${modelName}_pkey;`,
          `${modelName}-primary-key`,
        )

        return promise
      }, Promise.resolve())

      /** Once all primary key migrations are created run all */
      await migrateLatest()
    })
  }
}
