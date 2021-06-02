import sanitize from 'pg-format'
import { writeMigration } from '../io/writeMigration'
import { Migration } from '../types/Migration'

export const createQiAdministratorsTable = async (): Promise<Migration> => {
  const fileName = `qi-administrators-create-table`

  return await writeMigration(
    sanitize(/* sql */ `CREATE TABLE IF NOT EXISTS
  qi_administrator (
    id              SERIAL,
    first_name      VARCHAR(255) NULL,
    last_name       VARCHAR(255) NULL,
    email_address   VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    CONSTRAINT qi_administrator_pkey PRIMARY KEY (id)
  );`),
    sanitize(/* sql */ `DROP CONSTRAINT qi_administrator_pkey;
DROP TABLE IF EXISTS qi_administrator;`),
    fileName,
  )
}
