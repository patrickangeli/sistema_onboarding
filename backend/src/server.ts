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

// Configuração de Upload (Salvar na Memória para depois ir pro Banco)
const upload = multer({ storage: multer.memoryStorage() });

console.log("Server iniciando...");


// 1. Auxiliar: Listar todos os processos (Para você descobrir o ID gerado no Seed)
app.get('/processes', async (req, res) => {
  const processes = await prisma.onboardingProcess.findMany();
  return res.json(processes);
});

// 2. Busca a estrutura completa do formulário
// O Frontend vai usar esse JSON para desenhar os inputs na tela.
app.get('/process/:id/structure', async (req, res) => {
  const { id } = req.params;

  try {
    const process = await prisma.onboardingProcess.findUnique({
      where: { id },
      include: {
        phases: {
          orderBy: { order: 'asc' }, // Fase 1, Fase 2...
          include: {
            questions: {
              orderBy: { order: 'asc' }, // Pergunta 1, Pergunta 2...
              include: {
                options: { orderBy: { order: 'asc' } } // Opções do Select (se houver)
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

// 3. Criar um novo Candidato (Inicia o processo)
app.post('/employee', async (req, res) => {
  const { name, email, cpf, processId } = req.body;

  try {
    // Descobre qual é a primeira fase desse processo automaticamente
    const firstPhase = await prisma.phase.findFirst({
      where: { processId, order: 1 }
    });

    if (!firstPhase) {
      return res.status(400).json({ error: "Este processo não tem fases configuradas." });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        cpf,
        currentPhaseId: firstPhase.id
      }
    });

    return res.json(employee);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar colaborador. Verifique se o e-mail/CPF já existe." });
  }
});

// 4. Salvar Resposta de Texto/Select (Sem arquivo)
app.post('/answer/text', async (req, res) => {
  const { employeeId, questionId, value } = req.body;

  try {
    // Upsert: Cria se não existe, Atualiza se já existe
    const answer = await prisma.answer.upsert({
      where: {
        employeeId_questionId: { employeeId, questionId }
      },
      update: { value },
      create: { employeeId, questionId, value }
    });

    return res.json(answer);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao salvar resposta" });
  }
});

// 5. Upload de Arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
  
  const { employeeId, questionId } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  try {
    const answer = await prisma.answer.create({
      data: {
        employeeId,
        questionId,
        value: 'ARQUIVO', // Flag visual
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileData: file.buffer // O arquivo binário
      }
    });

    return res.json({ message: 'Arquivo salvo!', answerId: answer.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao fazer upload." });
  }
});

// 6. Baixar/Visualizar Arquivo
app.get('/file/:answerId', async (req, res) => {
  const { answerId } = req.params;

  const answer = await prisma.answer.findUnique({ where: { id: answerId } });

  if (!answer || !answer.fileData) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  // Configura cabeçalhos para o navegador entender o arquivo
  res.setHeader('Content-Type', answer.mimeType!);
  // 'inline' tenta abrir no navegador (bom para PDF/Imagens). Use 'attachment' para forçar download.
  res.setHeader('Content-Disposition', `inline; filename="${answer.fileName}"`);
  
  return res.send(answer.fileData);
});

// Iniciar Servidor
app.listen(3000, () => {
  console.log('Server rodando na porta 3000');
  console.log('Teste a API: http://localhost:3000/processes');
});
