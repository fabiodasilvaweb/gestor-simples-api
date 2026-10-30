import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/infra/database/prisma'
import { auth } from '@/infra/middlewares/auth/auth.middleware'
export async function getBoards(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/boards',
      {
        schema: {
          tags: ['Boards'],
          summary: 'Get all boards for the current user',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              boards: z.array(
                z.object({
                  id: z.string(),
                  title: z.string(),
                })
              ),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const boards = await prisma.board.findMany({
          select: {
            id: true,
            title: true,
          },
          where: {
            members: {
              some: {
                userId: userId,
              },
            },
          },
        })

        return reply.status(200).send({ boards })
      }
    )
}
