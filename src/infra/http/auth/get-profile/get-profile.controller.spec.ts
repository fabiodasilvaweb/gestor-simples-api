import fastifyJwt from '@fastify/jwt'
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
import { getProfile } from './get-profile.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('getProfile controller', () => {
  let app: FastifyInstance

  const user = {
    id: 'user-id',
    name: 'John Doe',
    email: 'john@example.com',
  }

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(getProfile)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should return the profile of the authenticated user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    const token = app.jwt.sign({ sub: user.id })

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ profile: user })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true },
      where: { id: user.id },
    })
  })

  it('should return 400 when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const token = app.jwt.sign({ sub: 'unknown-id' })

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ message: 'User not found.' })
  })

  it('should return 401 when the token is missing', async () => {
    const response = await app.inject({ method: 'GET', url: '/profile' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is invalid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is signed with another secret', async () => {
    const other = fastify()
    await other.register(fastifyJwt, { secret: 'other-secret' })
    await other.ready()
    const token = other.jwt.sign({ sub: user.id })
    await other.close()

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })
})
