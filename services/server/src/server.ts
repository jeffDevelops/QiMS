import 'reflect-metadata'
import { Server, IncomingMessage, ServerResponse } from 'http'
import { fastify, FastifyInstance } from 'fastify'
import mercurius from 'mercurius'
import { buildSchema } from 'type-graphql'
import open from 'open'

import { establishConnection } from './connection'
import { generateEnv } from './env'
import { Colors, log } from './utils/log'
import { generateCache } from './cache'
import { Preferences } from './utils/Preferences'
import { displayTitleCard } from './utils/titleCard'

import { CustomNodeJsGlobal } from './types/Global'

// Allow global.resolvers to persist across reloads in development
declare const global: CustomNodeJsGlobal

  /**
   * MAIN
   */
;(async () => {
  displayTitleCard()
  await generateCache()
  global.env = generateEnv()
  await establishConnection()

  if (!global.resolvers) {
    /**@ts-ignore Once Prisma generate has been called in establishConnection, dynamically import the generated module */
    const { resolvers } = await import('./generated/type-graphql')
    global.resolvers = resolvers
  }

  const schema = await buildSchema({
    resolvers: global.resolvers,
    validate: false,
  })

  const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify()
  app.register(mercurius, {
    schema,
    graphiql: 'playground',
  })

  app.listen(global.env.BACKEND_PORT, (error) => {
    if (error) {
      console.error(error)
      process.exit(1)
    }

    if (process.env.NODE_ENV === 'development') {
      open('http://localhost:8888/playground')
    }

    log(
      `--------------------------------------------------
💡 Backend server running on http://localhost:${global.env.BACKEND_PORT}
--------------------------------------------------\n`,
      Colors.SUCCESS,
    )
    log(`🌐 Interact with your data at http://localhost:8888/graphql \n`)
    log(`🔍 Open the GraphQL Playground at http://localhost:8888/playground \n`)
    log(`To change the port number, reconfigure BACKEND_PORT in services/server/.env \n`)
  })
})()

/**
 * EXIT HANDLER
 */
process.on('exit', () => {
  /** Reset ephemeral state values in preferences */
  const preferences = Preferences.getPreferences()

  // ... reset additional ephemeral values here

  Preferences.setPreferences(preferences)

  if (process.exitCode === 0) {
    log('✌️')
  }
})
