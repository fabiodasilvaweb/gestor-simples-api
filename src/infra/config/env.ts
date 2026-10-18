import { z } from 'zod'

export const envSchema = z.object({
  API_NAME: z.string(),
  API_DESCRIPTION: z.string(),
  DATABASE_URL: z.string(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SERVER_PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string(),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)
