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
import { createBoard } from './create-board.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    board: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('createBoard controller', () => {
  let app: FastifyInstance
  let token: string

  const userId = 'user-id'
  const validBody = { title: 'My board' }

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(createBoard)
    await app.ready()

    token = app.jwt.sign({ sub: userId })
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should create a board and return 201', async () => {
    prismaMock.board.create.mockResolvedValue({})

    const response = await app.inject({
      method: 'POST',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    expect(prismaMock.board.create).toHaveBeenCalledOnce()
  })

  it('should add the current user as ADMIN member of the board', async () => {
    prismaMock.board.create.mockResolvedValue({})

    await app.inject({
      method: 'POST',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
      payload: validBody,
    })

    expect(prismaMock.board.create).toHaveBeenCalledWith({
      data: {
        title: validBody.title,
        members: {
          create: { role: 'ADMIN', userId },
        },
      },
    })
  })

  it('should return 400 when title is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.board.create).not.toHaveBeenCalled()
  })

  it('should return 400 when title is not a string', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 123 },
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.board.create).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/boards',
      payload: validBody,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.board.create).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/boards',
      headers: { authorization: 'Bearer invalid-token' },
      payload: validBody,
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.board.create).not.toHaveBeenCalled()
  })
})
