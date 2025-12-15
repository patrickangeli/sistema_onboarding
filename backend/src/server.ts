import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';

// Configuração Inicial
const app = express();
const prisma = new PrismaClient();

// Habilita JSON e acesso externo (Frontend)
app.use(express.json());
app.use(cors());

// Configuração de Upload (Memória -> Banco)
const upload = multer({ storage: multer.memoryStorage() });

// LOG DO ID DO PROCESSO (Para te ajudar no front)
prisma.onboardingProcess.findFirst().then((proc) => {
  if (proc) {
    console.log("\n========================================");
    console.log("ID DO PROCESSO PARA O FRONTEND:", proc.id);
    console.log("========================================\n");
  }
});

console.log("Server iniciando...");

// ---------------------------------------------------------
// ROTAS DE LEITURA (GET)
// ---------------------------------------------------------

// 1. Busca a estrutura completa do formulário
app.get('/process/:id/structure', async (req, res) => {
  const { id } = req.params;

  try {
    const process = await prisma.onboardingProcess.findUnique({
      where: { id },
      include: {
        phases: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: { orderBy: { order: 'asc' } }
              }
            }
          }
        }
      }
    });

    if (!process) return res.status(404).json({ error: "Processo não encontrado" });
    return res.json(process);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar estrutura" });
  }
});

// 2. Visualizar Arquivo (AGORA BUSCA NA TABELA DOCUMENT)
app.get('/file/:answerId', async (req, res) => {
  const { answerId } = req.params;

  try {
    // Busca o documento linkado a esta resposta
    const doc = await prisma.document.findUnique({
      where: { answerId } 
    });

    if (!doc) return res.status(404).json({ error: 'Arquivo não encontrado' });

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    return res.send(doc.fileData);

  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar arquivo" });
  }
});

app.get('/employees', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        currentPhase: true // Traz os dados da fase (título) também
      },
      orderBy: {
        createdAt: 'desc' // Os mais recentes primeiro
      }
    });
    return res.json(employees);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar lista de candidatos." });
  }
});

// NOVO: Detalhes Completos do Candidato (Para o RH)
app.get('/employee/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        address: true, // Endereço
        currentPhase: true, // Fase atual
        answers: {
          include: {
            question: true, // Para saber qual pergunta foi respondida
            document: {     // Se tiver arquivo, traz metadados
               select: { id: true, fileName: true, mimeType: true } // Não traz o binário pesado
            }
          }
        }
      }
    });

    if (!employee) return res.status(404).json({ error: "Candidato não encontrado" });
    return res.json(employee);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar detalhes do candidato." });
  }
});

// NOVO: Checar CPF (Retorna ID se existir)
app.get('/employee/check-cpf/:cpf', async (req, res) => {
  const { cpf } = req.params;
  const cpfLimpo = cpf.replace(/\D/g, '');
  console.log(`[CHECK-CPF] Recebido: ${cpf} | Limpo: ${cpfLimpo}`);

  try {
    const employee = await prisma.employee.findUnique({
      where: { cpf: cpfLimpo },
      select: { id: true }
    });

    if (!employee) {
        console.log(`[CHECK-CPF] Não encontrado: ${cpfLimpo}`);
        return res.status(404).json({ error: "CPF não encontrado" });
    }
    
    console.log(`[CHECK-CPF] Encontrado ID: ${employee.id}`);
    return res.json(employee);
  } catch (error) {
    console.error(`[CHECK-CPF] Erro:`, error);
    return res.status(500).json({ error: "Erro ao verificar CPF" });
  }
});

// ---------------------------------------------------------
// ROTAS DE CADASTRO E RESPOSTAS (POST)
// ---------------------------------------------------------

