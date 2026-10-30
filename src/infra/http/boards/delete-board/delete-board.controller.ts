import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/infra/database/prisma'
import { auth } from '@/infra/middlewares/auth/auth.middleware'
export async function deleteBoard(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/boards/:id',
      {
        schema: {
          tags: ['Boards'],
          summary: 'Delete a board by ID',
          security: [{ bearerAuth: [] }],
          params: z.object({
            id: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const userId = await request.getCurrentUserId()

        await prisma.board.deleteMany({
          where: {
            id: id,
            members: {
              some: {
                userId: userId,
              },
            },
          },
        })

        return reply.status(204).send()
      }
    )
}
