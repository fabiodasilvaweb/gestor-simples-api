import { env } from '@/infra/config/env'
import { app } from './app'

app.listen({ port: env.SERVER_PORT, host: '0.0.0.0' }).then(() => {
  console.log('HTTP server running!')
})
