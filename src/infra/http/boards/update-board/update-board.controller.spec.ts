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
import { updateBoard } from './update-board.controller'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    board: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))

describe('updateBoard controller', () => {
  let app: FastifyInstance
  let token: string

  const userId = 'user-id'
  const boardId = 'board-id'
  const validBody = { title: 'New title' }

  beforeAll(async () => {
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler(errorHandler)
    app.register(fastifyJwt, { secret: 'test-secret' })
    app.register(updateBoard)
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

  it('should update the board and return 201', async () => {
    prismaMock.board.updateMany.mockResolvedValue({ count: 1 })

    const response = await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
  })

  it('should only update boards where the user is a member', async () => {
    prismaMock.board.updateMany.mockResolvedValue({ count: 1 })

    await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: validBody,
    })

    expect(prismaMock.board.updateMany).toHaveBeenCalledWith({
      where: { id: boardId, members: { some: { userId } } },
      data: { title: validBody.title },
    })
  })

  it('should return 201 even when no board matches', async () => {
    prismaMock.board.updateMany.mockResolvedValue({ count: 0 })

    const response = await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
  })

  it('should return 400 when title is missing', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    expect(prismaMock.board.updateMany).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is missing', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      payload: validBody,
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ message: 'Invalid token' })
    expect(prismaMock.board.updateMany).not.toHaveBeenCalled()
  })

  it('should return 401 when the token is invalid', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/boards/${boardId}`,
      headers: { authorization: 'Bearer invalid-token' },
      payload: validBody,
    })

    expect(response.statusCode).toBe(401)
    expect(prismaMock.board.updateMany).not.toHaveBeenCalled()
  })
})
