export interface QiPreferences {
  /** Whether the first-time startup welcome message has been presented */
  hasWelcomedDeveloperUser: boolean
  /** Whether the user has been warned about the different development experience involved in making the database schema the single source of truth */
  shouldNotWarnAboutDestructiveChangesAgain: boolean
}
