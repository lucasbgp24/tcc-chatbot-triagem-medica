// Configuração inicial
const SERVER_URL = 'https://tcc-chatbot-triagem-medica.onrender.com';

// Verificação imediata de autenticação
(function checkAuth() {
    // Verifica se está na página inicial (qualquer URL que não seja login.html)
    const isLoginPage = window.location.pathname.includes('login.html');
    if (isLoginPage) return;

    // Verifica autenticação
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const hasToken = localStorage.getItem('authToken');

    console.log('Verificação inicial de autenticação:', { isGuest, hasToken });

    // Se não tiver autenticação, redireciona para login
    if (!isGuest && !hasToken) {
        console.log('Redirecionando para login...');
        window.location.replace('login.html');
    }
})();

// Mensagem inicial padrão
const WELCOME_MESSAGE = {
    text: 'Olá! Como posso ajudar você hoje com questões de saúde? Se estiver enfrentando algum sintoma ou preocupação, fique à vontade para compartilhar comigo. Estou aqui para ajudar.',
    type: 'bot'
};

// Variáveis globais para controle do chat
let conversationHistory = [];
let currentViewingId = null;
let currentConversationBackup = null;
let isViewingHistory = false;

// Variáveis globais para elementos do DOM
let chatMessages;
let userInput;
let sendButton;
let connectionStatus;
let themeToggle;
let voiceButton;
let accessibilityToggle;
let historyToggle;
let newButton;
let emergencyButton;
let logoutButton;

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando elementos...');
    
    try {
        // Inicializa elementos do DOM
        initializeElements();

        // Configura event listeners
        setupEventListeners();
        
        // Inicializa componentes
        await initialize();
        
        // Adiciona mensagem inicial apenas se não houver histórico
        if (!conversationHistory.length) {
            // Primeiro adiciona os sintomas rápidos
            const quickSymptomsContainer = createQuickSymptoms();
            if (quickSymptomsContainer && chatMessages) {
                chatMessages.appendChild(quickSymptomsContainer);
            }

            // Depois adiciona a mensagem de boas-vindas
            addMessage(WELCOME_MESSAGE, true);
            conversationHistory.push({
                role: 'assistant',
                content: WELCOME_MESSAGE.text,
                timestamp: new Date().toISOString()
            });
        }

        // Configura o botão de emergência por último
        if (emergencyButton) {
            initializeEmergencyButton();
        }
    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        showToast('Erro ao inicializar a aplicação. Por favor, recarregue a página.', 'error');
    }
});

// Função para inicializar elementos do DOM
function initializeElements() {
    chatMessages = document.querySelector('.chat-messages');
    userInput = document.querySelector('.chat-input');
    sendButton = document.querySelector('.send-button');
    connectionStatus = document.querySelector('.connection-status');
    themeToggle = document.querySelector('.theme-toggle');
    voiceButton = document.querySelector('.voice-button');
    accessibilityToggle = document.querySelector('.accessibility-toggle');
    historyToggle = document.querySelector('.history-toggle');
    newButton = document.querySelector('#newSessionButton');
    emergencyButton = document.querySelector('.emergency-menu-button');
    logoutButton = document.querySelector('.logout-button');

    console.log('Elementos encontrados:', {
        chatMessages: !!chatMessages,
        userInput: !!userInput,
        sendButton: !!sendButton,
        themeToggle: !!themeToggle,
        historyToggle: !!historyToggle,
        newButton: !!newButton
    });
}

// Função para configurar event listeners
function setupEventListeners() {
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (sendButton) {
        sendButton.addEventListener('click', () => handleSendMessage());
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => toggleTheme());
    }

    if (historyToggle) {
        historyToggle.addEventListener('click', () => showAttendanceHistory());
    }

    if (newButton) {
        newButton.addEventListener('click', () => {
            showConfirmationModal(
                'Tem certeza que deseja iniciar uma nova sessão?',
                startNewSession
            );
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => handleLogout());
    }

    if (voiceButton) {
        voiceButton.addEventListener('click', () => toggleVoiceRecognition());
    }

    // Configurar reconhecimento de voz se disponível
    setupVoiceRecognition();
}

// Função para configurar reconhecimento de voz
function setupVoiceRecognition() {
    try {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Reconhecimento de voz não suportado neste navegador');
            if (voiceButton) voiceButton.style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isListening = true;
            if (voiceButton) {
                voiceButton.classList.add('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-stop';
            }
            showToast('Ouvindo...', 'info');
        };

        recognition.onend = () => {
            isListening = false;
            if (voiceButton) {
                voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (userInput) {
                userInput.value = transcript;
                handleSendMessage();
            }
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
            isListening = false;
            if (voiceButton) {
                voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
            showToast('Erro no reconhecimento de voz. Tente novamente.', 'error');
        };

        console.log('Reconhecimento de voz inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao configurar reconhecimento de voz:', error);
        if (voiceButton) voiceButton.style.display = 'none';
    }
}

// Lista de sintomas comuns com ícones
const commonSymptoms = [
    { text: 'Dor de cabeça', icon: 'fa-head-side-virus', severity: 'medium' },
    { text: 'Febre', icon: 'fa-temperature-high', severity: 'medium' },
    { text: 'Gripe', icon: 'fa-head-side-cough', severity: 'medium' },
    { text: 'Dor no corpo', icon: 'fa-person-dots-from-line', severity: 'medium' }
];

// Emojis para diferentes contextos
const SYMPTOM_EMOJIS = {
    high: '🚨',
    medium: '⚠️',
    low: 'ℹ️',
    fever: '🌡️',
    pain: '🤕',
    respiratory: '🫁',
    digestive: '🤢',
    mental: '🧠',
    general: '👨‍⚕️'
};

// Variáveis para controle de inatividade
let inactivityTimeout;
const INACTIVITY_TIMEOUT = 180000; // 3 minutos em milissegundos

// Palavras que indicam agradecimento
const THANK_WORDS = ['obrigado', 'obrigada', 'agradeço', 'valeu', 'thanks', 'thank you', 'gratidão'];

// Função para resetar o timer de inatividade
function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        const inactivityMessage = {
            role: 'assistant',
            content: 'Notei que você está inativo há algum tempo. Posso ajudar com mais alguma coisa? Se não, podemos finalizar o atendimento.'
        };
        addMessage(inactivityMessage.content, true);
        conversationHistory.push(inactivityMessage);
        
        // Adiciona botões de ação
        const actionButtons = document.createElement('div');
        actionButtons.className = 'message-actions';
        actionButtons.innerHTML = `
            <button class="action-button" onclick="finishAttendanceWithSummary()">
                <i class="fas fa-check-circle"></i>
                Finalizar Atendimento
            </button>
            <button class="action-button" onclick="continueAttendance()">
                <i class="fas fa-comments"></i>
                Continuar Atendimento
            </button>
        `;
        chatMessages.appendChild(actionButtons);
    }, INACTIVITY_TIMEOUT);
}

// Função para iniciar verificação de inatividade
function startInactivityCheck() {
    resetInactivityTimer();
}

// Função para verificar se a mensagem contém agradecimento
function containsThankWord(message) {
    return THANK_WORDS.some(word => message.toLowerCase().includes(word));
}

// Função para finalizar atendimento com resumo e PDF
async function finishAttendanceWithSummary() {
    try {
        console.log('Iniciando finalização do atendimento...');
        // NÃO criar/adicionar o resumo automaticamente
        // Cria e adiciona o feedback
        let feedback;
        try {
            feedback = createFeedback();
            if (!feedback) throw new Error('Feedback não gerado');
            addMessage(feedback.outerHTML, true, true); // agora como HTML
        } catch (e) {
            console.error('Erro ao criar/adicionar feedback:', e);
            showToast('Erro ao criar feedback.', 'error');
        }
        // Mensagem final sem mencionar PDF automático
        const finalMessage = {
            role: 'system',
            content: `${SYMPTOM_EMOJIS.general} Atendimento finalizado! Caso seus sintomas se agravem ou surjam novos sintomas, não hesite em iniciar um novo atendimento ou procurar ajuda médica presencial. Números de emergência: 📞 SAMU: 192 📞 Bombeiros: 193`
        };
        addMessage(finalMessage.content, true);
        // Salva o histórico final
        await saveConversationHistory();
    } catch (error) {
        console.error('Erro ao finalizar atendimento (bloco principal):', error);
        showToast('Erro ao finalizar atendimento. Por favor, tente novamente.', 'error');
    }
}

