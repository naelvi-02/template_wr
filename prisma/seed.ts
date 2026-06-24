import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';

  const hashedPassword = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword
    },
    create: {
      username,
      password: hashedPassword,
    },
  })
  
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
