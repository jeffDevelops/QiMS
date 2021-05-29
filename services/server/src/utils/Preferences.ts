import fs from 'fs'
import { QiPreferences } from '../types/QiPreferences'

export abstract class Preferences {
  /**
   * Gets the current .qi/preferences.json value
   */
  static getPreferences = (): QiPreferences =>
    JSON.parse(fs.readFileSync('./.qi/preferences.json', 'utf-8'))

  /**
   *  Overwrites the .qi/preferences.json with a new value.
   */
  static setPreferences = (preferences: QiPreferences) => {
    fs.writeFileSync(
      './.qi/preferences.json',
      Buffer.from(JSON.stringify(preferences, null, 2)),
    )
  }
}
