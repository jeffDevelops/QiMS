import fs from 'fs'
import path from 'path'
import { CustomNodeJsGlobal } from '../types/Global'

declare const global: CustomNodeJsGlobal

/**
 * Touches and writes a migration file with the specified up and
 * down, with the provided name.
 */
export const writeMigration = async (
  upStatements: string, // The SQL for the migration function
  downStatements: string, // The SQL for the rollback function
  fileName: string, // The name of the migration file
) => {
  const migrationsDirPath = path.join(__dirname, '../../migrations')

  /** Create the migrations directory if it doesn't yet exist */
  if (!fs.existsSync(migrationsDirPath)) {
    fs.mkdirSync(migrationsDirPath)
  }

  /** Read the migration file into memory and overwrite the migrate and rollback functions with the provided statements */
  const { name: migrationFileName } = await global.migrations.create(fileName)
  const migrationFilePath = `${migrationsDirPath}/${migrationFileName}.js`

  const getMigrationFile = () => fs.readFileSync(migrationFilePath).toString()

  const replaceFileSubstring = (
    file: string,
    startToken: string, // Not included in the overwrite
    endToken: string, // Not included in the overwrite
    newSubstring: string,
  ) => {
    const substringStartIndex = file.indexOf(startToken) + startToken.length

    /**
     *  The index of the endToken, not from the start of the file,
     *  but from the start of the substring.
     */
    const substringEndIndexFromStart = file
      .substring(substringStartIndex)
      .indexOf(endToken)

    /**
     *  The new file consists of the unmodified stuff at the beginning,
     *  the new substring, and the unmodified stuff at the end;
     *  concatenate these.
     */
    const newFile =
      file.substring(0, substringStartIndex) +
      newSubstring +
      file.substring(substringStartIndex + substringEndIndexFromStart)

    return newFile
  }

  /**
   *  Note: formatting this string is critical to locating the part of
   *  the file to be overwritten
   */
  const migrationBlockStartToken = `exports.migrate = function(client, done) {\n\tvar db = client.db;\n\t`

  /**
   *  Note: formatting this string is critical to locating the part of
   *  the file to be overwritten
   */
  const rollbackBlockStartToken = `exports.rollback = function(client, done) {\n\tvar db = client.db;\n\t`

  const endToken = `};`

  /** Write the migration */
  const newMigrationBlock = replaceFileSubstring(
    getMigrationFile(),
    migrationBlockStartToken,
    endToken,
    `const SQL = /* sql */ \`\n\n${upStatements}\n\n\`
  db.query(SQL, [], function(err) {
    if (err) return done(err)
    done()
  });\n`,
  )

  fs.writeFileSync(migrationFilePath, newMigrationBlock)

  /** Write the rollback */
  const newRollbackBlock = replaceFileSubstring(
    getMigrationFile(),
    rollbackBlockStartToken,
    endToken,
    `const SQL = /* sql */ \`\n\n${downStatements}\n\n\`
  db.query(SQL, [], function(err) {
    if (err) return done(err)
    done()
  });\n`,
  )

  fs.writeFileSync(migrationFilePath, newRollbackBlock)

  const imports = replaceFileSubstring(
    getMigrationFile(),
    '',
    '',
    `
/**
 *  For SQL-in-JS syntax highlighting within VSCode, download vscode-sql-tagged-template-literals:
 *  https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals
 */

    `,
  )

  fs.writeFileSync(migrationFilePath, imports)
}
