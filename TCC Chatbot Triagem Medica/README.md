# Chatbot de Triagem Médica

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

## Instalação

1. Clone o repositório
2. Instale as dependências do servidor:
   ```bash
   cd server
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` no diretório server
   - Adicione sua chave da API OpenAI

4. Inicie o servidor:
   ```bash
   cd server
   npm start
   ```

5. Abra o arquivo `public/index.html` em seu navegador

## Contribuição

Este projeto está em desenvolvimento. Contribuições são bem-vindas! 