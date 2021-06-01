/**
 * Project-level preferences; for best team development experience,
 * should be checked into version control
 */
export interface QiPreferences {
  /**
   * An array of model names.
   *
   * On startup, the user is asked about models that don't have primary keys, because
   * Prisma requires unique identifiers on each row. This list represents all of the
   * models that the user has skipped, so that the CLI doesn't ask about them again.
   * The user may elect to surface skipped models in the UI.
   */
  unsurfacedModels: string[]

  /**
   * Whether the user has opted out of adding the administrative user table `qi_administrators`.
   * Opting out of adding this table to the connected database disables the Admin Client
   */
  hasOptedOutOfAdministrativeUserTable: boolean
}
