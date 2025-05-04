# TCC Chatbot Triagem Médica

Este projeto consiste em um chatbot web para realizar triagem automatizada de sintomas, fornecendo orientações iniciais aos pacientes com base em seus relatos. O sistema utiliza Inteligência Artificial para analisar os sintomas e fornecer recomendações preliminares.

## 🎯 Objetivos

- Identificar sintomas comuns para triagem automatizada
- Desenvolver fluxos de conversação baseados em orientações médicas
- Implementar um protótipo funcional utilizando IA e PLN
- Validar o chatbot através de simulações de casos clínicos
- Avaliar a usabilidade com testes de usuários

## 🚀 Tecnologias Utilizadas

### Frontend
- HTML5, CSS3 e JavaScript puro
- Design responsivo e acessível
- Temas claro/escuro
- Reconhecimento de voz
- Exportação de PDF

### Backend
- Node.js com Express
- MongoDB Atlas para banco de dados
- Autenticação JWT
- Integração com OpenAI GPT-3.5 API

### Hospedagem
- Frontend: Vercel
- Backend: Render
- Banco de Dados: MongoDB Atlas

## 📁 Estrutura do Projeto

```
/
├── public/                    # Frontend - Arquivos estáticos
│   ├── assets/               # Recursos para favicon
│   │   ├── android-chrome-192x192.png
│   │   ├── android-chrome-512x512.png
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── generate_favicon.sh
│   │   ├── icon.svg
│   │   └── site.webmanifest
│   ├── scripts/              # Scripts JavaScript
│   │   ├── auth.js          # Autenticação
│   │   ├── login.js         # Lógica de login
│   │   └── main.js          # Lógica principal
│   ├── styles/              # Estilos CSS
│   │   ├── login.css        # Estilos da página de login
│   │   └── main.css         # Estilos principais
│   ├── favicon.ico          # Favicon do site
│   ├── index.html           # Página principal
│   └── login.html           # Página de login
│
├── server/                   # Backend - Servidor Node.js
│   ├── models/              # Modelos do MongoDB
│   │   ├── ChatHistory.js   # Modelo de histórico
│   │   └── User.js          # Modelo de usuário
│   ├── auth.js              # Lógica de autenticação
│   ├── index.js             # Ponto de entrada
│   ├── package-lock.json    # Lock de dependências
│   └── package.json         # Dependências do backend
│
├── .env                      # Variáveis de ambiente
├── .gitignore               # Arquivos ignorados pelo Git
├── iniciar.bat              # Script de inicialização Windows
```

## 🛠️ Instalação

### Pré-requisitos
- Node.js (versão 14 ou superior)
- MongoDB Atlas (ou MongoDB local)
- Conta OpenAI com API key

### Passos para Instalação

1. Clone o repositório:
```bash
cd "TCC Chatbot Triagem Medica/server"
npm install
```

Se aparecerem erros de módulos não encontrados, instale-os manualmente:

```bash
npm install jsonwebtoken
npm install bcryptjs
npm install mongodb
npm install mongoose
```

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na pasta `server` e adicione as variáveis necessárias, por exemplo:

```
OPENAI_API_KEY=sua_chave_aqui
MONGODB_URI=sua_string_de_conexao
JWT_SECRET=seu_secret_jwt
```

## ▶️ Rodando o Projeto

Para iniciar o servidor, utilize um dos comandos abaixo:

### Backend
```bash
npm start
# ou
node index.js
# ou
iniciar.bat
```

### Frontend
- Abra `public/index.html` no navegador
- Ou use uma extensão de servidor local (como Live Server)

## 🔒 Segurança

- Autenticação JWT
- Criptografia de senhas
- Proteção contra ataques comuns
- CORS configurado
- Validação de inputs

## 📧 Contato

Lucas Oliveira - oliveira.cavalcanti@aluno.ifsp.edu.br

Link do Projeto: https://github.com/lucasbgp24/tcc-chatbot-triagem-medica