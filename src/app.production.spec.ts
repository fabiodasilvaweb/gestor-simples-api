import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/infra/database/prisma', () => ({ prisma: {} }))
vi.mock('@/infra/config/env', () => ({
  env: {
    API_NAME: 'Test API',
    API_DESCRIPTION: 'Test description',
    DATABASE_URL: 'postgresql://test',
    NODE_ENV: 'production',
    SERVER_PORT: 3333,
    JWT_SECRET: 'test-secret',
  },
}))

describe('app in production', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should not expose the swagger ui', async () => {
    const { app } = await import('./app')
    await app.ready()

    const response = await app.inject({ method: 'GET', url: '/docs/' })

    expect(response.statusCode).toBe(404)

    await app.close()
  })
})
