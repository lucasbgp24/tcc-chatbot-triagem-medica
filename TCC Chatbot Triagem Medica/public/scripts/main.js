// Configuração inicial
const SERVER_URL = window.SERVER_URL || 'http://localhost:3001';

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
const WELCOME_MESSAGE = 'Olá! Sou um assistente de triagem médica. Por favor, descreva seus sintomas para que eu possa ajudar.';

let conversationHistory = [];

// Elementos do DOM
const chatMessages = document.querySelector('.chat-messages');
const userInput = document.querySelector('.chat-input');
const sendButton = document.querySelector('.send-button');
const connectionStatus = document.querySelector('.connection-status');
const clearButton = document.querySelector('.clear-button');
const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle?.querySelector('i');

// Lista de sintomas comuns com ícones
const commonSymptoms = [
    { text: 'Dor de cabeça', icon: 'fa-head-side-virus' },
    { text: 'Febre', icon: 'fa-temperature-high' },
    { text: 'Tosse', icon: 'fa-head-side-cough' },
    { text: 'Dor de garganta', icon: 'fa-head-side-mask' },
    { text: 'Náusea', icon: 'fa-face-dizzy' },
    { text: 'Dor no corpo', icon: 'fa-person-dots-from-line' }
];

// Variáveis para controle de inatividade
let inactivityTimeout;
const INACTIVITY_TIMEOUT = 60000; // 1 minuto de inatividade

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
const accessibilityToggle = document.getElementById('accessibilityToggle');
const accessibilityPanel = document.getElementById('accessibilityPanel');
const accessibilityOverlay = document.getElementById('accessibilityOverlay');
const closeAccessibility = document.getElementById('closeAccessibility');
const fontButtons = document.querySelectorAll('.font-button');
const spacingButtons = document.querySelectorAll('.spacing-button');
const dyslexicToggle = document.getElementById('dyslexicToggle');

// Elementos de voz
let voiceToggle = document.getElementById('voiceToggle');
let voiceButton = document.querySelector('.voice-button');
let recognition = null;
let isListening = false;

// Elementos de emergência
const emergencyButton = document.querySelector('.emergency-menu-button');
const emergencyPanel = document.getElementById('emergencyPanel');
const closeEmergency = document.querySelector('#emergencyPanel .close-button');
const menuOverlay = document.querySelector('.menu-overlay');
const emergencyContacts = document.querySelectorAll('.emergency-contact');

// Elementos do Modal de Confirmação
const confirmationOverlay = document.getElementById('confirmationOverlay');
const confirmationModal = document.getElementById('confirmationModal');
const confirmButton = document.querySelector('.confirm-button');
const cancelButton = document.querySelector('.cancel-button');
const newSessionButton = document.getElementById('newSessionButton');

// Elementos do DOM para o menu mobile
const menuMobile = document.querySelector('.menu-mobile');
const menuOverlayMobile = document.getElementById('menuOverlay');
const headerButtonsMobile = document.getElementById('headerButtons');

// Evento de clique no botão do menu mobile
menuMobile.addEventListener('click', () => {
    headerButtonsMobile.classList.toggle('active');
    menuOverlayMobile.classList.toggle('active');
});

// Fecha o menu ao clicar no overlay
menuOverlayMobile.addEventListener('click', () => {
    headerButtonsMobile.classList.remove('active');
    menuOverlayMobile.classList.remove('active');
});

// Evento de clique no botão de tema (tanto no desktop quanto no mobile)
document.querySelectorAll('.theme-toggle').forEach(button => {
    button.addEventListener('click', () => {
        toggleTheme();
        // Fecha o menu mobile se estiver aberto
        headerButtonsMobile.classList.remove('active');
        menuOverlayMobile.classList.remove('active');
    });
});

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

