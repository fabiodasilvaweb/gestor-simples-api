import fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { z } from 'zod'
import { BadRequestError } from './bad-request-error'
import { errorHandler } from './error-handler'
import { ForbiddenError } from './forbidden-error'
import { NotFoundError } from './not-found-error'
import { UnauthorizedError } from './unauthorized-error'

describe('errorHandler', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)

    app.get('/bad-request', async () => {
      throw new BadRequestError('Bad request message')
    })
    app.get('/unauthorized', async () => {
      throw new UnauthorizedError('Unauthorized message')
    })
    app.get('/forbidden', async () => {
      throw new ForbiddenError('Forbidden message')
    })
    app.get('/not-found', async () => {
      throw new NotFoundError('Not found message')
    })
    app.get('/zod-error', async () => {
      z.object({ name: z.string() }).parse({})
    })
    app.get('/unknown', async () => {
      throw new Error('boom')
    })
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/schema',
        { schema: { querystring: z.object({ page: z.coerce.number() }) } },
        async () => ({})
      )

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['/bad-request', 400, 'Bad request message'],
    ['/unauthorized', 401, 'Unauthorized message'],
    ['/forbidden', 403, 'Forbidden message'],
    ['/not-found', 404, 'Not found message'],
  ])('should map %s to status %i', async (url, statusCode, message) => {
    const response = await app.inject({ method: 'GET', url })

    expect(response.statusCode).toBe(statusCode)
    expect(response.json()).toEqual({ message })
  })

  it('should return 400 with field errors for a ZodError', async () => {
    const response = await app.inject({ method: 'GET', url: '/zod-error' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      message: 'Validation error',
      errors: { name: expect.any(Array) },
    })
  })

  it('should return 400 for schema validation errors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/schema?page=abc',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ message: 'Validation error' })
    expect(response.json().errors).toBeInstanceOf(Array)
  })

  it('should return 500 and log unknown errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await app.inject({ method: 'GET', url: '/unknown' })

    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ message: 'Internal server error' })
    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('custom errors', () => {
  it('should use default message on UnauthorizedError', () => {
    expect(new UnauthorizedError().message).toBe('Unauthorized.')
  })

  it('should use given message on UnauthorizedError', () => {
    expect(new UnauthorizedError('custom').message).toBe('custom')
  })

  it.each([
    ['BadRequestError', BadRequestError],
    ['ForbiddenError', ForbiddenError],
    ['NotFoundError', NotFoundError],
  ])('should keep the message on %s', (_, ErrorClass) => {
    const error = new ErrorClass('message')

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('message')
  })
})
