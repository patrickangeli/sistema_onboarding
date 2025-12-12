import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Iniciando o Seed...")

  // 1. LIMPEZA (A ordem importa por causa das chaves estrangeiras)
  // Deletamos primeiro quem depende dos outros
  await prisma.document.deleteMany()
  await prisma.address.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.employee.deleteMany() // Moved up
  await prisma.option.deleteMany()  // Agora chama Option, não QuestionOption
  await prisma.question.deleteMany()
  await prisma.phase.deleteMany()
  await prisma.onboardingProcess.deleteMany()

  console.log("Banco limpo!")

  // 2. CRIAÇÃO DO PROCESSO PADRÃO
  const process = await prisma.onboardingProcess.create({
    data: {
      title: 'Admissão TI - Padrão',
      description: 'Fluxo de onboarding para desenvolvedores',
      phases: {
        create: [
          // FASE 1: DADOS PESSOAIS
          // (O Frontend vai injetar o formulário de Endereço aqui automaticamente)
          {
            title: 'Dados Pessoais',
            order: 1,
            questions: {
              create: [
                { label: 'Nome Completo', type: 'TEXT', order: 1, required: true },
                { label: 'Data de Nascimento', type: 'DATE', order: 2, required: true },
                { 
                  label: 'Gênero', type: 'SELECT', order: 3, required: true,
                  options: {
                    create: [
                      { label: 'Masculino', value: 'M', order: 1 },
                      { label: 'Feminino', value: 'F', order: 2 },
                      { label: 'Prefiro não dizer', value: 'NB', order: 3 }
                    ]
                  }
                },
                { label: 'Estado Civil', type: 'TEXT', order: 4, required: false }
              ]
            }
          },
          // FASE 2: DOCUMENTAÇÃO (Uploads)
          {
            title: 'Documentação',
            order: 2,
            questions: {
              create: [
                { label: 'Foto do RG (Frente e Verso)', type: 'FILE', order: 1, required: true },
                { label: 'Comprovante de Residência', type: 'FILE', order: 2, required: true }
              ]
            }
          },
          // FASE 3: SETUP TI (Interno)
          /*
          {
            title: 'Setup de Acessos',
            order: 3,
            questions: {
              create: [
                { label: 'E-mail Corporativo Criado?', type: 'SELECT', order: 1, required: true,
                  options: { create: [{ label: 'Sim', value: 'YES', order: 1 }, { label: 'Não', value: 'NO', order: 2 }] } 
                }
              ]
            }
          }
          */
        ]
      }
    }
  })

  console.log("Seed concluído com sucesso!")
  console.log("\n========================================")
  console.log("COPIE ESTE NOVO ID PARA O FRONTEND:")
  console.log(process.id)
  console.log("========================================\n")
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