// Variáveis globais para controle da triagem
let triageProgress = 0;
let currentSeverity = 'low';
const TRIAGE_STEPS = 5; // Número total de etapas da triagem

// Palavras-chave para determinar a gravidade
const SEVERITY_KEYWORDS = {
    high: ['intensa', 'grave', 'severa', 'emergência', 'desmaio', 'convulsão', 'hemorragia'],
    medium: ['moderada', 'febre', 'vômito', 'diarreia', 'tontura'],
    low: ['leve', 'pequena', 'suave', 'discreta']
};

// Elementos de acessibilidade
const accessibilityPanel = document.getElementById('accessibilityPanel');
const accessibilityOverlay = document.getElementById('accessibilityOverlay');
const closeAccessibility = document.getElementById('closeAccessibility');
const fontButtons = document.querySelectorAll('.font-buttons-container .font-button');
const spacingButtons = document.querySelectorAll('.spacing-buttons-container .spacing-button');
const dyslexicToggle = document.getElementById('dyslexicToggle');
const voiceToggle = document.getElementById('voiceToggle');

// Elementos de voz
let recognition = null;
let isListening = false;

// Elementos de emergência
const emergencyPanel = document.getElementById('emergencyPanel');
const closeEmergency = document.querySelector('#emergencyPanel .close-button');
const menuOverlay = document.querySelector('.menu-overlay');
const emergencyContacts = document.querySelectorAll('.emergency-contact');

// Elementos do Modal de Confirmação
const confirmationOverlay = document.getElementById('confirmationOverlay');
const confirmationModal = document.getElementById('confirmationModal');
const confirmButton = document.getElementById('confirmNewSession');
const cancelButton = document.getElementById('cancelNewSession');
const newSessionButton = document.getElementById('newSessionButton');

// Elementos do DOM para o menu mobile
const menuMobile = document.querySelector('.menu-mobile');
const menuOverlayMobile = document.getElementById('menuOverlay');
const headerButtonsMobile = document.getElementById('headerButtons');

// Inicialização do menu mobile
function initializeMobileMenu() {
    console.log('Inicializando menu mobile...');
    
    if (menuMobile && menuOverlayMobile && headerButtonsMobile) {
// Evento de clique no botão do menu mobile
menuMobile.addEventListener('click', () => {
            console.log('Menu mobile clicado');
    headerButtonsMobile.classList.toggle('active');
    menuOverlayMobile.classList.toggle('active');
});

// Fecha o menu ao clicar no overlay
menuOverlayMobile.addEventListener('click', () => {
            console.log('Overlay clicado');
    headerButtonsMobile.classList.remove('active');
    menuOverlayMobile.classList.remove('active');
});

        // Fecha o menu ao clicar em qualquer botão
        headerButtonsMobile.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        headerButtonsMobile.classList.remove('active');
        menuOverlayMobile.classList.remove('active');
    });
});
    } else {
        console.error('Elementos do menu mobile não encontrados:', {
            menuMobile: !!menuMobile,
            menuOverlayMobile: !!menuOverlayMobile,
            headerButtonsMobile: !!headerButtonsMobile
        });
    }
}

// Função para verificar se é dispositivo móvel
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Toggle do painel de emergência
emergencyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    emergencyPanel.classList.toggle('active');
    menuOverlay.classList.toggle('active');
    
    // Se estiver no menu mobile, fecha o menu
    const headerButtons = document.getElementById('headerButtons');
    if (headerButtons.classList.contains('active')) {
        headerButtons.classList.remove('active');
        menuOverlayMobile.classList.remove('active');
    }
});

// Função para verificar conexão com o servidor
async function checkServerConnection() {
    try {
        console.log('Verificando conexão com o servidor...');
        const response = await fetch(`${SERVER_URL}/api/health`);
        const data = await response.json();
        
        connectionStatus.textContent = 'Conectado';
        connectionStatus.className = 'connection-status online';
        console.log('Servidor respondeu:', data);
        return true;
    } catch (error) {
        console.error('Erro ao conectar ao servidor:', error);
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.className = 'connection-status offline';
        addMessage('⚠️ Erro de conexão: Não foi possível conectar ao servidor. Por favor, execute o arquivo iniciar.bat para iniciar o servidor.');
        return false;
    }
}

