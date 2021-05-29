import sanitize from 'pg-format'
import { writeMigration } from '../io/writeMigration'
import { Migration } from '../types/Migration'

export const addPrimaryKeyToExistingColumn = async (
  modelName: string,
  columnName: string,
): Promise<Migration> => {
  const fileName = `${modelName}-add-primary-key`

  return await writeMigration(
    sanitize(
      /* sql */ `ALTER TABLE
  %I
  ADD CONSTRAINT
    %I_pkey
    PRIMARY KEY (%I);`,
      modelName,
      columnName,
      columnName,
    ),
    sanitize(
      /* sql */ `ALTER TABLE
  %I
  DROP CONSTRAINT
    %I_pkey`,
      modelName,
      columnName,
    ),
    fileName,
  )
}