// Fecha o painel quando clicar no botão de fechar
closeEmergency.addEventListener('click', (e) => {
    e.stopPropagation();
    emergencyPanel.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Fecha o painel quando clicar no overlay
menuOverlay.addEventListener('click', () => {
    emergencyPanel.classList.remove('active');
    menuOverlay.classList.remove('active');
});

// Comportamento dos links de emergência
emergencyContacts.forEach(contact => {
    contact.addEventListener('click', (e) => {
        if (!isMobileDevice()) {
            e.preventDefault();
            const number = contact.querySelector('.contact-number').textContent;
            const name = contact.querySelector('.contact-name').textContent;
            
            // Copia o número para a área de transferência
            navigator.clipboard.writeText(number).then(() => {
                showToast(`Número ${number} (${name}) copiado para a área de transferência`, 'success');
            });
        }
        // Em dispositivos móveis, o comportamento padrão do href="tel:" será mantido
    });
});

// Verifica a conexão com o servidor
async function checkServerConnection() {
    try {
        console.log('Verificando conexão com o servidor...');
        const response = await fetch(`${SERVER_URL}/test`);
        const data = await response.json();
        
        // Verifica se o token expirou apenas para usuários não-convidados
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');
        
        if (!isGuest && authToken) {
            try {
                const tokenData = JSON.parse(atob(authToken.split('.')[1]));
                const expirationTime = tokenData.exp * 1000;
                
                if (Date.now() >= expirationTime) {
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return false;
                }
            } catch (error) {
                console.error('Erro ao verificar token:', error);
            }
        }
        
        connectionStatus.textContent = 'Conectado';
        connectionStatus.className = 'connection-status online';
        console.log('Servidor respondeu:', data);
        return true;
    } catch (error) {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.className = 'connection-status offline';
        console.error('Erro detalhado ao conectar ao servidor:', error);
        addMessage('⚠️ Erro de conexão: Não foi possível conectar ao servidor. Por favor, verifique se o servidor está rodando na porta 3000.');
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

// Adiciona uma mensagem ao chat
function addMessage(content, isBot = false) {
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
    contentDiv.textContent = content;
    
    if (isBot) {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Adiciona ao histórico
    conversationHistory.push({
        role: isBot ? 'assistant' : 'user',
        content: content,
        timestamp: new Date()
    });
    
    // Salva o histórico
    saveConversationHistory();
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

    // Retorna true se alguma das condições for verdadeira
    return hasRecommendation || isAskingToHelp || isConclusive;
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
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const authToken = localStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        
        const response = await fetch(`${SERVER_URL}/api/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                message,
                isGuest: isGuest
            })
        });

        if (response.status === 401) {
            // Se for convidado, não redireciona para login
            if (!isGuest) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return null;
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

// Variável global para controlar o ID do atendimento atual sendo visualizado
let currentViewingId = null;

// Função para visualizar uma conversa específica
async function viewConversation(chatId) {
    try {
        // Se já estiver visualizando este atendimento, não faz nada
        if (currentViewingId === chatId) {
            return;
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast('Faça login para acessar seu histórico', 'info');
            return;
        }

        // Atualiza o ID do atendimento sendo visualizado
        currentViewingId = chatId;

        // Limpa o chat atual
        chatMessages.innerHTML = '';
        
        // Procura o atendimento no histórico exibido
        const attendanceItem = document.querySelector(`[data-id="${chatId}"]`);
        if (attendanceItem) {
            const symptoms = attendanceItem.querySelector('.attendance-symptoms').textContent;
            const severity = attendanceItem.querySelector('.attendance-severity').textContent;
            const date = attendanceItem.querySelector('.attendance-date').textContent;
            
            // Adiciona cabeçalho do atendimento antigo
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message bot-message';
            headerDiv.innerHTML = `
                <div class="message-content">
                    <h3><i class="fas fa-history"></i> Atendimento Anterior</h3>
                    <p><strong>Data:</strong> ${date}</p>
                    <p>${symptoms}</p>
                    <p><strong>Gravidade:</strong> ${severity}</p>
                </div>
            `;
            chatMessages.appendChild(headerDiv);
        }

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
        
        // Exibe cada mensagem da conversa
        if (chat && chat.conversation) {
            chat.conversation.forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${message.role === 'assistant' ? 'bot-message' : 'user-message'}`;
                
                // Adiciona o avatar
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'message-avatar';
                if (message.role === 'assistant') {
                    avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
                    avatarDiv.style.backgroundColor = '#4CAF50';
                } else {
                    avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
                    avatarDiv.style.backgroundColor = '#2196F3';
                }
                
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                contentDiv.innerHTML = message.content;
                
                if (message.role === 'assistant') {
                    messageDiv.appendChild(avatarDiv);
                    messageDiv.appendChild(contentDiv);
                } else {
                    messageDiv.appendChild(contentDiv);
                    messageDiv.appendChild(avatarDiv);
                }
                
                chatMessages.appendChild(messageDiv);
            });
        }

        // Adiciona botão para voltar ao histórico
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message bot-message';
        actionsDiv.innerHTML = `
            <div class="message-content">
                <div class="attendance-actions">
                    <button class="attendance-button continue" onclick="showAttendanceHistory()">
                        <i class="fas fa-arrow-left"></i>
                        Voltar ao Histórico
                    </button>
                    <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                        <i class="fas fa-comments"></i>
                        Voltar ao Atendimento Atual
                    </button>
                </div>
            </div>
        `;
        chatMessages.appendChild(actionsDiv);

        // Rola para o topo da conversa
        chatMessages.scrollTop = 0;

    } catch (error) {
        console.error('Erro ao carregar conversa:', error);
        showToast('Erro ao carregar conversa. Tente novamente.', 'error');
        currentViewingId = null;
    }
}

// Função para exibir uma conversa específica
function displayConversation(chat) {
    clearChat();
    chat.conversation.forEach(message => {
        addMessage(message.content, message.role === 'assistant');
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando...');
    
    // Inicializa acessibilidade
    if (accessibilityToggle) {
        console.log('Configurando evento do botão de acessibilidade');
        accessibilityToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Botão de acessibilidade clicado');
            if (accessibilityPanel && accessibilityOverlay) {
                accessibilityPanel.classList.toggle('active');
                accessibilityOverlay.classList.toggle('active');
            }
        });
    } else {
        console.warn('Botão de acessibilidade não encontrado');
    }

    // Inicializa elementos de voz
    if (voiceButton) {
        console.log('Configurando evento do botão de voz');
        voiceButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Botão de voz clicado');
            if (!recognition) {
                initializeVoiceRecognition();
            }
            toggleVoiceRecognition();
        });
    } else {
        console.warn('Botão de voz não encontrado');
    }

    // Carrega preferências de acessibilidade
    loadAccessibilityPreferences();
});

