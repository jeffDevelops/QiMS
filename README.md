### Node, Postgres, Fastify, Next.js Monorepo

Monorepo for a Next.js project with Postgres and Fastify on the backend.

#### To start the project in dev mode
Run the following from the monorepo root:
```
yarn dev
```

Without an .env configured, the fastify app won't be able to connect to a database before
starting. Use the committed .env.example as a template to configure this, or follow the
detailed instructions in the errors and warnings that will occur on startup.

