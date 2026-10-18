import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/infra/database/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/infra/config/env', () => ({
  env: {
    API_NAME: 'Test API',
    API_DESCRIPTION: 'Test description',
    DATABASE_URL: 'postgresql://test',
    NODE_ENV: 'test',
    SERVER_PORT: 3333,
    JWT_SECRET: 'test-secret',
  },
}))

import { app } from './app'

describe('app', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register the jwt plugin', () => {
    const token = app.jwt.sign({ sub: 'user-id' })

    expect(app.jwt.verify(token)).toMatchObject({ sub: 'user-id' })
  })

  it('should expose the openapi document with the api info', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(response.statusCode).toBe(200)
    expect(response.json().info).toMatchObject({
      title: 'Test API',
      description: 'Test description',
      version: '1.0.0',
    })
  })

  it('should document the create account route', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' })

    expect(response.json().paths['/users'].post.summary).toBe(
      'Create a new account'
    )
  })

  it('should serve the swagger ui outside production', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/' })

    expect(response.statusCode).toBe(200)
  })

  it('should enable cors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
      headers: { origin: 'http://localhost:3000' },
    })

    expect(response.headers['access-control-allow-origin']).toBe('*')
  })

  it('should create an account through the registered route', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({})

    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'John', email: 'john@example.com', password: '123456' },
    })

    expect(response.statusCode).toBe(201)
  })

  it('should use the custom error handler on validation errors', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { name: 'John' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toBe('Validation error')
  })
})
