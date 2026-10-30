import type { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'
import { prisma } from '@/infra/database/prisma'
import { UnauthorizedError } from '@/shared/errors/unauthorized-error'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async request => {
    request.getCurrentUserId = async () => {
      try {
        const { sub } = await request.jwtVerify<{ sub: string }>()

        return sub
      } catch {
        throw new UnauthorizedError('Invalid token')
      }
    }
    request.getUserMembership = async (boardId: string) => {
      const userId = await request.getCurrentUserId()

      const member = await prisma.member.findFirst({
        where: {
          userId,
          board: {
            id: boardId,
          },
        },
        include: {
          board: true,
        },
      })

      if (!member) {
        throw new UnauthorizedError(`You're not a member of this board.`)
      }

      const { board, ...membership } = member

      return {
        board,
        membership,
      }
    }
  })
})
