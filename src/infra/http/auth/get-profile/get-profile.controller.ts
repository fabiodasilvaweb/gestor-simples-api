import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { prisma } from '@/infra/database/prisma'
import { auth } from '@/infra/middlewares/auth/auth.middleware'
import { BadRequestError } from '@/shared/errors/bad-request-error'

export async function getProfile(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/profile',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Get the profile of the authenticated user',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              profile: z.object({
                id: z.string(),
                name: z.string(),
                email: z.email(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const userId = await request.getCurrentUserId()

        const user = await prisma.user.findUnique({
          select: {
            id: true,
            name: true,
            email: true,
          },
          where: {
            id: userId,
          },
        })

        if (!user) {
          throw new BadRequestError('User not found.')
        }

        return reply.status(200).send({
          profile: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
      }
    )
}
