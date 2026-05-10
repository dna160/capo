import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
} from 'node:crypto'
import { env } from '../env.js'

const KEY = Buffer.from(env.AES_KEY, 'hex')
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

export function encryptCode(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptCode(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + env.HMAC_SECRET).digest('hex')
}

export function hashSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function verifyHmac(cartonUid: string, signature: string): boolean {
  const expected = createHmac('sha256', env.HMAC_SECRET).update(cartonUid).digest('hex')
  return expected === signature
}

export function generateRandomSeed(): string {
  return randomBytes(32).toString('hex')
}
