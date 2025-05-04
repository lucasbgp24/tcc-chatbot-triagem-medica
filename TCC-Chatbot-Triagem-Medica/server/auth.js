const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'triagem_medica';

// Função para conectar ao MongoDB
async function connectDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db(DB_NAME);
}

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    const isGuest = req.headers['x-guest-mode'] === 'true';

    if (isGuest) {
        req.user = { isGuest: true };
        return next();
    }

    if (!token) {
        return res.status(403).json({ message: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido' });
    }
};

// Rota para acesso de convidado
router.post('/guest', (req, res) => {
    try {
        // Não precisa de autenticação, apenas retorna um status de sucesso
        res.json({
            message: 'Acesso de convidado permitido',
            isGuest: true
        });
    } catch (error) {
        console.error('Erro no acesso de convidado:', error);
        res.status(500).json({ message: 'Erro ao acessar como convidado' });
    }
});

// Rota de registro
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, birthDate, gender, medicalConditions, allergies } = req.body;

        // Validações básicas
        if (!fullName || !email || !password || !birthDate || !gender) {
            return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
        }

        const db = await connectDB();
        const users = db.collection('users');

        // Verifica se o email já está em uso
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Este email já está em uso' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Cria o novo usuário
        const newUser = {
            fullName,
            email,
            password: hashedPassword,
            birthDate,
            gender,
            medicalConditions: medicalConditions || '',
            allergies: allergies || '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await users.insertOne(newUser);

        // Gera o token JWT
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuário registrado com sucesso',
            token
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ message: 'Erro ao registrar usuário' });
    }
});

// Rota de login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validações básicas
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        const db = await connectDB();
        const users = db.collection('users');

        // Busca o usuário
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }

        // Verifica a senha
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email ou senha incorretos' });
        }

        // Gera o token JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'sua_chave_secreta',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login realizado com sucesso',
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro ao fazer login' });
    }
});

// Rota para obter perfil do usuário
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await db.collection('users').findOne(
            { _id: req.user.id },
            { projection: { password: 0 } }
        );

        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ message: 'Erro ao buscar perfil' });
    }
});

router.use(cors({
  origin: 'https://tcc-chatbot-triagem-medica.vercel.app'
}));

module.exports = router; 