// Atualizar histórico após cada conversa
async function updateHistory() {
    await loadUserHistory();
}

function displayHistory(history) {
    // Limpa mensagens atuais
    chatMessages.innerHTML = '';
    
    // Adiciona mensagem de seleção com mais detalhes
    const selectionMessage = document.createElement('div');
    selectionMessage.className = 'message bot-message';
    selectionMessage.innerHTML = `
        <div class="message-content">
            <h3><i class="fas fa-history"></i> Histórico de Atendimentos</h3>
            <p>Selecione um atendimento para visualizar:</p>
            <div class="attendance-list">
                ${history.length === 0 ? 
                    '<p class="text-center text-muted">Nenhum histórico encontrado</p>' :
                    history.map((att, index) => `
                        <div class="attendance-item" data-id="${att._id}">
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
                        </div>
                    `).join('')}
            </div>
            <div class="attendance-actions">
                <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar ao Atendimento Atual
                </button>
                <button class="attendance-button continue" onclick="startNewSession()">
                    <i class="fas fa-plus-circle"></i>
                    Novo Atendimento
                </button>
            </div>
        </div>
    `;
    chatMessages.appendChild(selectionMessage);
}

// Função para retornar ao atendimento atual
function returnToCurrentAttendance() {
    currentViewingId = null;
    const currentAttendance = localStorage.getItem('currentAttendance');
    if (currentAttendance) {
        try {
            const attendance = JSON.parse(currentAttendance);
            if (attendance && attendance.messages && attendance.messages.length > 0) {
                loadAttendance(attendance);
            } else {
                startNewSession();
            }
        } catch (error) {
            console.error('Erro ao carregar atendimento:', error);
            startNewSession();
        }
    } else {
        startNewSession();
    }
}

// Função para iniciar novo atendimento
function startNewSession() {
    currentViewingId = null;
    currentConversationId = null; // Reseta o ID da conversa
    
    // Limpa o chat e histórico
    chatMessages.innerHTML = '';
    conversationHistory = [];
    userInput.value = '';
    
    // Reseta estados
    triageProgress = 0;
    updateProgress();
    
    // Habilita input
    userInput.disabled = false;
    sendButton.disabled = false;
    
    // Remove o atendimento atual do localStorage
    localStorage.removeItem('currentAttendance');
    
    // Adiciona mensagem inicial
    addMessage(WELCOME_MESSAGE, true);
    
    // Esconde o modal de confirmação se estiver aberto
    if (confirmationOverlay && confirmationModal) {
        confirmationOverlay.classList.remove('active');
        confirmationModal.classList.remove('active');
    }
}