// Formata a data para exibição
function formatTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Função para adicionar mensagem ao chat
function addMessage(content, isBot = false, isHtml = false, addToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
    
    // Adiciona o avatar
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    if (isBot) {
        avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
        avatarDiv.style.backgroundColor = '#4CAF50';
    } else {
        avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        avatarDiv.style.backgroundColor = '#2196F3';
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isHtml) {
        contentDiv.innerHTML = content;
    } else if (typeof content === 'object' && content.text) {
        contentDiv.textContent = content.text;
    } else {
    contentDiv.textContent = content;
    }
    
    if (isBot) {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Adiciona ao histórico (apenas se não for HTML de componente e se addToHistory for true)
    if (!isHtml && addToHistory) {
    conversationHistory.push({
        role: isBot ? 'assistant' : 'user',
            content: typeof content === 'object' ? content.text : content,
        timestamp: new Date()
    });
    // Salva o histórico apenas se for para adicionar
    saveConversationHistory();
    }
}

// Função para verificar se deve mostrar os botões de ação
function shouldShowActionButtons(content) {
    // Verifica se já houve interação suficiente (pelo menos 3 mensagens trocadas)
    if (conversationHistory.length < 3) {
        return false;
    }

    // Verifica se o bot está fazendo uma recomendação médica
    const hasRecommendation = content.toLowerCase().includes('recomendo') || 
                             content.toLowerCase().includes('procure um médico') ||
                             content.toLowerCase().includes('busque atendimento');

    // Verifica se o bot está perguntando se pode ajudar mais
    const isAskingToHelp = content.toLowerCase().includes('posso ajudar') || 
                          content.toLowerCase().includes('mais alguma coisa') ||
                          content.toLowerCase().includes('mais algum sintoma') ||
                          content.toLowerCase().includes('algo mais');

    // Verifica se é uma resposta conclusiva
    const isConclusive = content.toLowerCase().includes('importante buscar atendimento') ||
                        content.toLowerCase().includes('necessário consultar um médico') ||
                        content.toLowerCase().includes('recomendo que você procure');

    // Se alguma das condições for verdadeira, mostra os botões de ação
    if (hasRecommendation || isAskingToHelp || isConclusive) {
        const actionButtons = document.createElement('div');
        actionButtons.className = 'message-actions';
        actionButtons.innerHTML = `
            <button class="action-button" onclick="finishAttendance()">
                <i class="fas fa-check-circle"></i>
                Finalizar Atendimento
            </button>
            <button class="action-button" onclick="continueAttendance()">
                <i class="fas fa-plus-circle"></i>
                Continuar Atendimento
            </button>
        `;
        return actionButtons;
    }

    return false;
}

// Adiciona indicador de digitação
function showTypingIndicator() {
    const messagesContainer = document.querySelector('.chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    
    // Adiciona o avatar do bot
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = '<i class="fas fa-robot"></i>';
    typingDiv.appendChild(avatarDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<span></span><span></span><span></span>';
    typingDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
    
    return typingDiv;
}

// Remove o indicador de digitação
function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// Envia mensagem para o servidor
async function sendMessageToServer(message) {
    try {
        console.log('Enviando mensagem para o servidor:', { message, conversationHistory });
        
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        // Adiciona o token de autenticação se não for convidado
        if (!isGuest && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Prepara o histórico de conversa para envio
        const processedHistory = conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await fetch(`${SERVER_URL}/api/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ 
                message,
                isGuest,
                conversationHistory: processedHistory
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                if (!isGuest) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                }
                return null;
            }
            throw new Error(`Erro na resposta do servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('Resposta do servidor:', data);
        return data;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Variável para controlar o ID da conversa atual
let currentConversationId = null;

// Salva o histórico da conversa
async function saveConversationHistory() {
    try {
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');

        if (!conversationHistory.length) return;

    const symptoms = extractSymptoms(conversationHistory);
        const duration = calculateDuration(conversationHistory);
        const severity = getMaxSeverity(conversationHistory);

        const headers = {
            'Content-Type': 'application/json'
        };

        // Adiciona o token de autenticação se não for convidado
        if (!isGuest && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${SERVER_URL}/api/history`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                symptoms,
                severity,
                duration,
                conversation: conversationHistory,
                isGuest
            })
        });

        if (!response.ok) {
            // Se for erro de autenticação e não for convidado, apenas loga o erro
            if (response.status === 401 && !isGuest) {
                console.log('Erro de autenticação ao salvar histórico');
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.details || 'Erro ao salvar histórico');
        }

        const data = await response.json();
        console.log('Histórico salvo com sucesso:', data);
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
}

// Extrai os sintomas da conversa
function extractSymptoms(messages) {
    try {
        // Pega a primeira mensagem do usuário que geralmente contém os sintomas principais
        const userMessages = messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return 'Sem sintomas registrados';
        
        // Usa a primeira mensagem do usuário como sintomas principais
        const mainSymptoms = userMessages[0].content;
        
        // Garante que o retorno seja uma string
        return typeof mainSymptoms === 'string' ? mainSymptoms : 'Sem sintomas registrados';
    } catch (error) {
        console.error('Erro ao extrair sintomas:', error);
        return 'Erro ao extrair sintomas';
    }
}

// Função para calcular duração do atendimento
function calculateDuration(messages) {
    if (messages.length < 2) return '< 1 min';
    
    const start = new Date(messages[0].timestamp);
    const end = new Date(messages[messages.length - 1].timestamp);
    const diff = Math.floor((end - start) / 1000 / 60); // em minutos
    
    if (diff < 1) return '< 1 min';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff/60)}h ${diff%60}min`;
}

// Função para obter a maior gravidade do atendimento
function getMaxSeverity(messages) {
    let maxSeverity = 'low';
    
    messages.forEach(msg => {
        if (msg.role === 'assistant') {
            if (determineSeverity(msg.content) === 'high') maxSeverity = 'high';
            else if (determineSeverity(msg.content) === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
        }
    });
    
    return maxSeverity;
}

// Função para carregar um atendimento específico
function loadAttendance(attendance) {
    console.log('Carregando atendimento:', attendance);
    chatMessages.innerHTML = '';
    conversationHistory = attendance.messages || [];
    
    // Se não houver mensagens, adiciona a mensagem inicial
    if (!attendance.messages || attendance.messages.length === 0) {
        addMessage(WELCOME_MESSAGE, true);
        return;
    }
    
    // Adiciona as mensagens do histórico
    attendance.messages.forEach(msg => {
        addMessage(msg.content, msg.role === 'assistant');
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Função para visualizar uma conversa específica
async function viewConversation(chatId) {
    try {
        console.log('Visualizando conversa:', chatId);
        
        // Se já estiver visualizando este atendimento, não faz nada
        if (currentViewingId === chatId) {
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Faça login para acessar seu histórico', 'info');
            return;
        }

        // Faz backup da conversa atual antes de visualizar outra
        if (!isViewingHistory) {
            currentConversationBackup = [...conversationHistory];
            isViewingHistory = true;
        }

        // Mostra indicador de carregamento
        const loadingToast = showToast('Carregando conversa...', 'info', true);

        try {
        // Carrega as mensagens do atendimento
        const response = await fetch(`${SERVER_URL}/api/history/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar conversa');
        }

        const chat = await response.json();
        
            // Remove o indicador de carregamento
            if (loadingToast && loadingToast.remove) {
                loadingToast.remove();
            }

            // Atualiza o ID do atendimento sendo visualizado
            currentViewingId = chatId;

            // Limpa o chat atual
            if (chatMessages) {
                chatMessages.innerHTML = '';

                // Exibe cada mensagem da conversa
                if (chat && chat.conversation && Array.isArray(chat.conversation)) {
                    chat.conversation.forEach(message => {
                        if (message && message.content) {
                            addMessage(message.content, message.role === 'assistant');
                        }
                    });

        // Adiciona botão para voltar ao histórico
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message bot-message';
        actionsDiv.innerHTML = `
            <div class="message-content">
                <div class="attendance-actions">
                    <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                                    <i class="fas fa-arrow-left"></i>
                        Voltar ao Atendimento Atual
                    </button>
                </div>
            </div>
        `;
        chatMessages.appendChild(actionsDiv);
                }
            }
    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        showToast('Erro ao carregar conversa. Tente novamente.', 'error');
        }
    } catch (error) {
        console.error('Erro ao visualizar conversa:', error);
        showToast('Erro ao visualizar conversa. Tente novamente.', 'error');
    }
}

// Função para exibir uma conversa específica
function displayConversation(chat) {
    clearChat();
    chat.conversation.forEach(message => {
        addMessage(message.content, message.role === 'assistant');
    });
}

// Atualizar histórico após cada conversa
async function updateHistory() {
    await loadUserHistory();
}

function displayHistory(history) {
    // Limpa mensagens atuais
    chatMessages.innerHTML = '';
    
    // Cria o container principal do histórico
    const historyContainer = document.createElement('div');
    historyContainer.className = 'history-container';
    
    // Adiciona o cabeçalho
    const header = document.createElement('div');
    header.className = 'history-header';
    header.innerHTML = `
            <h3><i class="fas fa-history"></i> Histórico de Atendimentos</h3>
            <p>Selecione um atendimento para visualizar:</p>
    `;
    historyContainer.appendChild(header);
    
    // Cria a lista de atendimentos com rolagem própria
    const attendanceList = document.createElement('div');
    attendanceList.className = 'attendance-list';
    
    if (history.length === 0) {
        attendanceList.innerHTML = '<p class="text-center text-muted">Nenhum histórico encontrado</p>';
    } else {
        history.forEach(att => {
            const attendanceItem = document.createElement('div');
            attendanceItem.className = 'attendance-item';
            attendanceItem.setAttribute('data-id', att._id);
            attendanceItem.innerHTML = `
                            <div class="attendance-header">
                                <span class="attendance-date">
                                    <i class="far fa-calendar"></i>
                                    ${new Date(att.timestamp).toLocaleString()}
                                </span>
                                <span class="attendance-duration">
                                    <i class="far fa-clock"></i>
                                    ${att.duration || '< 1 min'}
                                </span>
                            </div>
                            <div class="attendance-details">
                                <div class="attendance-symptoms">
                                    <strong>Sintomas:</strong> ${att.symptoms || 'Não informado'}
                                </div>
                                <div class="attendance-severity ${att.severity ? att.severity.toLowerCase().replace(' ', '-') : 'não-informado'}">
                                    <i class="fas fa-exclamation-circle"></i>
                                    ${att.severity || 'Não informado'}
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm view-conversation" onclick="viewConversation('${att._id}')">
                                <i class="fas fa-eye"></i> Visualizar
                            </button>
            `;
            attendanceList.appendChild(attendanceItem);
        });
    }
    
    historyContainer.appendChild(attendanceList);
    
    // Adiciona o botão de voltar no final
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'attendance-actions';
    actionsDiv.innerHTML = `
                <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar ao Atendimento Atual
                </button>
    `;
    historyContainer.appendChild(actionsDiv);
    
    // Adiciona o container ao chat
    chatMessages.appendChild(historyContainer);
    
    // Adiciona estilos dinâmicos para o histórico
    const style = document.createElement('style');
    style.textContent = `
        .history-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: calc(100vh - 200px);
            padding: 20px;
            background: var(--bg-color);
            border-radius: 15px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }
        
        .history-header {
            margin-bottom: 15px;
        }
        
        .history-header h3 {
            font-size: 1.2em;
            color: var(--text-color);
            margin-bottom: 4px;
            font-weight: 500;
        }
        
        .history-header p {
            color: var(--text-color-secondary);
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .attendance-list {
            flex: 1;
            overflow-y: auto;
            padding-right: 12px;
            margin-bottom: 15px;
        }
        
        .attendance-item {
            background: var(--card-bg-color);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 8px;
            border: 1px solid rgba(0,0,0,0.05);
            transition: all 0.2s ease;
        }
        
        .attendance-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .attendance-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 0.85em;
            color: var(--text-color-secondary);
        }
        
        .attendance-date, .attendance-duration {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .attendance-details {
            margin: 8px 0;
        }
        
        .attendance-symptoms {
            margin-bottom: 6px;
            color: var(--text-color);
            font-size: 0.9em;
        }
        
        .attendance-severity {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.8em;
            padding: 3px 6px;
            border-radius: 4px;
            background: rgba(0,0,0,0.04);
            color: var(--text-color-secondary);
        }
        
        .btn.btn-primary.btn-sm.view-conversation {
            width: 100%;
            margin-top: 8px;
            padding: 6px;
            border-radius: 6px;
            background: var(--primary-color);
            border: none;
            color: white;
            font-size: 0.85em;
            opacity: 0.9;
            transition: opacity 0.2s;
        }
        
        .btn.btn-primary.btn-sm.view-conversation:hover {
            opacity: 1;
        }
        
        .attendance-actions {
            margin-top: auto;
            padding-top: 15px;
            border-top: 1px solid rgba(0,0,0,0.06);
        }
        
        .attendance-button.continue {
            width: 100%;
            padding: 10px;
            border-radius: 8px;
            background: var(--primary-color);
            color: white;
            border: none;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            opacity: 0.9;
            transition: all 0.2s;
        }
        
        .attendance-button.continue:hover {
            opacity: 1;
            transform: translateY(-1px);
        }
        
        /* Estilização da barra de rolagem */
        .attendance-list::-webkit-scrollbar {
            width: 4px;
        }
        
        .attendance-list::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .attendance-list::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.1);
            border-radius: 2px;
        }
        
        .attendance-list::-webkit-scrollbar-thumb:hover {
            background: rgba(0,0,0,0.15);
        }
    `;
    document.head.appendChild(style);
}

// Função para retornar ao atendimento atual
async function returnToCurrentAttendance() {
    console.log('Retornando ao atendimento atual...');
    try {
        removeAllToasts();
        const loadingToast = showToast('Carregando atendimento atual...', 'info', true);
        currentViewingId = null;
        isViewingHistory = false;
        if (chatMessages) {
            // Limpa o chat completamente
            while (chatMessages.firstChild) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
            if (currentConversationBackup && currentConversationBackup.length > 0) {
                // Sincroniza o histórico real com o backup
                conversationHistory = [...currentConversationBackup];
                // Se for o início da conversa, mostra sintomas rápidos
                if (currentConversationBackup.length === 1 && currentConversationBackup[0].role === 'assistant') {
                    const quickSymptomsContainer = createQuickSymptoms();
                    if (quickSymptomsContainer && chatMessages) {
                        chatMessages.appendChild(quickSymptomsContainer);
                    }
                }
                // Exibe apenas as mensagens do backup, sem adicionar ao histórico
                currentConversationBackup.forEach(message => {
                    if (message && message.content) {
                        addMessage(message.content, message.role === 'assistant', false, false);
                    }
                });
            } else {
                startNewSession();
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        if (loadingToast && loadingToast.remove) {
            loadingToast.remove();
        }
        showToast('Atendimento atual restaurado', 'success');
    } catch (error) {
        console.error('Erro ao retornar ao atendimento atual:', error);
        showToast('Erro ao retornar ao atendimento atual. Tente novamente.', 'error');
    }
}

// Função para iniciar novo atendimento
function startNewSession() {
    console.log('Iniciando nova sessão...');
    // Limpa o chat
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
    chatMessages.innerHTML = '';
    }
    // Reseta o histórico
    conversationHistory = [];
    // Adiciona sintomas rápidos novamente
    const quickSymptomsContainer = createQuickSymptoms();
    if (quickSymptomsContainer && chatMessages) {
        chatMessages.appendChild(quickSymptomsContainer);
    }
    // Adiciona a mensagem inicial
    addMessage(WELCOME_MESSAGE, true);
    // Reseta o progresso
    updateProgress(0);
    // Fecha o modal de confirmação se estiver aberto
    const modalOverlay = document.getElementById('confirmationOverlay');
    const modal = document.getElementById('confirmationModal');
    if (modalOverlay && modal) {
        modalOverlay.classList.remove('active');
        modal.classList.remove('active');
    }
}

// Função para mostrar histórico
async function showAttendanceHistory() {
    console.log('Mostrando histórico...');
    try {
        const token = localStorage.getItem('authToken');
        const isGuest = localStorage.getItem('guestMode') === 'true';

        if (!token && !isGuest) {
            showToast('Faça login para acessar seu histórico de atendimentos', 'info');
            return;
        }

        // Faz backup da conversa atual ao abrir o histórico
        if (!isViewingHistory) {
            currentConversationBackup = [...conversationHistory];
            isViewingHistory = true;
        }

        // Mostra indicador de carregamento
        const loadingToast = showToast('Carregando histórico...', 'info', true);

        const response = await fetch(`${SERVER_URL}/api/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar histórico');
        }

        const history = await response.json();
        // Remove o indicador de carregamento
        loadingToast.remove();
        // Limpa o chat atual
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        // Exibe o histórico
        displayHistory(history);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        showToast('Erro ao carregar histórico. Tente novamente.', 'error');
    }
}

// Função para carregar histórico do usuário
async function loadUserHistory() {
    try {
        const token = localStorage.getItem('authToken');
        const isGuest = localStorage.getItem('guestMode') === 'true';
        console.log('Tentando carregar histórico com token:', token ? 'Presente' : 'Ausente', 'Convidado:', isGuest);

        // Se for convidado, não tenta carregar histórico
        if (isGuest) {
            console.log('Usuário é convidado, não carregando histórico');
            return;
        }

        if (!token) {
            console.log('Token não encontrado');
            return;
        }

        const response = await fetch(`${SERVER_URL}/api/history`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token inválido ou expirado');
                return;
            }
            throw new Error('Erro ao carregar histórico');
        }

        const data = await response.json();
        displayHistory(data);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        showToast('Erro ao carregar histórico. Tente novamente mais tarde', 'error');
    }
}

// Função para atualizar a barra de progresso
function updateProgress(step = 1) {
    triageProgress = Math.min(100, triageProgress + (step * (100 / TRIAGE_STEPS)));
    const progressBar = document.getElementById('triageProgress');
    progressBar.style.width = `${triageProgress}%`;
}

// Função para determinar a gravidade baseada no texto
function determineSeverity(text) {
    text = text.toLowerCase();
    
    // Verifica palavras-chave de alta gravidade
    if (SEVERITY_KEYWORDS.high.some(keyword => text.includes(keyword))) {
        return 'high';
    }
    
    // Verifica palavras-chave de média gravidade
    if (SEVERITY_KEYWORDS.medium.some(keyword => text.includes(keyword))) {
        return 'medium';
    }
    
    // Verifica números na escala de dor
    const painLevel = text.match(/\b(?:dor|nível)\b.*?(\d+)/i);
    if (painLevel) {
        const level = parseInt(painLevel[1]);
        if (level >= 8) return 'high';
        if (level >= 5) return 'medium';
    }
    
    return 'low';
}

// Função para criar indicador de gravidade
function createSeverityIndicator(severity) {
    const severityIcons = {
        low: 'fa-info-circle',
        medium: 'fa-exclamation-circle',
        high: 'fa-exclamation-triangle'
    };
    
    const severityTexts = {
        low: 'Gravidade Baixa',
        medium: 'Gravidade Moderada',
        high: 'Gravidade Alta'
    };
    
    const div = document.createElement('div');
    div.className = `severity-indicator severity-${severity}`;
    div.innerHTML = `
        <i class="fas ${severityIcons[severity]}"></i>
        <span>${severityTexts[severity]}</span>
    `;
    
    return div;
}

// Função para criar botões de ação do atendimento
function createAttendanceActions() {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'attendance-actions';
    
    // Verifica se já houve uma recomendação médica clara
    const hasImportantRecommendation = conversationHistory.some(msg => 
        msg.role === 'assistant' && (
            msg.content.toLowerCase().includes('importante buscar atendimento') ||
            msg.content.toLowerCase().includes('necessário consultar um médico') ||
            msg.content.toLowerCase().includes('recomendo que você procure')
        )
    );
    
    actionsDiv.innerHTML = `
        <button class="attendance-button continue" onclick="continueAttendance()">
            <i class="fas fa-comments"></i>
            Continuar Atendimento
        </button>
        ${hasImportantRecommendation ? `
        <button class="attendance-button finish" onclick="finishAttendance()">
            <i class="fas fa-check-circle"></i>
            Finalizar Atendimento
        </button>
        ` : ''}
    `;
    
    return actionsDiv;
}

// Função para continuar o atendimento
function continueAttendance() {
    addMessage("Como posso ajudar mais?", true);
}

// Função para finalizar o atendimento
function finishAttendance() {
    const summary = createAttendanceSummary();
    addMessage(summary.outerHTML, true);
    
    const finalMessage = {
        role: 'system',
        content: `${SYMPTOM_EMOJIS.general} Atendimento finalizado!\n\nCaso seus sintomas se agravem ou surjam novos sintomas, não hesite em iniciar um novo atendimento ou procurar ajuda médica presencial.\n\nNúmeros de emergência:\n📞 SAMU: 192\n📞 Bombeiros: 193`
    };
    
    setTimeout(() => {
        addMessage(finalMessage.content, true);
        conversationHistory.push(finalMessage);
    }, 1000);
}

// Adiciona event listeners para resetar o timeout quando houver interação
if (userInput) {
userInput.addEventListener('keypress', startInactivityCheck);
userInput.addEventListener('input', startInactivityCheck);
}

const chatMessagesElement = document.querySelector('.chat-messages');
if (chatMessagesElement) {
    chatMessagesElement.addEventListener('click', startInactivityCheck);
    chatMessagesElement.addEventListener('touchstart', startInactivityCheck);
}

// Função para inicializar o painel de acessibilidade
function initializeAccessibilityPanel() {
    console.log('Inicializando painel de acessibilidade');
    
    // Configura o botão de acessibilidade
    const accessibilityToggle = document.getElementById('accessibilityToggle');
    const accessibilityPanel = document.getElementById('accessibilityPanel');
    const accessibilityOverlay = document.getElementById('accessibilityOverlay');
    const closeAccessibility = document.getElementById('closeAccessibility');
    
    console.log('Elementos encontrados:', {
        toggle: !!accessibilityToggle,
        panel: !!accessibilityPanel,
        overlay: !!accessibilityOverlay,
        closeButton: !!closeAccessibility
    });

    // Configura o botão de acessibilidade
    if (accessibilityToggle) {
        console.log('Configurando botão de acessibilidade');
        accessibilityToggle.addEventListener('click', function(e) {
            e.preventDefault();
        e.stopPropagation();
            console.log('Botão de acessibilidade clicado');
            if (accessibilityPanel && accessibilityOverlay) {
        accessibilityPanel.classList.toggle('active');
        accessibilityOverlay.classList.toggle('active');
                console.log('Estado do painel:', {
                    panelActive: accessibilityPanel.classList.contains('active'),
                    overlayActive: accessibilityOverlay.classList.contains('active')
                });
            } else {
                console.error('Painel ou overlay não encontrado');
            }
        });
    } else {
        console.error('Botão de acessibilidade não encontrado');
    }
    
    // Configura o botão de fechar
    if (closeAccessibility) {
        console.log('Configurando botão de fechar');
        closeAccessibility.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão de fechar clicado');
            if (accessibilityPanel && accessibilityOverlay) {
        accessibilityPanel.classList.remove('active');
        accessibilityOverlay.classList.remove('active');
                console.log('Painel fechado');
            }
        });
    }

    // Configura o overlay
    if (accessibilityOverlay) {
        console.log('Configurando overlay');
        accessibilityOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Overlay clicado');
            if (accessibilityPanel) {
        accessibilityPanel.classList.remove('active');
        accessibilityOverlay.classList.remove('active');
                console.log('Painel fechado pelo overlay');
            }
    });
    }
    
    // Configura os botões de fonte
    const fontButtons = document.querySelectorAll('.font-buttons-container .font-button');
    if (fontButtons.length > 0) {
        console.log('Configurando botões de fonte:', fontButtons.length);
    fontButtons.forEach(button => {
        button.addEventListener('click', () => {
            const size = button.dataset.size;
                console.log('Alterando tamanho da fonte para:', size);
            setFontSize(size);
            fontButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            saveAccessibilityPreferences();
        });
    });
    } else {
        console.warn('Nenhum botão de fonte encontrado');
    }
    
    // Configura os botões de espaçamento
    const spacingButtons = document.querySelectorAll('.spacing-buttons-container .spacing-button');
    if (spacingButtons.length > 0) {
        console.log('Configurando botões de espaçamento:', spacingButtons.length);
    spacingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const spacing = button.dataset.spacing;
                console.log('Alterando espaçamento para:', spacing);
            setTextSpacing(spacing);
            spacingButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            saveAccessibilityPreferences();
        });
    });
    } else {
        console.warn('Nenhum botão de espaçamento encontrado');
    }
    
    // Configura o toggle de dislexia
    const dyslexicToggle = document.getElementById('dyslexicToggle');
    if (dyslexicToggle) {
        console.log('Configurando toggle de dislexia');
    dyslexicToggle.addEventListener('change', () => {
            console.log('Toggle de dislexia alterado:', dyslexicToggle.checked);
        document.body.classList.toggle('dyslexic-font', dyslexicToggle.checked);
        saveAccessibilityPreferences();
    });
    }

    // Configura o toggle de voz
    const voiceToggle = document.getElementById('voiceToggle');
    if (voiceToggle) {
        console.log('Configurando toggle de voz');
        voiceToggle.addEventListener('change', () => {
            console.log('Toggle de voz alterado:', voiceToggle.checked);
            if (voiceToggle.checked) {
                initializeVoiceRecognition();
        } else {
                stopVoiceRecognition();
            }
            updateVoiceButtonVisibility();
            saveAccessibilityPreferences();
        });
    }

    // Carrega as preferências salvas
    loadAccessibilityPreferences();
}

// Função para alternar o tema
function toggleTheme() {
    console.log('Alternando tema...');
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Atualiza o ícone
    const themeIcon = document.querySelector('.theme-toggle i');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Função para carregar o tema preferido
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    // Atualiza todos os ícones de tema
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// Carrega o tema ao iniciar
loadTheme();

// Função para criar sintomas rápidos
function createQuickSymptoms() {
    console.log('Criando sintomas rápidos...');
    const container = document.createElement('div');
    container.className = 'quick-symptoms';
    
    // Remove qualquer container de sintomas existente
    const existingContainer = document.querySelector('.quick-symptoms');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    commonSymptoms.forEach(symptom => {
        const button = document.createElement('button');
        button.className = 'symptom-button';
        button.innerHTML = `<i class="fas ${symptom.icon}"></i>${symptom.text}`;
        button.onclick = () => {
            if (userInput) {
            userInput.value = `Estou com ${symptom.text.toLowerCase()}`;
            handleSendMessage();
            }
        };
        container.appendChild(button);
    });
    
    return container;
}

// Função para criar escala de dor
function createPainScale() {
    const painScale = document.createElement('div');
    painScale.className = 'pain-scale';
    
    painScale.innerHTML = `
        <div class="pain-scale-title">Qual a intensidade da sua dor?</div>
        <div class="pain-buttons">
            ${Array.from({length: 11}, (_, i) => `
                <button class="pain-button" 
                        data-level="${i <= 3 ? '0-3' : i <= 7 ? '4-7' : '8-10'}" 
                        onclick="selectPainLevel(${i})">${i}</button>
            `).join('')}
        </div>
    `;
    
    return painScale;
}

// Função para selecionar nível de dor
function selectPainLevel(level) {
    userInput.value = `Minha dor está no nível ${level} de 10`;
    handleSendMessage();
}

// Função para criar o componente de feedback
function createFeedback() {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-container';
    feedbackDiv.innerHTML = `
        <div class="feedback-title" style="font-size: 1.2em; font-weight: 600; margin-bottom: 10px; text-align: center;">Como foi seu atendimento?</div>
        <div class="stars-container" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 10px;">
            ${Array.from({length: 5}, (_, i) => `
                <button class="star-button" onclick="rateFeedback(${i + 1})" style="background: none; border: none; cursor: pointer; font-size: 2em; color: #FFD700; transition: transform 0.2s;">
                    <i class="fas fa-star"></i>
                </button>
            `).join('')}
        </div>
        <textarea class="feedback-input" placeholder="Deixe seu comentário ou sugestão (opcional)" style="width: 100%; border-radius: 8px; border: 1px solid #ccc; padding: 8px; margin-bottom: 10px; resize: vertical;"></textarea>
        <div class="action-buttons" style="display: flex; gap: 10px; justify-content: center;">
            <button class="action-button" onclick="submitFeedback()" style="background: #2196F3; color: white; border: none; border-radius: 20px; padding: 10px 20px; font-weight: 500; cursor: pointer;">
                <i class="fas fa-paper-plane"></i>
                Enviar Feedback
            </button>
            <button class="action-button secondary" onclick="exportToPDF()" style="background: white; color: #2196F3; border: 1px solid #2196F3; border-radius: 20px; padding: 10px 20px; font-weight: 500; cursor: pointer;">
                <i class="fas fa-file-pdf"></i>
                Exportar PDF
            </button>
        </div>
    `;
    return feedbackDiv;
}

// Função para avaliar com estrelas
function rateFeedback(stars) {
    const starButtons = document.querySelectorAll('.star-button i');
    starButtons.forEach((star, index) => {
        star.style.color = index < stars ? '#FFC107' : '#ccc';
    });
    window.currentRating = stars;
}

// Função para enviar feedback
function submitFeedback() {
    const rating = window.currentRating || 0;
    const comment = document.querySelector('.feedback-input').value;
    
    // Aqui você pode implementar o envio do feedback para o servidor
    console.log('Feedback:', { rating, comment });
    
    // Mostra mensagem de sucesso
    showToast('Obrigado pelo seu feedback!');
    
    // Limpa o formulário
    document.querySelector('.feedback-input').value = '';
    rateFeedback(0);
}

// Função para limpar o texto de caracteres especiais e emojis
function cleanTextForPDF(text) {
    return text
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Remove emojis
        .replace(/<br>/g, '\n') // Converte <br> em quebras de linha reais
        .replace(/\s*<br\/>\s*/g, '\n') // Converte <br/> em quebras de linha reais
        .replace(/\s*\n\s*/g, '\n') // Normaliza quebras de linha
        .replace(/\n+/g, '\n') // Remove quebras de linha duplicadas
        .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '') // Mantém caracteres básicos latinos, acentos e quebras de linha
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}

// Função para exportar conversa para PDF
async function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações de fonte e margens
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 7;
        let yPosition = 20;
        
        // Adiciona título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Relatório de Atendimento - Triagem Médica", margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Adiciona data
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const currentDate = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${currentDate}`, margin, yPosition);
        yPosition += lineHeight * 2;
        
        // Função auxiliar para adicionar texto com quebra de linha
        function addWrappedText(text, y) {
            const textWidth = pageWidth - 2 * margin;
            const paragraphs = text.split('\n');
            let currentY = y;
            for (const paragraph of paragraphs) {
                if (paragraph.trim()) {
                    const splitText = doc.splitTextToSize(paragraph.trim(), textWidth);
                    doc.text(splitText, margin, currentY);
                    currentY += (splitText.length * lineHeight);
                }
                currentY += lineHeight;
            }
            return currentY;
        }
        
        // Adiciona mensagens (removendo duplicatas por conteúdo e papel)
        doc.setFontSize(11);
        const seen = new Set();
        for (const message of conversationHistory) {
            const key = message.role + '|' + message.content;
            if (!message.content.trim() || seen.has(key)) continue;
            seen.add(key);
            const cleanedContent = cleanTextForPDF(message.content);
            const prefix = message.role === 'assistant' ? 'Médico: ' : 'Paciente: ';
            const text = `${prefix}${cleanedContent}`;
            yPosition = addWrappedText(text, yPosition);
            yPosition += lineHeight;
            if (yPosition > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPosition = margin;
            }
        }
        doc.save('triagem-medica.pdf');
        showToast('PDF gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
}

// Função para mostrar toast
function showToast(message, type = 'success', persistent = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' :
                type === 'info' ? 'fa-info-circle' : 'fa-check-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    if (!persistent) {
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    return toast;
}

// Função para inicializar o botão de emergência
function initializeEmergencyButton() {
    try {
        const emergencyButton = document.querySelector('.emergency-menu-button');
        const emergencyPanel = document.getElementById('emergencyPanel');
        const menuOverlay = document.getElementById('menuOverlay');
        const closeEmergency = document.querySelector('#emergencyPanel .close-button');

        if (!emergencyButton || !emergencyPanel || !menuOverlay || !closeEmergency) {
            console.log('Elementos de emergência não encontrados:', {
                button: !!emergencyButton,
                panel: !!emergencyPanel,
                overlay: !!menuOverlay,
                closeButton: !!closeEmergency
            });
            return;
        }

        // Remove listeners antigos se existirem
        emergencyButton.removeEventListener('click', handleEmergencyClick);
        menuOverlay.removeEventListener('click', handleOverlayClick);
        closeEmergency.removeEventListener('click', handleCloseEmergencyClick);

        // Adiciona novos listeners
        emergencyButton.addEventListener('click', handleEmergencyClick);
        menuOverlay.addEventListener('click', handleOverlayClick);
        closeEmergency.addEventListener('click', handleCloseEmergencyClick);

        console.log('Botão de emergência configurado com sucesso');
    } catch (error) {
        console.error('Erro ao configurar botão de emergência:', error);
    }
}

function handleCloseEmergencyClick(e) {
    e.stopPropagation();
    const emergencyPanel = document.getElementById('emergencyPanel');
    const menuOverlay = document.getElementById('menuOverlay');
    if (emergencyPanel && menuOverlay) {
        emergencyPanel.classList.remove('active');
        menuOverlay.classList.remove('active');
    }
}

// Handlers para o botão de emergência
function handleEmergencyClick(e) {
    e.stopPropagation();
    const emergencyPanel = document.getElementById('emergencyPanel');
    const menuOverlay = document.getElementById('menuOverlay');
    if (emergencyPanel && menuOverlay) {
        emergencyPanel.classList.toggle('active');
        menuOverlay.classList.toggle('active');
    }
}

function handleOverlayClick() {
    const emergencyPanel = document.getElementById('emergencyPanel');
    const menuOverlay = document.getElementById('menuOverlay');
    if (emergencyPanel && menuOverlay) {
            emergencyPanel.classList.remove('active');
        menuOverlay.classList.remove('active');
        }
}

// Função para atualizar visibilidade do botão de voz
function updateVoiceButtonVisibility() {
    if (voiceButton && voiceToggle) {
        voiceButton.style.display = voiceToggle.checked ? 'block' : 'none';
    }
}

// Função para inicializar o reconhecimento de voz
function initializeVoiceRecognition() {
    try {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Reconhecimento de voz não suportado neste navegador');
            if (voiceButton) voiceButton.style.display = 'none';
            if (voiceToggle) voiceToggle.checked = false;
        return;
    }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            console.log('Reconhecimento de voz iniciado');
            isListening = true;
            if (voiceButton) {
            voiceButton.classList.add('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-stop';
            }
            showTemporaryToast('Ouvindo...', 'info');
        };

        recognition.onend = () => {
            console.log('Reconhecimento de voz finalizado');
            isListening = false;
            if (voiceButton) {
            voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
            removeAllToasts();
        };

        recognition.onresult = (event) => {
            console.log('Resultado do reconhecimento recebido');
            const transcript = event.results[0][0].transcript;
            console.log('Texto reconhecido:', transcript);
            if (userInput) {
            userInput.value = transcript;
            handleSendMessage();
            }
            removeAllToasts();
        };

        recognition.onerror = (event) => {
            console.error('Erro no reconhecimento de voz:', event.error);
        isListening = false;
            if (voiceButton) {
        voiceButton.classList.remove('recording');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
            }
            showTemporaryToast('Erro no reconhecimento de voz. Tente novamente.', 'error');
        };

        console.log('Reconhecimento de voz inicializado com sucesso');
        return true;

        } catch (error) {
        console.error('Erro ao inicializar reconhecimento de voz:', error);
        if (voiceButton) voiceButton.style.display = 'none';
        if (voiceToggle) voiceToggle.checked = false;
        return false;
    }
}

// Função para mostrar toast temporário
function showTemporaryToast(message, type = 'success', duration = 3000) {
    removeAllToasts(); // Remove toasts existentes
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 
                       type === 'info' ? 'fa-info-circle' : 'fa-check-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// Função para remover todos os toasts
function removeAllToasts() {
    const toasts = document.querySelectorAll('.toast');
    toasts.forEach(toast => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    });
}

// Função para fazer logout
function handleLogout() {
    console.log('Fazendo logout...');
    // Limpa os dados de autenticação
    localStorage.removeItem('authToken');
    localStorage.removeItem('guestMode');
    localStorage.removeItem('userEmail');
    
    // Redireciona para a página de login
    window.location.href = 'login.html';
}

// Função para criar o resumo do atendimento
function createAttendanceSummary() {
    const summary = document.createElement('div');
    summary.className = 'attendance-summary';
    
    const maxSeverity = getMaxSeverity(conversationHistory);
    const symptoms = extractSymptoms(conversationHistory);
    const duration = Math.ceil((Date.now() - startTime) / 60000); // Duração em minutos
    
    summary.innerHTML = `
        <h3>${SYMPTOM_EMOJIS.general} Resumo do Atendimento</h3>
        <div class="attendance-summary-content">
            <div class="summary-item">
                <i class="fas fa-clipboard-list"></i>
                <div>
                    <strong>Sintomas Relatados:</strong><br>
                    ${symptoms}
                </div>
            </div>
            <div class="summary-item">
                <i class="fas fa-exclamation-circle"></i>
                <div>
                    <strong>Nível de Gravidade:</strong><br>
                    ${createSeverityIndicator(maxSeverity).outerHTML}
                </div>
            </div>
            <div class="summary-item">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>Duração do Atendimento:</strong><br>
                    ${duration} minutos
                </div>
            </div>
        </div>
        <div class="summary-actions">
            <button class="summary-button" onclick="downloadHistory()">
                <i class="fas fa-download"></i>
                Baixar Histórico
            </button>
            <button class="summary-button" onclick="scheduleFollowUp()">
                <i class="fas fa-calendar-plus"></i>
                Agendar Retorno
            </button>
            <button class="summary-button secondary" onclick="rateAttendance()">
                <i class="fas fa-star"></i>
                Avaliar Atendimento
            </button>
        </div>
    `;
    
    return summary;
}

// Função para baixar o histórico
function downloadHistory() {
    const history = conversationHistory.map(msg => {
        return `${msg.role.toUpperCase()}: ${msg.content}\n`;
    }).join('\n');
    
    const blob = new Blob([history], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `triagem-medica-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Função para agendar retorno
function scheduleFollowUp() {
    const message = {
        role: 'system',
        content: 'Para agendar um retorno, por favor entre em contato com nossa central de agendamento pelos telefones:\n\n📞 SAMU: 192\n📞 Bombeiros: 193\n\nOu procure a unidade de saúde mais próxima.'
    };
    addMessage(message.content, true);
}

// Função para avaliar o atendimento
function rateAttendance() {
    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'rating-container';
    ratingDiv.innerHTML = `
        <h4>Como você avalia este atendimento?</h4>
        <div class="rating-stars">
            ${Array.from({length: 5}, (_, i) => `
                <button class="rating-star" onclick="submitRating(${i + 1})">
                    <i class="fas fa-star"></i>
                </button>
            `).join('')}
        </div>
    `;
    
    addMessage(ratingDiv.outerHTML, true);
}

// Função para enviar avaliação
function submitRating(rating) {
    const message = {
        role: 'system',
        content: `Obrigado por avaliar nosso atendimento com ${rating} estrelas! 🌟\nSua opinião é muito importante para melhorarmos nosso serviço.`
    };
    addMessage(message.content, true);
}

// Modificar a função handleSendMessage para incluir as novas verificações
async function handleSendMessage() {
    console.log('Iniciando envio de mensagem...');
    
    if (!userInput || !userInput.value.trim()) {
        console.log('Input vazio, ignorando...');
        return;
    }

    const message = userInput.value.trim();
    userInput.value = '';

    try {
        // Reseta o timer de inatividade
        resetInactivityTimer();

        // Adiciona a mensagem do usuário ao chat e ao histórico
        addMessage(message, false);

        // Verifica se é um agradecimento
        if (containsThankWord(message)) {
            const thankResponse = {
                role: 'assistant',
                content: 'De nada! Posso ajudar com mais alguma coisa? Se não, podemos finalizar o atendimento.'
            };
            
            addMessage(thankResponse.content, true);
            
            // Adiciona botões de ação
            const actionButtons = document.createElement('div');
            actionButtons.className = 'message-actions';
            actionButtons.innerHTML = `
                <button class="action-button" onclick="finishAttendanceWithSummary()">
                    <i class="fas fa-check-circle"></i>
                    Finalizar Atendimento
                </button>
                <button class="action-button" onclick="continueAttendance()">
                    <i class="fas fa-comments"></i>
                    Continuar Atendimento
                </button>
            `;
            chatMessages.appendChild(actionButtons);
            return;
        }

        // Mostra o indicador de digitação
        const typingIndicator = showTypingIndicator();

        try {
            console.log('Enviando mensagem para o servidor:', message);
            // Envia a mensagem para o servidor
            const response = await sendMessageToServer(message);
            
            // Remove o indicador de digitação
            removeTypingIndicator(typingIndicator);

            if (response && response.message) {
                console.log('Resposta recebida:', response.message);
                // Adiciona a resposta do bot ao chat e ao histórico
                addMessage(response.message, true);
                // Atualiza o progresso da triagem
                updateProgress();

                // Salva o histórico
                await saveConversationHistory();

                // Rola para a última mensagem
                if (chatMessages) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } else {
                console.error('Resposta inválida do servidor');
                addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', true);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            removeTypingIndicator(typingIndicator);
            addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', true);
        }
    } catch (error) {
        console.error('Erro no handleSendMessage:', error);
        addMessage('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.', true);
    }
}

// Inicializa o timer de inatividade quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    resetInactivityTimer();
    
    // Reseta o timer quando houver interação do usuário
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
});

// Função para alternar o reconhecimento de voz
function toggleVoiceRecognition() {
    console.log('Alternando reconhecimento de voz');
    if (isListening) {
        stopVoiceRecognition();
                } else {
        startVoiceRecognition();
    }
}

// Função para parar o reconhecimento de voz
function stopVoiceRecognition() {
    console.log('Parando reconhecimento de voz');
    if (recognition) {
        recognition.stop();
        isListening = false;
        if (voiceButton) {
            voiceButton.classList.remove('recording');
            const icon = voiceButton.querySelector('i');
            if (icon) icon.className = 'fas fa-microphone';
        }
    }
}

// Função para iniciar o reconhecimento de voz
function startVoiceRecognition() {
    console.log('Iniciando reconhecimento de voz');
    if (recognition) {
        recognition.start();
        isListening = true;
        if (voiceButton) {
            voiceButton.classList.add('recording');
            const icon = voiceButton.querySelector('i');
            if (icon) icon.className = 'fas fa-stop';
        }
    }
}

// Função para inicializar a aplicação
async function initialize() {
    console.log('Inicializando aplicação...');
    
    try {
        // Verifica conexão com o servidor
        const isConnected = await checkServerConnection();
        if (!isConnected) {
            console.error('Não foi possível conectar ao servidor');
            return;
        }

        // Carrega o tema salvo
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        const themeIcon = document.querySelector('.theme-toggle i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }

        // Inicializa os componentes da interface
        console.log('Inicializando componentes...');
        initializeMobileMenu();
        initializeAccessibilityPanel();
        initializeEmergencyButton();
        initializeNewSessionButton();

        // Cria os sintomas rápidos
                const quickSymptomsContainer = createQuickSymptoms();
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.insertBefore(quickSymptomsContainer, chatContainer.firstChild);
        }

        // Configura o modo convidado/autenticado
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const historyButton = document.querySelector('.history-toggle');
        if (historyButton) {
            historyButton.style.display = isGuest ? 'none' : 'block';
        }

        // Inicia verificação de inatividade
        startInactivityCheck();

        console.log('Inicialização concluída com sucesso');
        return true;
    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        showToast('Erro ao inicializar a aplicação. Por favor, recarregue a página.', 'error');
        return false;
    }
}

// Função para salvar preferências de acessibilidade
function saveAccessibilityPreferences() {
    const preferences = {
        fontSize: document.documentElement.style.getPropertyValue('--font-size-base'),
        lineHeight: document.documentElement.style.getPropertyValue('--line-height'),
        letterSpacing: document.documentElement.style.getPropertyValue('--letter-spacing'),
        dyslexicFont: document.body.classList.contains('dyslexic-font'),
        voiceEnabled: document.getElementById('voiceToggle')?.checked || false
    };
    console.log('Salvando preferências:', preferences);
    localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
}

// Função para carregar preferências de acessibilidade
function loadAccessibilityPreferences() {
    const savedPreferences = localStorage.getItem('accessibilityPreferences');
    if (savedPreferences) {
        console.log('Carregando preferências:', savedPreferences);
        const preferences = JSON.parse(savedPreferences);
        
        // Aplica tamanho da fonte
        if (preferences.fontSize) {
            document.documentElement.style.setProperty('--font-size-base', preferences.fontSize);
            // Ativa o botão correspondente
            const size = getFontSizeClass(preferences.fontSize);
            const fontButton = document.querySelector(`.font-button[data-size="${size}"]`);
            if (fontButton) {
                document.querySelectorAll('.font-button').forEach(btn => btn.classList.remove('active'));
                fontButton.classList.add('active');
            }
        }
        
        // Aplica espaçamento
        if (preferences.lineHeight) {
            document.documentElement.style.setProperty('--line-height', preferences.lineHeight);
            // Ativa o botão correspondente
            const spacing = preferences.lineHeight === '2' ? 'large' : 'normal';
            const spacingButton = document.querySelector(`.spacing-button[data-spacing="${spacing}"]`);
            if (spacingButton) {
                document.querySelectorAll('.spacing-button').forEach(btn => btn.classList.remove('active'));
                spacingButton.classList.add('active');
            }
        }
        
        // Aplica fonte para dislexia
        const dyslexicToggle = document.getElementById('dyslexicToggle');
        if (preferences.dyslexicFont && dyslexicToggle) {
            document.body.classList.add('dyslexic-font');
            dyslexicToggle.checked = true;
        }
        
        // Aplica configuração de voz
        const voiceToggle = document.getElementById('voiceToggle');
        if (preferences.voiceEnabled && voiceToggle) {
            voiceToggle.checked = true;
            updateVoiceButtonVisibility();
        }
    }
}

// Função auxiliar para determinar a classe de tamanho da fonte
function getFontSizeClass(fontSize) {
    const size = parseInt(fontSize);
    if (size <= 12) return 'small';
    if (size <= 14) return 'medium';
    if (size <= 16) return 'large';
    return 'xlarge';
}

// Função para ajustar o tamanho da fonte
function setFontSize(size) {
    const root = document.documentElement;
    switch (size) {
        case 'small':
            root.style.setProperty('--font-size-base', '14px');
            document.body.style.fontSize = '14px';
            break;
        case 'medium':
            root.style.setProperty('--font-size-base', '16px');
            document.body.style.fontSize = '16px';
            break;
        case 'large':
            root.style.setProperty('--font-size-base', '18px');
            document.body.style.fontSize = '18px';
            break;
        case 'xlarge':
            root.style.setProperty('--font-size-base', '20px');
            document.body.style.fontSize = '20px';
            break;
    }
    saveAccessibilityPreferences();
}

// Função para ajustar o espaçamento do texto
function setTextSpacing(spacing) {
    const root = document.documentElement;
    switch (spacing) {
        case 'normal':
            root.style.setProperty('--line-height', '1.5');
            root.style.setProperty('--letter-spacing', 'normal');
            document.body.style.lineHeight = '1.5';
            document.body.style.letterSpacing = 'normal';
            document.body.setAttribute('data-spacing', 'normal');
            break;
        case 'large':
            root.style.setProperty('--line-height', '1.8');
            root.style.setProperty('--letter-spacing', '0.5px');
            document.body.style.lineHeight = '1.8';
            document.body.style.letterSpacing = '0.5px';
            document.body.setAttribute('data-spacing', 'large');
            break;
    }
    saveAccessibilityPreferences();
}

// Função para mostrar o modal de confirmação
function showConfirmationModal(message, onConfirm) {
    console.log('Mostrando modal de confirmação');
    const modalOverlay = document.getElementById('confirmationOverlay');
    const modalMessage = document.querySelector('#confirmationModal p');
    const confirmButton = document.getElementById('confirmNewSession');
    const cancelButton = document.getElementById('cancelNewSession');
    const modal = document.getElementById('confirmationModal');

    if (modalMessage) {
        const isGuest = localStorage.getItem('guestMode') === 'true';
        modalMessage.textContent = isGuest ? 
            'Tem certeza que deseja iniciar uma nova sessão? Como você não está logado, o histórico atual será perdido.' :
            'Tem certeza que deseja iniciar uma nova sessão?';
    }

    if (modalOverlay && modal) {
        modalOverlay.classList.add('active');
        modal.classList.add('active');
    }

    function handleConfirm() {
        console.log('Confirmação aceita');
        closeModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    }

    function handleCancel() {
        console.log('Confirmação cancelada');
        closeModal();
    }

    function closeModal() {
        console.log('Fechando modal');
        if (modalOverlay && modal) {
            modalOverlay.classList.remove('active');
            modal.classList.remove('active');
        }
        // Remove os event listeners antigos
        if (confirmButton) {
            confirmButton.removeEventListener('click', handleConfirm);
        }
        if (cancelButton) {
            cancelButton.removeEventListener('click', handleCancel);
        }
        if (modalOverlay) {
            modalOverlay.removeEventListener('click', handleCancel);
        }
    }

    // Adiciona os novos event listeners
    if (confirmButton) {
        confirmButton.addEventListener('click', handleConfirm);
    }
    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancel);
    }
    if (modalOverlay) {
        modalOverlay.addEventListener('click', handleCancel);
    }
}

// Função para configurar o botão de nova sessão
function initializeNewSessionButton() {
    console.log('Inicializando botão de nova sessão');
    const newButton = document.getElementById('newSessionButton');
    if (newButton) {
        newButton.addEventListener('click', () => {
            console.log('Botão nova sessão clicado');
            showConfirmationModal(
                'Tem certeza que deseja iniciar uma nova sessão? Todo o progresso atual será perdido.',
                startNewSession
            );
        });
    } else {
        console.error('Botão de nova sessão não encontrado');
    }
} 