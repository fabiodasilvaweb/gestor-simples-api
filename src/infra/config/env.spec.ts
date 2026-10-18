import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const validEnv = {
  API_NAME: 'Test API',
  API_DESCRIPTION: 'Test description',
  DATABASE_URL: 'postgresql://test',
  JWT_SECRET: 'test-secret',
}

describe('env', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function stubEnv(values: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(values)) {
      vi.stubEnv(key, value)
    }
  }

  it('should parse valid environment variables', async () => {
    stubEnv({ ...validEnv, NODE_ENV: 'production', SERVER_PORT: '4000' })

    const { env } = await import('./env')

    expect(env).toMatchObject({
      ...validEnv,
      NODE_ENV: 'production',
      SERVER_PORT: 4000,
    })
  })

  it('should apply default values for SERVER_PORT', async () => {
    stubEnv({ ...validEnv, NODE_ENV: 'test' })
    delete process.env.SERVER_PORT

    const { env } = await import('./env')

    expect(env.SERVER_PORT).toBe(3333)
  })

  it('should apply development as default NODE_ENV', async () => {
    stubEnv(validEnv)
    delete process.env.NODE_ENV

    const { env } = await import('./env')

    expect(env.NODE_ENV).toBe('development')
  })

  it('should throw when a required variable is missing', async () => {
    stubEnv({ ...validEnv, NODE_ENV: 'test' })
    delete process.env.JWT_SECRET

    await expect(import('./env')).rejects.toThrow()
  })

  it('should throw when NODE_ENV is invalid', async () => {
    stubEnv({ ...validEnv, NODE_ENV: 'staging' })

    await expect(import('./env')).rejects.toThrow()
  })
})
