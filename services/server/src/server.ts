import { fastify, FastifyInstance } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import { QueryResult } from 'pg'
import { pg } from './connection'
import env from './env'
import { log, Colors } from './utils/log'

const server: FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify()

server.get('/api/health', async (request, response) => {
  response.statusCode = 200
  return response.serialize({
    message: 'System is operational',
  })
})

pg.query('SELECT NOW()', (error: Error, res: QueryResult) => {
  if (!error) {
    log('Successfully connected to the database!', Colors.SUCCESS)
    server.listen(env.BACKEND_PORT, (error, address) => {
      if (error) {
        console.error(error)
        process.exit(1)
      }

      console.log(`
💡 Backend server running on ${env.BACKEND_PORT}.
        
To change the port number, reconfigure BACKEND_PORT in services/server/.env
      `)
    })
  }
})
