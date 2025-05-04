const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');
const authRoutes = require('./auth');

// Carrega as variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/triagem_medica';

// Conectar ao MongoDB
mongoose.connect(MONGODB_URI).then(() => {
    if (MONGODB_URI.includes('mongodb+srv')) {
        console.log('Conectado ao MongoDB Atlas com sucesso');
    } else {
        console.log('Conectado ao MongoDB local com sucesso');
    }
}).catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
});

// Configuração do OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configuração do CORS - permitindo todas as origens
app.use(cors());

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware
app.use(express.json());

// Serve arquivos estáticos do diretório public
app.use(express.static(path.join(__dirname, '../public')));

// Redirecionar a rota raiz para a página de login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Rota de registro
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, fullName, birthDate } = req.body;

        // Verifica se o usuário já existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Cria novo usuário
        const user = new User({
            email,
            password: hashedPassword,
            fullName,
            birthDate: new Date(birthDate)
        });

        await user.save();

        // Gera token JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Busca usuário
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Verifica senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gera token JWT
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Prompt base para o chatbot
const SYSTEM_PROMPT = `Você é um assistente de triagem médica especializado em avaliar sintomas iniciais e fornecer orientações preliminares.

REGRAS DE COMUNICAÇÃO:
1. NÃO repita saudações se já houver uma conversa em andamento
2. Mantenha o contexto da conversa atual
3. Referencie informações já mencionadas
4. Seja direto e objetivo nas perguntas
5. Use linguagem clara e acessível
6. Demonstre empatia de forma profissional

ESTRUTURA DE RESPOSTA:
1. Se for a primeira mensagem do usuário:
   - Faça uma saudação breve e profissional
   - Pergunte sobre os sintomas principais
2. Se já estiver em uma conversa:
   - Continue o diálogo sem repetir saudações
   - Faça perguntas complementares baseadas no contexto
   - Referencie informações já mencionadas
3. Se o usuário mencionar sintomas:
   - Demonstre que entendeu a queixa
   - Faça perguntas específicas sobre os sintomas
   - Avalie a gravidade
   - Forneça orientações preliminares

COLETA DE INFORMAÇÕES:
1. Duração dos sintomas
2. Intensidade
3. Fatores que pioram ou melhoram
4. Sintomas associados
5. Histórico médico relevante

IMPORTANTE:
- Em caso de sintomas graves, oriente buscar atendimento imediato
- Não faça diagnósticos definitivos
- Não prescreva medicamentos
- Sempre reforce que é uma triagem inicial

NÚMEROS DE EMERGÊNCIA:
- SAMU: 192
- Bombeiros: 193`;

// Função para usar a OpenAI
async function getChatGPTResponse(message, conversationHistory) {
    try {
        // Mantém apenas as últimas 10 mensagens para contexto
        const recentMessages = conversationHistory.slice(-10);
        
        // Verifica se é a primeira mensagem
        const isFirstMessage = recentMessages.length === 0;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...recentMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        let response = completion.choices[0].message.content;

        // Se a resposta parece incompleta, solicita continuação
        if (response.endsWith('...') || response.endsWith(',') || response.endsWith(':')) {
            console.log('Resposta parece incompleta, solicitando continuação...');
            const continuation = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...recentMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    { role: "assistant", content: response },
                    { role: "user", content: "Continue a resposta anterior" }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });
            response += ' ' + continuation.choices[0].message.content;
        }

        return response;
    } catch (error) {
        console.error('Erro ao usar OpenAI:', error);
        throw error;
    }
}

