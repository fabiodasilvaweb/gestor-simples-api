import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/infra/database/prisma'
import { auth } from '@/infra/middlewares/auth/auth.middleware'
export async function updateBoard(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .put(
      '/boards/:id',
      {
        schema: {
          tags: ['Boards'],
          summary: 'Update a board by ID',
          security: [{ bearerAuth: [] }],
          body: z.object({
            title: z.string(),
          }),
          params: z.object({
            id: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const userId = await request.getCurrentUserId()

        const { title } = request.body

        await prisma.board.updateMany({
          where: {
            id: id,
            members: {
              some: {
                userId: userId,
              },
            },
          },
          data: {
            title,
          },
        })

        return reply.status(201).send()
      }
    )
}
