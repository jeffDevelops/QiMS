import fs from 'fs'
import path from 'path'

/**
 * Write true or false to stdout depending on the dev team's preferences for this
 * project (or the lack thereof).
 */
;(() => {
  const PREFERENCES_PATH = path.join(
    __dirname,
    '../../services/server/.qi/preferences.json',
  )

  if (fs.existsSync(PREFERENCES_PATH)) {
    const preferences = JSON.parse(fs.readFileSync(PREFERENCES_PATH).toString())

    if (preferences.hasOptedOutOfAdministrativeUserTable) {
      console.log(true)
    } else {
      console.log(false)
    }
  } else {
    console.log(false)
  }
})()
