import { PrismaClient, type Prisma } from '@prisma/client'

export const db = new PrismaClient()

export type Tx = Prisma.TransactionClient
