import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Iniciando o Seed...")

  // 1. LIMPEZA
  await prisma.document.deleteMany()
  await prisma.address.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.option.deleteMany()
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
                { 
                  label: 'Estado Civil', type: 'SELECT', order: 4, required: true,
                  options: {
                    create: [
                      { label: 'Solteiro(a)', value: 'SOLTEIRO', order: 1 },
                      { label: 'Casado(a)', value: 'CASADO', order: 2 },
                      { label: 'Divorciado(a)', value: 'DIVORCIADO', order: 3 },
                      { label: 'Viúvo(a)', value: 'VIUVO', order: 4 },
                      { label: 'União Estável', value: 'UNIAO_ESTAVEL', order: 5 }
                    ]
                  }
                }
              ]
            }
          },
          {
            title: 'Documentação',
            order: 2,
            questions: {
              create: [
                { label: 'Foto do RG (Frente e Verso)', type: 'FILE', order: 1, required: true },
                { label: 'Comprovante de Residência', type: 'FILE', order: 2, required: true }
              ]
            }
          }
        ]
      }
    },
    include: {
      phases: {
        include: {
          questions: true
        }
      }
    }
  })

  // IDs úteis para criar respostas
  const phase1 = process.phases.find(p => p.order === 1)!
  const phase2 = process.phases.find(p => p.order === 2)!
  
  const qNome = phase1.questions.find(q => q.label === 'Nome Completo')!
  const qNasc = phase1.questions.find(q => q.label === 'Data de Nascimento')!
  const qGenero = phase1.questions.find(q => q.label === 'Gênero')!
  const qCivil = phase1.questions.find(q => q.label === 'Estado Civil')!

  // 3. CRIAÇÃO DE CANDIDATOS FICTÍCIOS

  // Candidato 1: Aprovado
  await prisma.employee.create({
    data: {
      name: 'João da Silva',
      email: 'joao.silva@example.com',
      cpf: '46817310563',
      currentPhaseId: phase2.id, // Já passou da fase 1
      status: 'APPROVED',
      address: {
        create: {
          cep: '01001-000',
          street: 'Praça da Sé',
          number: '100',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'SP'
        }
      },
      answers: {
        create: [
          { questionId: qNome.id, value: 'João da Silva' },
          { questionId: qNasc.id, value: '1990-01-01' },
          { questionId: qGenero.id, value: 'M' },
          { questionId: qCivil.id, value: 'SOLTEIRO' }
        ]
      }
    }
  })

  // Candidato 2: Em Análise (Recém cadastrado)
  await prisma.employee.create({
    data: {
      name: 'Maria Oliveira',
      email: 'maria.oliveira@example.com',
      cpf: '33766663429',
      currentPhaseId: phase1.id,
      status: 'PENDING',
      answers: {
        create: [
          { questionId: qNome.id, value: 'Maria Oliveira' }
        ]
      }
    }
  })

  // Candidato 3: Com Correção Solicitada
  await prisma.employee.create({
    data: {
      name: 'Carlos Souza',
      email: 'carlos.souza@example.com',
      cpf: '64694298313',
      currentPhaseId: phase1.id,
      status: 'PENDING',
      feedback: 'O comprovante de residência está ilegível e o CEP parece incorreto.',
      corrections: ['address_cep', qCivil.id], // Pedindo correção do CEP e do Estado Civil
      address: {
        create: {
          cep: '00000-000', // CEP Errado
          street: 'Rua Desconhecida',
          number: '0',
          neighborhood: 'Centro',
          city: 'Cidade',
          state: 'UF'
        }
      },
      answers: {
        create: [
          { questionId: qNome.id, value: 'Carlos Souza' },
          { questionId: qNasc.id, value: '1985-05-20' },
          { questionId: qGenero.id, value: 'M' },
          { questionId: qCivil.id, value: 'CASADO' }
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