// Função para mostrar histórico de atendimentos
function showAttendanceHistory() {
    const token = localStorage.getItem('authToken');
    const isGuest = localStorage.getItem('guestMode') === 'true';

    if (!token || isGuest) {
        showToast('Faça login para acessar seu histórico de atendimentos', 'info');
        return;
    }

    // Esconde o botão de histórico para convidados
    const historyButton = document.querySelector('.history-toggle');
    if (historyButton) {
        historyButton.style.display = isGuest ? 'none' : 'block';
    }

    loadUserHistory();
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
    // Adiciona mensagem de finalização
    addMessage("Atendimento finalizado. Obrigado por utilizar nosso serviço! Se precisar de mais ajuda, você pode iniciar um novo atendimento a qualquer momento.", true);
    
    // Marca o atendimento como finalizado no servidor
    if (currentConversationId) {
        const token = localStorage.getItem('authToken');
        fetch(`${SERVER_URL}/api/history/${currentConversationId}/finish`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (!response.ok) {
                console.error('Erro ao finalizar atendimento:', response.status);
            } else {
                console.log('Atendimento finalizado com sucesso');
            }
        }).catch(error => {
            console.error('Erro ao finalizar atendimento:', error);
        });
    }
    
    // Adiciona o feedback após finalizar
    const messagesContainer = document.querySelector('.chat-messages');
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'message bot-message';
    
    // Adiciona o avatar do bot
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
    avatarDiv.style.backgroundColor = '#4CAF50';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.appendChild(createFeedback());
    
    feedbackDiv.appendChild(avatarDiv);
    feedbackDiv.appendChild(contentDiv);
    messagesContainer.appendChild(feedbackDiv);
    
    // Desabilita o input
    const userInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.send-button');
    userInput.disabled = true;
    sendButton.disabled = true;
    
    // Adiciona botão para novo atendimento
    const newSessionDiv = document.createElement('div');
    newSessionDiv.className = 'message bot-message';
    newSessionDiv.innerHTML = `
        <div class="message-content">
            <div class="attendance-actions">
                <button class="attendance-button continue" onclick="startNewSession()">
                    <i class="fas fa-plus-circle"></i>
                    Iniciar Novo Atendimento
                </button>
            </div>
        </div>
    `;
    messagesContainer.appendChild(newSessionDiv);
    
    // Reseta o ID da conversa atual
    currentConversationId = null;
    
    // Rola para o final
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// Adiciona event listeners para resetar o timeout quando houver interação
userInput.addEventListener('keypress', startInactivityCheck);
userInput.addEventListener('input', startInactivityCheck);
document.querySelector('.chat-messages').addEventListener('click', startInactivityCheck);
document.querySelector('.chat-messages').addEventListener('touchstart', startInactivityCheck);

