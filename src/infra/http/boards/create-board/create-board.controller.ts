import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/infra/database/prisma'
import { auth } from '@/infra/middlewares/auth/auth.middleware'
export async function createBoard(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .post(
      '/boards',
      {
        schema: {
          tags: ['Boards'],
          summary: 'Create a new board',
          security: [{ bearerAuth: [] }],
          body: z.object({
            title: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const { title } = request.body
        const userId = await request.getCurrentUserId()

        await prisma.board.create({
          data: {
            title,
            members: {
              create: {
                role: 'ADMIN',
                userId: userId,
              },
            },
          },
        })

        return reply.status(201).send()
      }
    )
}