// Função para simular resposta do chatbot (modo offline/fallback)
function getSimulatedResponse(symptoms) {
    // Converte sintomas para minúsculas para facilitar a comparação
    const symptomLower = symptoms.toLowerCase().trim();
    
    // Respostas específicas baseadas em sintomas comuns
    if (symptomLower.includes('febre')) {
        return `[MODO OFFLINE - Triagem Médica]

Com base no seu relato de febre, aqui está uma avaliação inicial:

1. Avaliação Preliminar:
   - A febre é um sinal importante que seu corpo está combatendo alguma infecção
   - Precisamos avaliar outros sintomas associados

2. Perguntas Importantes:
   - Qual a temperatura atual?
   - Há quanto tempo está com febre?
   - Está sentindo outros sintomas como dor no corpo, tosse ou dor de garganta?
   - Tomou algum medicamento para baixar a febre?

3. Recomendações Iniciais:
   - Monitore a temperatura regularmente
   - Mantenha-se hidratado (beba bastante água)
   - Use roupas leves
   - Se a febre for superior a 38.5°C, considere usar antitérmico

4. Procure atendimento médico imediatamente se:
   - Febre acima de 39.5°C
   - Febre que dura mais de 3 dias
   - Dificuldade para respirar
   - Dor intensa
   - Manchas no corpo

LEMBRE-SE: Esta é apenas uma orientação inicial. Não substitui uma consulta médica.`;
    }
    else if (symptomLower.includes('dor') && symptomLower.includes('cabeca') || symptomLower.includes('dor') && symptomLower.includes('cabeça')) {
        return `[MODO OFFLINE - Triagem Médica]

Com base no seu relato de dor de cabeça, preciso de algumas informações:

1. Por favor, me diga:
   - Há quanto tempo está com dor?
   - A dor é em algum local específico da cabeça?
   - Qual a intensidade (leve, moderada, forte)?
   - Tem outros sintomas junto com a dor?
   - Já tomou alguma medicação?

2. Recomendações iniciais:
   - Procure um ambiente calmo e com pouca luz
   - Faça pausas de telas (computador, celular)
   - Mantenha-se hidratado
   - Se necessário, use analgésicos comuns

3. IMPORTANTE - Procure emergência se tiver:
   - Dor muito intensa e súbita
   - Febre alta junto com a dor
   - Rigidez no pescoço
   - Alterações na visão ou fala
   - Confusão mental

Aguardo suas respostas para uma avaliação mais precisa.`;
    }
    else if (symptomLower.includes('tosse')) {
        return `[MODO OFFLINE - Triagem Médica]

Com base no seu relato de tosse, preciso saber:

1. Características da tosse:
   - É seca ou com catarro?
   - Há quanto tempo está tossindo?
   - Sente falta de ar?
   - Tem febre?
   - A tosse piora em algum momento específico?

2. Recomendações iniciais:
   - Mantenha-se hidratado
   - Umidifique o ambiente
   - Evite irritantes (fumaça, poeira)
   - Eleve a cabeceira ao dormir

3. IMPORTANTE - Procure atendimento se:
   - Tiver tosse com sangue
   - Sentir falta de ar
   - A tosse durar mais de 2 semanas
   - Tiver febre persistente
   - Sentir dor no peito

Por favor, me forneça mais detalhes sobre sua tosse.`;
    }
    
    // Resposta padrão para iniciar conversa
    return `[MODO OFFLINE - Triagem Médica]

Por favor, me descreva seus sintomas com mais detalhes:

1. Gostaria de saber:
   - Quais sintomas específicos você está sentindo?
   - Há quanto tempo começou?
   - Os sintomas são constantes ou variam?
   - Já tomou alguma medicação?
   - Tem alguma condição médica prévia?

2. Enquanto isso, recomendações gerais:
   - Mantenha-se hidratado
   - Descanse adequadamente
   - Evite automedicação
   - Anote mudanças nos sintomas

3. IMPORTANTE: Procure atendimento imediato se:
   - Sentir dificuldade para respirar
   - Tiver dor intensa
   - Apresentar febre alta persistente
   - Notar alterações na consciência

Por favor, descreva seus sintomas em detalhes para que eu possa ajudar melhor.`;
}

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

// Rota para salvar novo histórico
app.post('/api/history', async (req, res) => {
    try {
        let { symptoms, severity, duration, conversation, isGuest } = req.body;
        
        // Garante que symptoms seja uma string
        if (Array.isArray(symptoms)) {
            symptoms = symptoms.join(', ');
        } else if (typeof symptoms !== 'string') {
            symptoms = String(symptoms || '');
        }

        // Garante que duration seja uma string
        if (typeof duration !== 'string') {
            duration = String(duration || '');
        }

        // Mapeia a severidade para os valores aceitos
        severity = mapSeverity(severity || 'low');

        // Cria o objeto do histórico
        const chatHistory = new ChatHistory({
            isGuest: isGuest === true,
            symptoms,
            severity,
            duration,
            conversation: Array.isArray(conversation) ? conversation : []
        });

        // Se não for convidado, tenta extrair o userId do token
        if (!isGuest) {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
                    chatHistory.userId = decoded.id;
                } catch (err) {
                    console.error('Erro ao decodificar token:', err);
                }
            }
        }

        await chatHistory.save();
        res.status(201).json(chatHistory);
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        res.status(500).json({ 
            error: 'Erro ao salvar histórico',
            details: error.message 
        });
    }
});

// Rota para buscar histórico do usuário (apenas autenticado)
app.get('/api/history', verifyToken, async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Acesso não autorizado' });
        }
        console.log('Buscando histórico para usuário:', req.userId);
        const history = await ChatHistory.find({ userId: req.userId })
            .sort({ timestamp: -1 })
            .limit(10);
        console.log('Histórico encontrado:', history.length, 'registros');
        res.json(history);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

// Rota para buscar uma conversa específica (apenas autenticado)
app.get('/api/history/:chatId', verifyToken, async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Acesso não autorizado' });
        }
        const chat = await ChatHistory.findOne({
            _id: req.params.chatId,
            userId: req.userId
        });
        if (!chat) {
            return res.status(404).json({ error: 'Conversa não encontrada' });
        }
        res.json(chat);
    } catch (error) {
        console.error('Erro ao buscar conversa:', error);
        res.status(500).json({ error: 'Erro ao buscar conversa' });
    }
});