// Função para verificar inatividade
function startInactivityCheck() {
    // Limpa timeout anterior se existir
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    
    // Define novo timeout
    inactivityTimeout = setTimeout(() => {
        // Só mostra se o chat não estiver finalizado
        const input = document.querySelector('.chat-input');
        if (!input.disabled) {
            addMessage("Notei que você está inativo. Gostaria de continuar o atendimento ou prefere finalizar?", true);
            
            const messagesContainer = document.querySelector('.chat-messages');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message bot-message';
            
            // Adiciona o avatar do bot
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            avatarDiv.innerHTML = '<i class="fas fa-user-md"></i>';
            avatarDiv.style.backgroundColor = '#4CAF50';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.appendChild(createAttendanceActions());
            
            actionsDiv.appendChild(avatarDiv);
            actionsDiv.appendChild(contentDiv);
            messagesContainer.appendChild(actionsDiv);
            
            // Rola para o final
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, INACTIVITY_TIMEOUT);
}

// Função para inicializar o painel de acessibilidade
function initializeAccessibilityPanel() {
    console.log('Inicializando painel de acessibilidade');
    
    // Configura o botão de fechar
    if (closeAccessibility) {
        closeAccessibility.addEventListener('click', (e) => {
            e.preventDefault();
            if (accessibilityPanel && accessibilityOverlay) {
                accessibilityPanel.classList.remove('active');
                accessibilityOverlay.classList.remove('active');
            }
        });
    }

    // Configura o overlay
    if (accessibilityOverlay) {
        accessibilityOverlay.addEventListener('click', () => {
            if (accessibilityPanel) {
                accessibilityPanel.classList.remove('active');
                accessibilityOverlay.classList.remove('active');
            }
        });
    }

    // Configura os botões de fonte
    if (fontButtons) {
        fontButtons.forEach(button => {
            button.addEventListener('click', () => {
                const size = button.dataset.size;
                setFontSize(size);
                fontButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                saveAccessibilityPreferences();
            });
        });
    }

    // Configura os botões de espaçamento
    if (spacingButtons) {
        spacingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const spacing = button.dataset.spacing;
                setTextSpacing(spacing);
                spacingButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                saveAccessibilityPreferences();
            });
        });
    }

    // Configura o toggle de dislexia
    if (dyslexicToggle) {
        dyslexicToggle.addEventListener('change', () => {
            document.body.classList.toggle('dyslexic-font', dyslexicToggle.checked);
            saveAccessibilityPreferences();
        });
    }

    // Configura o toggle de voz
    if (voiceToggle) {
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
}

// Adiciona a chamada da inicialização no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando...');
    initializeAccessibilityPanel();
    loadAccessibilityPreferences();
    initialize().catch(error => {
        console.error('Erro na inicialização:', error);
        startNewSession();
    });
});

// Adiciona event listener para o botão de enviar
sendButton.addEventListener('click', handleSendMessage);

// Adiciona event listener para a tecla Enter
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Previne o comportamento padrão
        handleSendMessage();
    }
});

// Event listener para o botão de histórico
const historyButton = document.querySelector('.history-toggle');
historyButton.addEventListener('click', showAttendanceHistory);

// Event listener para o botão de novo atendimento
clearButton.addEventListener('click', () => {
    showConfirmationModal();
});

// Event listeners para o modal de confirmação
document.getElementById('newSessionButton').addEventListener('click', (e) => {
    e.preventDefault();
    showConfirmationModal();
});

confirmButton.addEventListener('click', () => {
    hideConfirmationModal();
    startNewSession();
});

cancelButton.addEventListener('click', hideConfirmationModal);

// Fechar modal ao clicar no overlay
confirmationOverlay.addEventListener('click', (e) => {
    if (e.target === confirmationOverlay) {
        hideConfirmationModal();
    }
});

// Adiciona o event listener para o botão que abre o modal
document.getElementById('newChatButton').addEventListener('click', showConfirmationModal);

// Função para alternar o tema
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    
    // Atualiza todos os ícones de tema
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });
    
    // Salva a preferência do usuário
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
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

