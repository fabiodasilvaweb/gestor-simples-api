import { beforeEach, describe, expect, it, vi } from 'vitest'

const { PrismaPgMock, PrismaClientMock } = vi.hoisted(() => ({
  PrismaPgMock: vi.fn(),
  PrismaClientMock: vi.fn(),
}))

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: PrismaPgMock }))
vi.mock('../../generated/prisma/client', () => ({
  PrismaClient: PrismaClientMock,
}))
vi.mock('@/infra/config/env', () => ({
  env: { DATABASE_URL: 'postgresql://test' },
}))

describe('prisma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should create the client with the pg adapter and the database url', async () => {
    const { prisma } = await import('./prisma')

    expect(PrismaPgMock).toHaveBeenCalledWith({
      connectionString: 'postgresql://test',
    })
    expect(PrismaClientMock).toHaveBeenCalledWith({
      adapter: PrismaPgMock.mock.instances[0],
      log: ['query', 'error'],
    })
    expect(prisma).toBe(PrismaClientMock.mock.instances[0])
  })
})