// Função para mapear severity
function mapSeverity(severity) {
    switch (severity) {
        case 'low': return 'Baixa Gravidade';
        case 'medium': return 'Média Gravidade';
        case 'high': return 'Alta Gravidade';
        default: return 'Baixa Gravidade';
    }
}

// Rota para processar mensagens do chat
app.post('/chat', async (req, res) => {
    console.log('Nova mensagem recebida:', req.body);
    const message = req.body.message;
    const conversationHistory = req.body.history || [];
    const userToken = req.headers.authorization?.split(' ')[1];
    const severity = req.body.severity || 'Baixa Gravidade';

    if (!message) {
        return res.status(400).json({ error: 'Mensagem não pode estar vazia' });
    }

    try {
        // Buscar informações do usuário se estiver autenticado
        let userContext = '';
        let userId = null;

        if (userToken) {
            try {
                const decoded = jwt.verify(userToken, process.env.JWT_SECRET || 'sua_chave_secreta');
                userId = decoded.id;
                const user = await User.findById(userId);
                
                if (user) {
                    userContext = `
INFORMAÇÕES DO PACIENTE:
- Nome: ${user.fullName}
- Data de Nascimento: ${user.birthDate}
- Gênero: ${user.gender || 'Não informado'}
${user.conditions ? `- Condições Médicas Pré-existentes: ${user.conditions}` : ''}
${user.allergies ? `- Alergias Conhecidas: ${user.allergies}` : ''}

Por favor, considere estas informações ao avaliar os sintomas do paciente.`;
                }
            } catch (error) {
                console.error('Erro ao buscar informações do usuário:', error);
            }
        }

        // Adiciona o contexto do usuário ao prompt do sistema
        const customSystemPrompt = SYSTEM_PROMPT + (userContext ? `\n\n${userContext}` : '');

        console.log('Tentando usar OpenAI...');
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: customSystemPrompt },
                ...conversationHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: "user", content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        const assistantResponse = response.choices[0].message.content;

        // Salvar histórico se usuário estiver autenticado
        if (userId) {
            const chatHistory = new ChatHistory({
                userId,
                symptoms: message,
                severity,
                duration: '< 1 min',
                conversation: [
                    ...conversationHistory,
                    { role: 'user', content: message },
                    { role: 'assistant', content: assistantResponse }
                ]
            });
            await chatHistory.save();
        }

        console.log('Resposta recebida da OpenAI');
        res.json({ response: assistantResponse });
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        res.status(500).json({ 
            error: 'Erro ao processar mensagem',
            details: error.message 
        });
    }
});

// Rota para verificar uso da API OpenAI
app.get('/api/usage', verifyToken, async (req, res) => {
    try {
        const usage = await openai.usage.retrieve();
        res.json(usage);
    } catch (error) {
        console.error('Erro ao verificar uso da API:', error);
        res.status(500).json({ error: 'Erro ao verificar uso da API' });
    }
});

// Rota para acesso de convidados
app.post('/api/guest', async (req, res) => {
    try {
        // Gera um token temporário para o convidado
        const guestToken = jwt.sign(
            { isGuest: true },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            token: guestToken,
            isGuest: true,
            user: {
                fullName: 'Convidado'
            }
        });
    } catch (error) {
        console.error('Erro no acesso como convidado:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor está funcionando' });
});

// Rota de chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, isGuest, conversationHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Mensagem não fornecida' });
        }

        let userId = null;
        let userContext = '';

        // Se não for convidado, verifica o token
        if (!isGuest) {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'Token não fornecido' });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
                userId = decoded.id;
                const user = await User.findById(userId);
                
                if (user) {
                    userContext = `
INFORMAÇÕES DO PACIENTE:
- Nome: ${user.fullName}
- Data de Nascimento: ${user.birthDate}
${user.gender ? `- Gênero: ${user.gender}` : ''}
${user.conditions ? `- Condições Médicas: ${user.conditions}` : ''}
${user.allergies ? `- Alergias: ${user.allergies}` : ''}`;
                }
            } catch (error) {
                return res.status(401).json({ error: 'Token inválido' });
            }
        }

        // Obtém resposta do ChatGPT
        const response = await getChatGPTResponse(message, conversationHistory || []);
        
        // Se o usuário estiver autenticado, salva o histórico
        if (userId) {
            try {
                const chatHistory = new ChatHistory({
                    userId,
                    symptoms: message,
                    severity: 'Baixa Gravidade',
                    conversation: [
                        ...(conversationHistory || []),
                        { role: 'user', content: message },
                        { role: 'assistant', content: response }
                    ]
                });
                await chatHistory.save();
            } catch (error) {
                console.error('Erro ao salvar histórico:', error);
            }
        }
        
        res.json({ message: response });
    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`\nServidor rodando em http://localhost:${PORT}`);
    console.log('Pressione Ctrl+C para parar o servidor\n');
});

// Exporta o app para o Vercel
module.exports = app; 