// Função para criar botões de sintomas rápidos
function createQuickSymptoms() {
    const quickSymptomsDiv = document.createElement('div');
    quickSymptomsDiv.className = 'quick-symptoms';
    
    commonSymptoms.forEach(symptom => {
        const button = document.createElement('button');
        button.className = 'symptom-button';
        button.innerHTML = `<i class="fas ${symptom.icon}"></i>${symptom.text}`;
        button.onclick = () => {
            userInput.value = `Estou com ${symptom.text.toLowerCase()}`;
            handleSendMessage();
        };
        quickSymptomsDiv.appendChild(button);
    });
    
    return quickSymptomsDiv;
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
        <div class="feedback-title">Como foi seu atendimento?</div>
        <div class="stars-container">
            ${Array.from({length: 5}, (_, i) => `
                <button class="star-button" onclick="rateFeedback(${i + 1})">
                    <i class="fas fa-star"></i>
                </button>
            `).join('')}
        </div>
        <textarea class="feedback-input" placeholder="Deixe seu comentário ou sugestão (opcional)"></textarea>
        <div class="action-buttons">
            <button class="action-button" onclick="submitFeedback()">
                <i class="fas fa-paper-plane"></i>
                Enviar Feedback
            </button>
            <button class="action-button secondary" onclick="exportToPDF()">
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
            
            // Divide o texto em parágrafos
            const paragraphs = text.split('\n');
            let currentY = y;
            
            for (const paragraph of paragraphs) {
                if (paragraph.trim()) {
                    const splitText = doc.splitTextToSize(paragraph.trim(), textWidth);
                    doc.text(splitText, margin, currentY);
                    currentY += (splitText.length * lineHeight);
                }
                currentY += lineHeight; // Adiciona espaço entre parágrafos
            }
            
            return currentY;
        }
        
        // Adiciona mensagens
        doc.setFontSize(11);
        for (const message of conversationHistory) {
            // Pula mensagens vazias
            if (!message.content.trim()) continue;
            
            // Limpa o texto de caracteres especiais
            const cleanedContent = cleanTextForPDF(message.content);
            
            // Define o prefixo baseado no papel
            const prefix = message.role === 'assistant' ? 'Médico: ' : 'Paciente: ';
            
            // Adiciona a mensagem com quebra de linha
            const text = `${prefix}${cleanedContent}`;
            yPosition = addWrappedText(text, yPosition);
            
            // Adiciona espaço entre mensagens
            yPosition += lineHeight;
            
            // Verifica se precisa de nova página
            if (yPosition > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                yPosition = margin;
            }
        }
        
        // Salva o PDF
        doc.save('triagem-medica.pdf');
        
        // Mostra mensagem de sucesso
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
    const emergencyButton = document.getElementById('emergencyButton');
    const emergencyPanel = document.getElementById('emergencyPanel');
    
    emergencyButton.addEventListener('click', () => {
        emergencyPanel.classList.toggle('active');
    });
    
    // Fecha o painel quando clicar fora dele
    document.addEventListener('click', (e) => {
        if (!emergencyButton.contains(e.target) && 
            !emergencyPanel.contains(e.target) && 
            emergencyPanel.classList.contains('active')) {
            emergencyPanel.classList.remove('active');
        }
    });
}

// Função para atualizar visibilidade do botão de voz
function updateVoiceButtonVisibility() {
    if (!voiceButton) {
        console.warn('Botão de voz não encontrado');
        return;
    }

    const preferences = JSON.parse(localStorage.getItem('accessibilityPreferences') || '{}');
    const shouldShowVoice = voiceToggle?.checked || preferences.voiceCommands;

    if (shouldShowVoice) {
        voiceButton.style.display = 'flex';
        if (!recognition) {
            initializeVoiceRecognition();
        }
    } else {
        voiceButton.style.display = 'none';
        if (isListening) {
            stopVoiceRecognition();
        }
    }

    // Salva a preferência
    if (preferences.voiceCommands !== shouldShowVoice) {
        preferences.voiceCommands = shouldShowVoice;
        localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
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
                // Garante que o botão permaneça visível
                voiceButton.style.display = 'flex';
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
                voiceButton.classList.add('error');
                const icon = voiceButton.querySelector('i');
                if (icon) icon.className = 'fas fa-microphone';
                // Garante que o botão permaneça visível mesmo após um erro
                voiceButton.style.display = 'flex';
                setTimeout(() => voiceButton.classList.remove('error'), 2000);
            }
            showTemporaryToast('Erro no reconhecimento de voz. Tente novamente.', 'error');
        };

        updateVoiceButtonVisibility();
        console.log('Reconhecimento de voz inicializado com sucesso');

    } catch (error) {
        console.error('Erro ao inicializar reconhecimento de voz:', error);
        if (voiceButton) voiceButton.style.display = 'none';
        if (voiceToggle) voiceToggle.checked = false;
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
    // Limpa os dados de autenticação
    localStorage.removeItem('authToken');
    localStorage.removeItem('guestMode');
    localStorage.removeItem('userEmail');
    
    // Redireciona para a página de login
    window.location.href = 'login.html';
}

// Função para mostrar o modal
function showConfirmationModal(message, onConfirm) {
    const modalMessage = document.querySelector('#confirmationModal p');
    modalMessage.textContent = message;
    
    confirmationOverlay.classList.add('active');
    confirmationModal.classList.add('active');
    
    const handleConfirm = () => {
        hideConfirmationModal();
        onConfirm();
        cleanup();
    };
    
    const handleCancel = () => {
        hideConfirmationModal();
        cleanup();
    };
    
    const cleanup = () => {
        confirmButton.removeEventListener('click', handleConfirm);
        cancelButton.removeEventListener('click', handleCancel);
        confirmationOverlay.removeEventListener('click', handleCancel);
    };
    
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
    confirmationOverlay.addEventListener('click', handleCancel);
}

