import fastifyJwt from '@fastify/jwt'
import { hash } from 'bcryptjs'
import fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
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
import { errorHandler } from '@/shared/errors/error-handler'
import { authenticationWithPassword } from './authentication-with-password.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('authenticationWithPassword controller', () => {
  let app: FastifyInstance
  let user: { id: string; email: string; passwordHash: string }

  const validBody = {
    email: 'john@example.com',
    password: '123456',
  }

  beforeAll(async () => {
    user = {
      id: 'user-id',
      email: validBody.email,
      passwordHash: await hash(validBody.password, 4),
    }

    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(authenticationWithPassword)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should authenticate with password and return 200 with a token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: validBody,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ token: expect.any(String) })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: validBody.email },
    })
  })

  it('should sign a token with the user id as subject expiring in 7 days', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: validBody,
    })

    const payload = app.jwt.verify<{ sub: string; iat: number; exp: number }>(
      response.json().token
    )

    expect(payload.sub).toBe(user.id)
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60)
  })

  it('should return 400 when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: validBody,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      message: 'User with this e-mail does not exist.',
    })
  })

  it('should return 400 when password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)

    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { ...validBody, password: 'wrong-password' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'Invalid password.' })
  })

  it('should return 400 when e-mail is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { ...validBody, email: 'invalid-email' },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('should return 400 when password has less than 6 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { ...validBody, password: '12345' },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('should return 400 when password is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sessions/password',
      payload: { email: validBody.email },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})
