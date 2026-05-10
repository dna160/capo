/**
 * Run once to create the first ADMIN account.
 * Usage: pnpm db:seed-admin
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

const email = process.env.ADMIN_EMAIL ?? 'admin@storytellers.id'
const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!'
const name = process.env.ADMIN_NAME ?? 'Storytellers Admin'

const existing = await prisma.adminAccount.findUnique({ where: { email } })
if (existing) {
  console.log('Admin already exists:', email)
  process.exit(0)
}

const hash = await bcrypt.hash(password, 12)
const admin = await prisma.adminAccount.create({
  data: { email, password_hash: hash, display_name: name, role: 'ADMIN' },
})

console.log('Created admin:', admin.email, '| id:', admin.id)
process.exit(0)
