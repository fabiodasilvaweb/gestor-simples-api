import fastifyCors from '@fastify/cors'
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
import { createAccount } from './infra/http/auth/create-account/create-account.controller'

const app = fastify().withTypeProvider<ZodTypeProvider>()

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

app.register(createAccount)

export { app }
