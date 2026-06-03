# Suprema Classe — Como Rodar o Sistema

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL instalado e rodando na porta 5432
- Git (opcional)

## 1. Configurar o Banco de Dados

Crie o banco de dados no PostgreSQL:

```sql
CREATE DATABASE suprema_classe;
```

Se precisar, ajuste o usuário/senha em `backend/.env`:
```
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/suprema_classe"
```

## 2. Iniciar o Backend

Abra um terminal na pasta `backend`:

```bash
cd backend
npm install
npm run db:push      # cria as tabelas no banco
npm run db:seed      # popula dados iniciais (categorias, produtos, admin)
npm run dev          # inicia servidor na porta 3001
```

Acesso: http://localhost:3001/api/health

**Credenciais admin:** admin@supremaclasse.com / admin123

## 3. Iniciar o Frontend

Abra outro terminal na pasta `frontend`:

```bash
cd frontend
npm install
npm run dev          # inicia na porta 3000
```

Acesso: http://localhost:3000

## Estrutura do Projeto

```
Suprema Classe/
├── backend/           # API Node.js + Express + Prisma
│   ├── prisma/        # Schema e migrations do banco
│   ├── src/           # Código fonte
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   └── uploads/       # Fotos dos produtos
│
└── frontend/          # React + TypeScript + Vite
    └── src/
        ├── api/       # Chamadas à API
        ├── components/
        ├── pages/
        └── types/
```

## Funcionalidades Disponíveis

- Dashboard com métricas em tempo real
- Cadastro de produtos com upload de fotos
- Calendário de disponibilidade (estilo Airbnb)
- Nova locação com verificação automática de conflito de datas
- Cadastro de clientes com histórico
- Geração automática de contrato em PDF
- Sistema de busca global
- Relatórios com exportação PDF/Excel

## Problemas Comuns

**Backend não conecta ao banco:**
Verifique se o PostgreSQL está rodando e ajuste DATABASE_URL no `.env`

**Frontend não carrega dados:**
Confirme que o backend está rodando na porta 3001

**Upload de fotos falha:**
A pasta `backend/uploads/` precisa existir e ter permissão de escrita
