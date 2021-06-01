/**
 * Can be used to validate column names
 */
export const POSTGRES_COLUMN_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Prisma prepends this comment to models that don't have a unique identifier,
 * and thus must be ignored and left unsurfaced in the GraphQl API
 */
export const PRISMA_MISSING_PRIMARY_KEY_COMMENT =
  '/// The underlying table does not contain a valid unique identifier and can therefore currently not be handled by the Prisma Client.'
