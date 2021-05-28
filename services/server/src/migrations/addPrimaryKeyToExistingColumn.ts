import sanitize from 'pg-format'
import { writeMigration } from '../io/writeMigration'

export const addPrimaryKeyToExistingColumn = async (
  modelName: string,
  columnName: string,
) => {
  await writeMigration(
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
    `${modelName}-add-primary-key`,
  )
}
