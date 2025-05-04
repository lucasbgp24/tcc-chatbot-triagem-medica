# TCC Chatbot Triagem Médica

Este projeto consiste em um chatbot web para realizar triagem automatizada de sintomas, fornecendo orientações iniciais aos pacientes com base em seus relatos.

## Objetivos

- Identificar sintomas comuns para triagem automatizada
- Desenvolver fluxos de conversação baseados em orientações médicas
- Implementar um protótipo funcional utilizando IA e PLN
- Validar o chatbot através de simulações de casos clínicos
- Avaliar a usabilidade com testes de usuários

## Tecnologias Utilizadas

- Frontend: HTML5, CSS3 e JavaScript puro
- Backend: Node.js com Express (para integração com a API do OpenAI)
- IA: OpenAI GPT API

## Estrutura do Projeto

```
/
├── public/            # Arquivos estáticos (HTML, CSS, JS)
│   ├── index.html
│   ├── styles/
│   │   └── main.css
│   └── scripts/
│       └── main.js
├── server/           # Servidor Node.js
└── docs/            # Documentação do projeto
```

## 🛠️ Instalação das Dependências

Após clonar o projeto, instale as dependências do backend:

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
# Outras variáveis necessárias, como string de conexão do MongoDB, etc.
```

## ▶️ Rodando o Projeto

Para iniciar o servidor, utilize um dos comandos abaixo:

```bash
npm start
# ou
node index.js
# ou
iniciar.bat
```

> **Dica:** O arquivo `iniciar.bat` automatiza o processo de inicialização do servidor no Windows. Basta dar um duplo clique nele para rodar o backend sem precisar digitar comandos no terminal.

## 💻 Rodando o Frontend

Abra o arquivo `public/index.html` no navegador ou utilize uma extensão de servidor local (como Live Server no VSCode).

## 🤝 Contribuição

Este projeto está em desenvolvimento. Contribuições são bem-vindas! 