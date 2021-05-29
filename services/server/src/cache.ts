import fs from 'fs'

/** Generates a filesystem cache of the developer's preferences when using qiMS */
export const generateCache = async () => {
  if (!fs.existsSync('./.qi')) fs.mkdirSync('./.qi')
  if (!fs.existsSync('./.qi/preferences.json'))
    fs.writeFileSync('./.qi/preferences.json', `{}`)
}
