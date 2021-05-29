export interface Migration {
  migrationCreated: boolean
  /**
   * Because migration files are executed in order they're created,
   * and this order is inferred by the index prepending the filename
   * it's impossible to know what the file name will be until the
   * MigrationManager creates it.
   */
  fileName: string
}
