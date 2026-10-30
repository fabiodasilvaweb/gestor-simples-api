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
import { deleteBoard } from './delete-board.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    board: {
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('deleteBoard controller', () => {
  let app: FastifyInstance
  let token: string

  const userId = 'user-id'
  const boardId = 'board-id'

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(deleteBoard)
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

  it('should delete the board and return 204', async () => {
    prismaMock.board.deleteMany.mockResolvedValue({ count: 1 })

    const response = await app.inject({
      method: 'DELETE',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
  })

  it('should only delete boards where the user is a member', async () => {
    prismaMock.board.deleteMany.mockResolvedValue({ count: 1 })

    await app.inject({
      method: 'DELETE',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(prismaMock.board.deleteMany).toHaveBeenCalledWith({
      where: { id: boardId, members: { some: { userId } } },
    })
  })

  it('should return 204 even when no board matches', async () => {
    prismaMock.board.deleteMany.mockResolvedValue({ count: 0 })

    const response = await app.inject({
      method: 'DELETE',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(204)
  })

  it('should return 401 when the token is missing', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/boards/${boardId}`,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.board.deleteMany).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is invalid', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/boards/${boardId}`,
      headers: { authorization: 'Bearer invalid-token' },
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.board.deleteMany).not.toHaveBeenCalled()
  })
})
