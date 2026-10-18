import { compare } from 'bcryptjs'
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
import { createAccount } from './create-account.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('createAccount controller', () => {
  let app: FastifyInstance

  const validBody = {
    name: 'John Doe',
    email: 'john@example.com',
    password: '123456',
  }

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(createAccount)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should create an account and return 201', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({})

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: validBody.email },
    })
    expect(prismaMock.user.create).toHaveBeenCalledOnce()
  })

  it('should store a hashed password instead of the plain one', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({})

    await app.inject({ method: 'POST', url: '/users', payload: validBody })

    const { data } = prismaMock.user.create.mock.calls[0][0]

    expect(data.name).toBe(validBody.name)
    expect(data.email).toBe(validBody.email)
    expect(data.passwordHash).not.toBe(validBody.password)
    expect(await compare(validBody.password, data.passwordHash)).toBe(true)
  })

  it('should return 400 when e-mail is already in use', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-id' })

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: validBody,
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({
      message: 'User with same e-mail already exists.',
    })
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('should return 400 when e-mail is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { ...validBody, email: 'invalid-email' },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('should return 400 when password has less than 6 characters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { ...validBody, password: '12345' },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('should return 400 when name is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: validBody.email, password: validBody.password },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })
})