// 3. Criar Candidato (SOMENTE IDENTIFICAÇÃO)
app.post('/employee', async (req, res) => {
  const { name, email, cpf, processId } = req.body;

  try {
    // Limpeza e Validação de Duplicidade
    const cpfLimpo = cpf.replace(/\D/g, '');
    console.log(`[REGISTER] Tentativa de cadastro CPF: ${cpf} | Limpo: ${cpfLimpo}`);

    const existingEmployee = await prisma.employee.findUnique({
      where: { cpf: cpfLimpo }
    });

    if (existingEmployee) {
      return res.status(400).json({ error: "Este CPF já possui cadastro!" });
    }

    const firstPhase = await prisma.phase.findFirst({
      where: { processId, order: 1 }
    });

    if (!firstPhase) return res.status(400).json({ error: "Processo sem fases." });

    // Cria apenas com dados básicos
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        cpf: cpfLimpo,
        currentPhaseId: firstPhase.id
      }
    });

    return res.json(employee);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar colaborador." });
  }
});

// 4. Salvar Endereço (TABELA SEPARADA)
app.post('/employee/address', async (req, res) => {
  const { employeeId, cep, street, number, complement, neighborhood, city, state } = req.body;

  try {
    // Cria ou Atualiza o endereço vinculado ao funcionário
    const address = await prisma.address.upsert({
      where: { employeeId },
      create: { employeeId, cep, street, number, complement, neighborhood, city, state },
      update: { cep, street, number, complement, neighborhood, city, state }
    });
    return res.json(address);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar endereço." });
  }
});

// NOVO: Salvar Feedback do RH
app.post('/employee/:id/feedback', async (req, res) => {
  const { id } = req.params;
  const { feedback, corrections } = req.body;

  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: { feedback, corrections }
    });
    return res.json(employee);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar feedback." });
  }
});

// 5. Salvar Resposta de Texto/Select
app.post('/answer/text', async (req, res) => {
  const { employeeId, questionId, value } = req.body;

  try {
    const answer = await prisma.answer.upsert({
      where: { employeeId_questionId: { employeeId, questionId } },
      update: { value },
      create: { employeeId, questionId, value }
    });
    return res.json(answer);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao salvar resposta" });
  }
});

// 6. Upload de Arquivo (SALVA EM DOCUMENT E VINCULA A ANSWER)
app.post('/upload', upload.single('file'), async (req, res) => {
  // @ts-ignore
  const { employeeId, questionId } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  try {
    // 1. Cria ou atualiza a Resposta para marcar que foi respondido
    const answer = await prisma.answer.upsert({
      where: { employeeId_questionId: { employeeId, questionId } },
      create: { employeeId, questionId, value: 'ARQUIVO' },
      update: { value: 'ARQUIVO' }
    });

    // 2. Salva o binário na tabela Document (Pesada)
    await prisma.document.create({
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileData: file.buffer,
        employeeId: employeeId,
        answerId: answer.id // Linka com a resposta acima
      }
    });

    return res.json({ message: 'Arquivo salvo com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao fazer upload." });
  }
});

// 7. Motor de Regras (Transição de Fase)
app.post('/next-step', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        currentPhase: { include: { questions: true } },
        answers: true
      }
    });

    if (!employee) return res.status(404).json({ error: "Colaborador não encontrado" });

    // Validação: Verifica obrigatórios
    const missingQuestions = employee.currentPhase.questions.filter(question => {
      if (!question.required) return false;
      const hasAnswer = employee.answers.some(a => a.questionId === question.id);
      return !hasAnswer;
    });

    if (missingQuestions.length > 0) {
      return res.status(400).json({ 
        error: "Existem campos obrigatórios não preenchidos.", 
        missing: missingQuestions.map(q => q.label) 
      });
    }

    // Avança Fase
    const nextPhase = await prisma.phase.findFirst({
      where: {
        processId: employee.currentPhase.processId,
        order: employee.currentPhase.order + 1
      }
    });

    if (!nextPhase) {
      return res.json({ message: "Processo Finalizado! Não há mais etapas." });
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { currentPhaseId: nextPhase.id }
    });

    return res.json({ message: "Fase avançada com sucesso!", nextPhaseId: nextPhase.id });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno no motor de regras." });
  }
});

// Iniciar Servidor
app.listen(3000, () => {
  console.log('Server rodando na porta 3000');
});