import fs from 'fs'
import inquirer from 'inquirer'
import { execSync } from 'child_process'
import { log, Colors } from './utils/log'
import { Preferences } from './utils/Preferences'

/** Generates a filesystem cache of the developer's preferences when using qiMS */
export const generateCache = async () => {
  if (!fs.existsSync('./.qi')) fs.mkdirSync('./.qi')
  if (!fs.existsSync('./.qi/preferences.json'))
    fs.writeFileSync(
      './.qi/preferences.json',
      `
{
  "shouldNotWarnAboutDestructiveChangesAgain": false,
  "hasWelcomedDeveloperUser": false
}
  `,
    )

  if (Preferences.getPreferences().hasWelcomedDeveloperUser) return

  log(`qiMS takes a slightly different approach than you might be used to when
it comes to application development: 

😌 The database schema is the single source of truth for the way your
data is represented.

🔥 When you give qiMS access to a Postgres database, it creates a GraphQL
API you can consume to create, read, update, and delete records in that
database!

💻 It also gives you an admin user interface to define new entities and
relationships.
    `)

  log(
    `⚠️  NOTE: Doing so actually migrates the database to the new schema you
define in the UI, meaning that CHANGES ARE POTENTIALLY DESTRUCTIVE to
the existing database you're connecting to. If any additional
applications consume this data, you will likely be breaking those
applications!

If you'd like to try qiMS with an existing dataset, we'd recommend either

1) Schema Readonly Mode, which disables the ability to migrate the database, or
2) making a copy of the existing database by restoring an empty database with a
dump from the one you'd like to experiment with.
`,
    Colors.WARN,
  )

  const preferences = Preferences.getPreferences()
  preferences.hasWelcomedDeveloperUser = true
  Preferences.setPreferences(preferences)

  if (!Preferences.getPreferences().shouldNotWarnAboutDestructiveChangesAgain) {
    /**
     * DESTRUCTIVE CHANGES WARNING PROMPT
     */
    const destructiveChangesPrompt = {
      type: 'rawlist',
      name: `I understand that qiMS migrates existing data, mutating the database
schema and potentially breaking other applications that consume it (use arrow
keys and Return key to select, or select a number)`,
      default: 0,
      choices: [
        'I acknowledge that qiMS gives me the power to make destructive changes.',
        "I acknowledge, and would prefer that you don't warn me again.",
        "I don't want to proceed.",
      ],
    }
    const destructiveChangesInquirerResult = await inquirer.prompt([
      destructiveChangesPrompt,
    ])
    const destructiveChangesResponse = Object.values(destructiveChangesInquirerResult)[0]

    if (destructiveChangesResponse === destructiveChangesPrompt.choices[2]) {
      /** Clean the .qi directory, so that the user starts fresh when they start the process again */
      execSync('yarn run qi:clean')

      log(`
Thanks for trying qiMS!\n
        `)
      return process.exit(0)
    } else if (destructiveChangesResponse === destructiveChangesPrompt.choices[1]) {
      /** Persist the warning preference in the .qi cache */
      const preferences = Preferences.getPreferences()

      /** 2) Write the new preference value... */
      preferences.shouldNotWarnAboutDestructiveChangesAgain = true
      Preferences.setPreferences(preferences)

      log(`\n✅  Okay, noted. We won't bother you again with this warning.\n`)
    }
  }

  if (!Preferences.getPreferences().useCase) {
    /**
     * USE CASE PROMPT
     */
    log(`qiMS has several use cases:

-----------------------
1) Schema Readonly Mode
-----------------------
For this use case, qiMS disables schema revision and will never migrate
the database. The qiMS admin UI performs the same as it would in
production--only content / data can be managed, and revisions to models
and relationships are not made available to anyone.

This option is good for adding non-technical administrative functionality
to existing systems, or migrating existing client applications to
GraphQL networking implementations.

-------------
2) Greenfield
-------------
This is where you get to harness the full power of the qiMS admin UI.

💻 It also gives you an admin user interface to define new entities and
relationships.
    `)
  }
}
