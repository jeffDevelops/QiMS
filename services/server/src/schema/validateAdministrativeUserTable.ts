import fs from 'fs'
import path from 'path'
import { prompt } from 'inquirer'
import { Colors, log } from '../utils/log'
import { Preferences } from '../utils/Preferences'
import { PRISMA_MISSING_PRIMARY_KEY_COMMENT } from '../config/constants'

const MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME =
  'MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME'

enum MissingQiAdministratorsModelQuestionAnswers {
  CreateTable = `Create qi_administrators Table`,
  OptOut = 'Opt Out',
}

export const validateAdministrativeUserTable = async () => {
  if (Preferences.getPreferences().hasOptedOutOfAdministrativeUserTable) return

  const schema = fs
    .readFileSync(path.join(__dirname, '../../src/prisma/schema.prisma'))
    .toString()

  const qiAdministratorsModel = schema
    .split('\n\n')
    .find((modelBlock) => modelBlock.match(/^model qi_administrators {$/m))

  if (!qiAdministratorsModel) {
    logMissingAdministrativeUserTableWarning()

    await prompt({
      default: 0,
      type: 'rawlist',
      name: MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME,
      message: 'How would you like to handle this?',
      choices: [
        MissingQiAdministratorsModelQuestionAnswers.CreateTable,
        MissingQiAdministratorsModelQuestionAnswers.OptOut,
      ],
    }).then(({ MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME }) => {
      console.log(MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME)

      /** Handle opt out */
      if (
        MISSING_QI_ADMINISTRATOR_MODEL_QUESTION_NAME ===
        MissingQiAdministratorsModelQuestionAnswers.OptOut
      ) {
        /** Write the opt out action to preferences, so users aren't asked again */
        const preferences = Preferences.getPreferences()
        Preferences.setPreferences({
          ...preferences,
          hasOptedOutOfAdministrativeUserTable: true,
        })

        /** Acknowledge the user's decision and return early */
        logOptOutMessage()
      }
    })
  }

  /**
   * If qi_administrators table isn't present, ask whether the user wants to:
   *
   * 1) opt out of administrative users (qiMS serves to code-gen the GraphQL API only), or...
   *    - Write the opt-out to QiPreferences.hasOptedOutOfAdministrativeUserTable
   *
   * 2) write and run a migration against the database to create it
   */

  /**
   * Validate the qi_administrators schema
   * 1) Has primary key field id
   * 2) Has optional first_name field
   * 3) Has optional last_name field
   * 4) Has required email field
   * 5) Has required password field
   * 6) Has required is_locked_out field
   */

  /**
   * If invalid, disclose the schema invalidity to the user, and ask whether the user
   * wants to
   *
   * 1) opt out of administrative users (qiMS serves to code-gen the GraphQL API only),
   * 2) fix it manually, or
   * 3) have qiMS try to fix it with a migration automatically.
   */
}

const validateQiAdministratorsSchema = (model: string) => {}

const logMissingAdministrativeUserTableWarning = () => {
  log(
    `
qiMS' administrative UI requires a table called qi_administrators to manage
administrative users that will use qiMS to make changes to the database
schema or to manage content (if so authorized).

You can either:

  1) [Recommended] Allow qiMS to write and run a migration on your behalf
  to create a qi_administrators table within the connected database.
    - Once created, you and any users you authorize are free to customize
      this table beyond the columns that qiMS needs to operate properly.
    - Once created, you'll be able to log in as an administrator in the
      admin UI when it launches.

- OR -

  2) Do nothing and opt out of qiMS' administrative functionality. This
  selection comes with considerably limiting implications:
    - qiMS will still be reactive to schema changes on launch, and it
      will still generate a GraphQL API, but it will not expose any means
      to modify the database schema.
    - qiMS' admin UI will be disabled, and nobody will be able to use it
      to make schema changes or manage content.
  `,
    Colors.WARN,
  )
}

const logOptOutMessage = () => {
  log(`
Noted! qiMS won't ask about this again.

You can change this preference in:

services/server/.qi/preferences.json#hasOptedOutOfAdministrativeUserTable. 
 
If you do, you'll get this series of prompts again, and you'll be able to
permit qiMS to create the qi_administrators table.
  `)
}
