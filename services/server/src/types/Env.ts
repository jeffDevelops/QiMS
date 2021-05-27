export type Env =
  | {
      BACKEND_PORT: number
      DATABASE_USER: string
      DATABASE_PASSWORD: string | undefined
      DATABASE_HOST: string
      DATABASE_PORT: number
      DATABASE_NAME: string
      DATABASE_URL?: string
    }
  | {
      BACKEND_PORT: number
      DATABASE_URL: string
    }
