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
import { getBoards } from './get-boards.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    board: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('getBoards controller', () => {
  let app: FastifyInstance
  let token: string

  const userId = 'user-id'

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(getBoards)
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

  it('should return the boards of the current user', async () => {
    const boards = [
      { id: 'board-1', title: 'Board 1' },
      { id: 'board-2', title: 'Board 2' },
    ]
    prismaMock.board.findMany.mockResolvedValue(boards)

    const response = await app.inject({
      method: 'GET',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ boards })
  })

  it('should only query boards where the user is a member', async () => {
    prismaMock.board.findMany.mockResolvedValue([])

    await app.inject({
      method: 'GET',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(prismaMock.board.findMany).toHaveBeenCalledWith({
      select: { id: true, title: true },
      where: { members: { some: { userId } } },
    })
  })

  it('should return an empty list when the user has no boards', async () => {
    prismaMock.board.findMany.mockResolvedValue([])

    const response = await app.inject({
      method: 'GET',
      url: '/boards',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ boards: [] })
  })

  it('should return 401 when the token is missing', async () => {
    const response = await app.inject({ method: 'GET', url: '/boards' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.board.findMany).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is invalid', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/boards',
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.board.findMany).not.toHaveBeenCalled()
  })
})