function hideConfirmationModal() {
    confirmationOverlay.classList.remove('active');
    confirmationModal.classList.remove('active');
}

// Evento para novo atendimento
newSessionButton.addEventListener('click', () => {
    showConfirmationModal(
        'Tem certeza que deseja iniciar um novo atendimento? O atendimento atual será salvo no histórico.',
        () => startNewSession()
    );
});

// Função para exibir uma conversa específica
function displayConversation(chat) {
    clearChat();
    chat.conversation.forEach(message => {
        addMessage(message.content, message.role === 'assistant');
    });
}

// Carregar histórico quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    loadUserHistory();
});

// Atualizar histórico após cada conversa
async function updateHistory() {
    await loadUserHistory();
}

function displayHistory(history) {
    // Limpa mensagens atuais
    chatMessages.innerHTML = '';
    
    // Adiciona mensagem de seleção com mais detalhes
    const selectionMessage = document.createElement('div');
    selectionMessage.className = 'message bot-message';
    selectionMessage.innerHTML = `
        <div class="message-content">
            <h3><i class="fas fa-history"></i> Histórico de Atendimentos</h3>
            <p>Selecione um atendimento para visualizar:</p>
            <div class="attendance-list">
                ${history.length === 0 ? 
                    '<p class="text-center text-muted">Nenhum histórico encontrado</p>' :
                    history.map((att, index) => `
                        <div class="attendance-item" data-id="${att._id}">
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
                        </div>
                    `).join('')}
            </div>
            <div class="attendance-actions">
                <button class="attendance-button continue" onclick="returnToCurrentAttendance()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar ao Atendimento Atual
                </button>
                <button class="attendance-button continue" onclick="startNewSession()">
                    <i class="fas fa-plus-circle"></i>
                    Novo Atendimento
                </button>
            </div>
        </div>
    `;
    chatMessages.appendChild(selectionMessage);
}

// Função para retornar ao atendimento atual
function returnToCurrentAttendance() {
    currentViewingId = null;
    const currentAttendance = localStorage.getItem('currentAttendance');
    if (currentAttendance) {
        try {
            const attendance = JSON.parse(currentAttendance);
            if (attendance && attendance.messages && attendance.messages.length > 0) {
                loadAttendance(attendance);
            } else {
                startNewSession();
            }
        } catch (error) {
            console.error('Erro ao carregar atendimento:', error);
            startNewSession();
        }
    } else {
        startNewSession();
    }
}

// Função para inicializar os elementos de voz
function initializeVoiceElements() {
    voiceToggle = document.querySelector('#voiceToggle');
    voiceButton = document.querySelector('.voice-button');
    
    // Adiciona os event listeners
    if (voiceButton) {
        voiceButton.addEventListener('click', toggleVoiceRecognition);
        console.log('Event listener adicionado ao botão de voz');
    } else {
        console.warn('Botão de voz não encontrado no DOM');
    }
    
    if (voiceToggle) {
        voiceToggle.addEventListener('change', () => {
            console.log('Toggle de voz alterado:', voiceToggle.checked);
            if (voiceToggle.checked) {
                initializeVoiceRecognition();
            } else {
                stopVoiceRecognition();
                recognition = null;
            }
            updateVoiceButtonVisibility();
            saveAccessibilityPreferences();
        });
    } else {
        console.warn('Toggle de voz não encontrado no DOM');
    }
}

// Função para enviar mensagem
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    try {
        // Limpa o input e adiciona a mensagem do usuário
        userInput.value = '';
        addMessage(message, false);

        // Mostra indicador de digitação
        const typingIndicator = showTypingIndicator();

        // Envia mensagem para o servidor
        const token = localStorage.getItem('authToken');
        const isGuest = localStorage.getItem('guestMode') === 'true';
        const headers = {
            'Content-Type': 'application/json'
        };

        if (!isGuest && token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${SERVER_URL}/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                message,
                isGuest: isGuest,
                history: conversationHistory
            })
        });

        // Remove o indicador de digitação
        removeTypingIndicator(typingIndicator);

        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }

        const data = await response.json();
        
        // Adiciona a resposta do bot
        if (data.response) {
            addMessage(data.response, true);
        }

        // Salva o histórico
        await saveConversationHistory();

        // Atualiza a barra de progresso
        updateProgress();

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        removeTypingIndicator(typingIndicator);
        // Não mostra mensagem de erro no chat, apenas no console
    }
}

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

