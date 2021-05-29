import sanitize from 'pg-format'
import { writeMigration } from '../io/writeMigration'
import { Migration } from '../types/Migration'

/**
 * Writes a migration to create a new serial primary key column
 * with specified column name to the specified table
 */
export const createNewPrimaryKeyColumn = async (
  modelName: string,
  columnName: string,
): Promise<Migration> => {
  const fileName = `${modelName}-new-primary-key-column-${columnName}`

  return await writeMigration(
    sanitize(
      /* sql */ `ALTER TABLE
  %I
  ADD COLUMN
    %I
    SERIAL PRIMARY KEY;`,
      modelName,
      columnName,
    ),
    sanitize(
      /* sql */ `ALTER TABLE
  %I
  DROP COLUMN
    %I;`,
      modelName,
      columnName,
    ),
    fileName,
  )
}
