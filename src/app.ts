import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUI from '@fastify/swagger-ui'
import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from '@/infra/config/env'
import { errorHandler } from '@/shared/errors/error-handler'
import { authenticationWithPassword } from './infra/http/auth/authentication-with-password/authentication-with-password.controller'
import { createAccount } from './infra/http/auth/create-account/create-account.controller'
import { getProfile } from './infra/http/auth/get-profile/get-profile.controller'

const envToLogger = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: true,
  test: false,
}

const app = fastify({
  logger: envToLogger[env.NODE_ENV],
}).withTypeProvider<ZodTypeProvider>()

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.setErrorHandler(errorHandler)

app.register(fastifySwagger, {
  openapi: {
    servers: [
      {
        url: `http://localhost:${env.SERVER_PORT}/`,
        description: 'DEV',
      },
    ],
    info: {
      title: env.API_NAME,
      description: env.API_DESCRIPTION,
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  transform: jsonSchemaTransform,
})

if (env.NODE_ENV !== 'production') {
  app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
  })
}

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
})

app.register(fastifyCors)
app.register(fastifyHelmet)

app.register(createAccount)
app.register(authenticationWithPassword)
app.register(getProfile)

export { app }
