import fs from 'fs'
import { QiPreferences } from './types/QiPreferences'

/**
 * Generates a filesystem cache of the development team's
 * preferences when using qiMS
 */
export const generateCache = () => {
  if (!fs.existsSync('./.qi')) fs.mkdirSync('./.qi')

  if (!fs.existsSync('./.qi/preferences.json')) {
    const qiPreferences: QiPreferences = {
      unsurfacedModels: [],
    }

    fs.writeFileSync('./.qi/preferences.json', JSON.stringify(qiPreferences))
  }
}
