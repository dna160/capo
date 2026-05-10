import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import { ActorType } from '@prisma/client'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function adminAuthRoutes(app: FastifyInstance) {
  app.post('/admin/auth/login', async (req, reply) => {
    const body = loginBody.safeParse(req.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'Invalid credentials format', data: null })

    const { email, password } = body.data

    const admin = await prisma.adminAccount.findUnique({
      where: { email, deleted_at: null },
    })

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      return reply.code(401).send({ success: false, error: 'Invalid email or password', data: null })
    }

    const jwt = app.jwt.sign(
      { sub: admin.id, role: admin.role, email: admin.email },
      { expiresIn: '8h' }
    )

    await writeAudit({
      actorId: admin.id,
      actorType: ActorType.ADMIN,
      eventType: 'ADMIN_LOGIN',
      payload: { email: admin.email, role: admin.role },
      ip: req.ip,
    })

    return reply.send({
      success: true,
      data: { jwt, admin_id: admin.id, role: admin.role, display_name: admin.display_name },
      error: null,
    })
  })
}
