import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

loadEnv()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .default('mongodb://localhost:27018/flex-calendar'),
  CORS_ORIGIN: z.string().optional(),
})

export type AppEnv = z.infer<typeof envSchema>

export const env: AppEnv = envSchema.parse(process.env)

