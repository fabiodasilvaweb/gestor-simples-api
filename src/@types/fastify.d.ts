import 'fastify'

declare module 'fastify' {
  export interface FastifyRequest {
    getCurrentUserId(): Promise<string>
    getUserMembership(
      boardId: string
    ): Promise<{ board: Board; membership: Member }>
  }
}