// Funções de acessibilidade
function setFontSize(size) {
    console.log('Alterando tamanho da fonte para:', size);
    const sizes = {
        small: 'var(--font-size-small)',
        medium: 'var(--font-size-medium)',
        large: 'var(--font-size-large)',
        xlarge: 'var(--font-size-xlarge)'
    };
    
    document.documentElement.style.setProperty('--current-font-size', sizes[size]);
    document.body.style.fontSize = sizes[size];
}

function setTextSpacing(spacing) {
    console.log('Alterando espaçamento para:', spacing);
    document.body.setAttribute('data-spacing', spacing);
}

function saveAccessibilityPreferences() {
    const activeFont = document.querySelector('.font-button.active');
    const activeSpacing = document.querySelector('.spacing-button.active');
    
    const preferences = {
        fontSize: activeFont ? activeFont.dataset.size : 'medium',
        textSpacing: activeSpacing ? activeSpacing.dataset.spacing : 'normal',
        dyslexicFont: dyslexicToggle ? dyslexicToggle.checked : false,
        voiceCommands: voiceToggle ? voiceToggle.checked : false
    };
    
    console.log('Salvando preferências:', preferences);
    localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
}

function loadAccessibilityPreferences() {
    try {
        const preferences = JSON.parse(localStorage.getItem('accessibilityPreferences') || '{}');
        console.log('Carregando preferências:', preferences);
        
        if (preferences.fontSize) {
            setFontSize(preferences.fontSize);
            const fontButton = document.querySelector(`[data-size="${preferences.fontSize}"]`);
            if (fontButton) {
                document.querySelectorAll('.font-button').forEach(btn => btn.classList.remove('active'));
                fontButton.classList.add('active');
            }
        }
        
        if (preferences.textSpacing) {
            setTextSpacing(preferences.textSpacing);
            const spacingButton = document.querySelector(`[data-spacing="${preferences.textSpacing}"]`);
            if (spacingButton) {
                document.querySelectorAll('.spacing-button').forEach(btn => btn.classList.remove('active'));
                spacingButton.classList.add('active');
            }
        }
        
        if (dyslexicToggle && preferences.dyslexicFont) {
            dyslexicToggle.checked = true;
            document.body.classList.add('dyslexic-font');
        }
        
        if (voiceToggle && preferences.voiceCommands) {
            voiceToggle.checked = true;
            updateVoiceButtonVisibility();
        }
    } catch (error) {
        console.error('Erro ao carregar preferências:', error);
    }
}

// Função para inicializar a aplicação
async function initialize() {
    console.log('Iniciando aplicação...');

    try {
        // Atualiza visibilidade do botão de histórico
        updateHistoryButtonVisibility();

        // Inicializa acessibilidade
        initializeAccessibilityPanel();
        
        // Inicializa o botão de emergência
        initializeEmergencyButton();
        
        // Verifica conexão com o servidor
        await checkServerConnection();
        
        // Verifica se há um atendimento em andamento
        const currentAttendance = localStorage.getItem('currentAttendance');
        const forceNewSession = window.location.hash === '#novo';
        
        if (!currentAttendance || forceNewSession) {
            startNewSession();
        } else {
            try {
                const attendance = JSON.parse(currentAttendance);
                if (attendance && attendance.messages && attendance.messages.length > 0) {
                    loadAttendance(attendance);
                } else {
                    startNewSession();
                }
            } catch (error) {
                console.error('Erro ao carregar atendimento:', error);
                startNewSession();
            }
        }

        // Se não houver mensagens no chat, adiciona a mensagem inicial
        if (chatMessages.children.length === 0) {
            console.log('Adicionando mensagem inicial');
            addMessage(WELCOME_MESSAGE, true);
        }
        
        // Carrega o tema
        loadTheme();
        
        // Inicia verificação de inatividade
        startInactivityCheck();
        
        // Inicializa reconhecimento de voz
        initializeVoiceRecognition();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        startNewSession();
    }
} 