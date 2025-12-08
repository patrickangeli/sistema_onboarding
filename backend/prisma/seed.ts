import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando o seed...')

  // 1. Limpa o banco para não duplicar dados se rodar duas vezes
  await prisma.answer.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.questionOption.deleteMany()
  await prisma.question.deleteMany()
  await prisma.phase.deleteMany()
  await prisma.onboardingProcess.deleteMany()

  // 2. Cria o Processo Principal
  const process = await prisma.onboardingProcess.create({
    data: {
      title: 'Admissão TI - Padrão',
      description: 'Fluxo de onboarding para desenvolvedores',
    }
  })

  // 3. Cria Fase 1: Dados Pessoais
  await prisma.phase.create({
    data: {
      title: 'Dados Pessoais',
      order: 1,
      processId: process.id,
      questions: {
        create: [
          {
            label: 'Nome Completo',
            type: 'TEXT',
            order: 1,
            required: true
          },
          {
            label: 'Data de Nascimento',
            type: 'DATE',
            order: 2,
            required: true
          },
          {
            label: 'Gênero',
            type: 'SELECT',
            order: 3,
            required: true,
            options: {
              create: [
                { label: 'Masculino', value: 'M', order: 1 },
                { label: 'Feminino', value: 'F', order: 2 },
                { label: 'Outro', value: 'O', order: 3 }
              ]
            }
          }
        ]
      }
    }
  })

  // 4. Cria Fase 2: Documentação (Uploads)
  await prisma.phase.create({
    data: {
      title: 'Documentação',
      order: 2,
      processId: process.id,
      questions: {
        create: [
          {
            label: 'Foto do RG',
            type: 'FILE',
            order: 1,
            required: true
          },
          {
            label: 'Comprovante de Residência',
            type: 'FILE',
            order: 2,
            required: true
          }
        ]
      }
    }
  })

  console.log('Banco populado com sucesso!')
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