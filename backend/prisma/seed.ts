import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const masterPw = await bcrypt.hash('master123', 10);
  const clientPw = await bcrypt.hash('client123', 10);

  await prisma.user.upsert({
    where: { email: 'master@startflow.com' },
    update: {},
    create: {
      email: 'master@startflow.com',
      password: masterPw,
      name: 'Master Admin',
      role: 'master',
    },
  });

  await prisma.user.upsert({
    where: { email: 'cliente@startflow.com' },
    update: {},
    create: {
      email: 'cliente@startflow.com',
      password: clientPw,
      name: 'Cliente Exemplo',
      role: 'client',
    },
  });

  console.log('Seed concluído:');
  console.log('  master@startflow.com / master123 (role: master)');
  console.log('  cliente@startflow.com / client123 (role: client)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
