
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.employee.count();
  console.log(`Total employees: ${count}`);
  const employees = await prisma.employee.findMany();
  console.log(employees);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
