Aqui está o cronograma detalhado do seu projeto **Sistema de Admissão Dinâmico**, formatado em Markdown.

Você pode copiar esse conteúdo, colar em um arquivo `README.md` no seu projeto ou usar em ferramentas como Notion/Obsidian para acompanhar seu progresso. Adicionei blocos de código vazios ou com estruturas básicas para você preencher conforme avança.

-----

# 🚀 Projeto Onboarding: Cronograma de Desenvolvimento

[cite_start]**Responsável:** [Seu Nome] [cite: 3]
[cite_start]**Meta:** Criar uma plataforma onde o Frontend renderiza formulários dinamicamente baseados em regras do Backend (JSON)[cite: 6, 7, 8].

-----

## 📅 Semana 1: O "Esqueleto" Funcional (08/12 - 12/12)

[cite_start]**Objetivo:** Até sexta-feira, um candidato consegue salvar dados e arquivos no banco[cite: 52, 53].

### ✅ Segunda-feira (08/12): Fundação & Banco de Dados

[cite_start]**Foco:** Modelagem DB (Prisma) + Migrations[cite: 54].

  - [x] Configurar ambiente Node.js e TypeScript.
  - [x] Instalar PostgreSQL e configurar `.env`.
  - [x] Criar Schema do Prisma (`schema.prisma`).
  - [x] Rodar Migration Inicial (`npx prisma migrate dev`).
  - [x] Criar e Rodar Seed Database (`npx prisma db seed`).

**Entregável:** Banco de dados rodando com as tabelas `OnboardingProcess`, `Phase`, `Question` populadas.

```typescript
// Espaço para anotações do Schema final (prisma/schema.prisma)
model Question {
  id      String @id @default(uuid())
  label   String
  type    QuestionType // TEXT, FILE, SELECT...
  // ...
}
```

-----

### 🚧 Terça-feira (09/12): Dados Básicos (API & Renderização)

[cite_start]**Foco:** Conexão Front-Back e renderização dinâmica[cite: 54].

  - [ ] **Backend:** Criar Rota `GET /process/:id/phases` (Retorna o JSON da estrutura).
  - [ ] **Backend:** Criar Rota `POST /employee` (Cria o candidato inicial).
  - [ ] **Frontend:** Configurar Axios e React Query.
  - [ ] **Frontend:** Criar componente `DynamicInput` (Switch case que renderiza Input ou Select).

**Entregável:** Tela inicial que "desenha" os inputs baseados no que vem do banco.

```typescript
// Exemplo de estrutura do JSON esperado da API
// GET /process/default/phases
[
  {
    "title": "Dados Pessoais",
    "questions": [
       { "label": "Nome", "type": "TEXT" },
       { "label": "Gênero", "type": "SELECT", "options": [...] }
    ]
  }
]
```

-----

### 📅 Quarta-feira (10/12): Uploads (A Parte Crítica)

[cite_start]**Foco:** Configurar Multer e Input de Arquivos[cite: 54].

  - [ ] **Backend:** Configurar Middleware Multer.
  - [ ] **Backend:** Criar Rota `POST /upload` (Salva na pasta `/uploads` e retorna URL).
  - [ ] **Frontend:** Criar componente `InputFile`.
  - [ ] **Integração:** Ao selecionar arquivo, o Front faz upload e salva a URL no campo `value` da resposta.

**Entregável:** Candidato consegue enviar "Foto do RG" e o arquivo aparece na pasta do servidor.

```typescript
// Configuração básica do Multer (backend/src/config/upload.ts)
import multer from 'multer';
// Cole sua configuração aqui...
```

-----

### 📅 Quinta-feira (11/12): Motor de Regras

[cite_start]**Foco:** Lógica de Transição de Fases[cite: 54].

  - [ ] **Backend:** Criar Rota `POST /next-step`.
  - [ ] **Backend:** Validar campos obrigatórios (`required: true`) antes de permitir avanço.
  - [ ] **Frontend:** Integração com *React Hook Form* para impedir envio vazio.
  - [ ] **Lógica:** Se sucesso -\> Atualiza `currentPhaseId` do colaborador.

**Entregável:** O sistema bloqueia o usuário se ele tentar pular etapa sem preencher tudo.

```typescript
// Lógica de validação (Pseudo-código)
if (question.required && !answer.value) {
   throw new Error("Campo obrigatório não preenchido");
}
```

-----

### 📅 Sexta-feira (12/12): Deploy Alpha (VPS)

[cite_start]**Foco:** Configurar ambiente de produção[cite: 54].

  - [ ] Contratar/Configurar VPS (OVH/DigitalOcean).
  - [ ] Instalar Docker ou Node/Postgres/Nginx manualmente na VPS.
  - [ ] [cite_start]Configurar **Nginx** como Proxy Reverso (Porta 80 -\> 3000/Backend e 80 -\> Estáticos/Frontend)[cite: 39].
  - [ ] Rodar Build do React (`npm run build`).

**Entregável:** Link acessível publicamente onde é possível cadastrar um usuário.

```nginx
# Espaço para configuração do Nginx (/etc/nginx/sites-available/default)
server {
    server_name seu-dominio.com;
    
    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

-----

## 📅 Semana 2: Interface de Gestão e Entrega (15/12 - 19/12)

[cite_start]**Objetivo:** Interface do RH e Polimento final[cite: 56, 57].

### 📅 Segunda-feira (15/12): Admin View

[cite_start]**Foco:** Listagem de Candidatos[cite: 58].

  - [ ] **Backend:** Rota `GET /admin/employees` (Retorna lista com fase atual).
  - [ ] **Frontend:** Criar Dashboard do RH (Tabela simples).

### 📅 Terça-feira (16/12): Detalhes & Aprovação

[cite_start]**Foco:** Visualizar respostas e arquivos[cite: 58].

  - [ ] **Frontend:** Tela de Detalhes (Clicar no nome -\> Ver respostas).
  - [ ] **Backend:** Rotas de Ação (`POST /approve`, `POST /reject`).
  - [ ] **Frontend:** Botões de Aprovar (Avança fase) ou Reprovar (Volta fase/Comentário).

### 📅 Quarta-feira (17/12): Segurança

[cite_start]**Foco:** Proteger a área administrativa[cite: 58].

  - [ ] Implementar Login simples (Hardcoded ou tabela `AdminUser`).
  - [ ] Middleware de proteção nas rotas `/admin`.

### 📅 Quinta-feira (18/12): Polimento

[cite_start]**Foco:** UX e UI[cite: 58].

  - [ ] Adicionar Loadings (Skeleton screens).
  - [ ] Toasts de Sucesso/Erro (ex: "Salvo com sucesso").
  - [ ] Melhorar CSS (Tailwind) dos formulários.

### 🏁 Sexta-feira (19/12): Entrega Final

[cite_start]**Foco:** Testes e Documentação[cite: 58].

  - [ ] Teste Ponta a Ponta (Do cadastro à aprovação).
  - [ ] Escrever README.md com instruções de como rodar.
  - [ ] Gravar vídeo de Demo ou preparar apresentação.

-----
