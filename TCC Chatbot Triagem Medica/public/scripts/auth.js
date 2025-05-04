// Verifica autenticação ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    // Se estiver na página de login ou registro, não faz nada
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html') || 
        window.location.pathname === '/') {
        return;
    }

    // Verifica se tem token ou modo convidado
    const authToken = localStorage.getItem('authToken');
    const isGuest = localStorage.getItem('guestMode') === 'true';
    const userName = localStorage.getItem('userName');

    // Se não tiver nenhum dos dois, redireciona para login
    if (!authToken && !isGuest) {
        window.location.href = 'login.html';
        return;
    }

    // Verifica se o token expirou (apenas para usuários não-convidados)
    if (!isGuest && authToken) {
        try {
            const tokenData = JSON.parse(atob(authToken.split('.')[1]));
            const expirationTime = tokenData.exp * 1000; // Converter para milissegundos
            
            if (Date.now() >= expirationTime) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
        } catch (error) {
            console.error('Erro ao verificar token:', error);
        }
    }

    const header = document.querySelector('.chat-header');
    if (header) {
        const userIndicator = document.createElement('div');
        
        if (isGuest) {
            userIndicator.className = 'guest-indicator';
            userIndicator.innerHTML = '<i class="fas fa-user-secret"></i> Modo Convidado';
        } else if (userName) {
            userIndicator.className = 'user-indicator';
            userIndicator.innerHTML = `<i class="fas fa-user"></i> ${userName.split(' ')[0]}`; // Mostra apenas o primeiro nome
        }
        
        header.appendChild(userIndicator);
    }
});

// Elementos do DOM
const loginForm = document.querySelector('.login-form');
const registerForm = document.getElementById('registerForm');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const togglePasswordBtn = document.querySelector('.toggle-password');

// Função para alternar visibilidade da senha
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
}

// Função para mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.querySelector('.error-message') || document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    if (!document.querySelector('.error-message')) {
        const form = document.querySelector('.login-form') || document.getElementById('registerForm');
        form.insertBefore(errorDiv, form.firstChild);
    }
}

// Função para remover mensagem de erro
function removeError() {
    const errorDiv = document.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Função para acessar como convidado
async function accessAsGuest() {
    try {
        const response = await fetch(`/api/guest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Limpa qualquer dado anterior
            localStorage.clear();
            
            // Salva o token e modo convidado no localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('guestMode', 'true');
            localStorage.setItem('userName', 'Convidado');

            // Redireciona para a página principal
            window.location.href = 'index.html';
        } else {
            showError(data.error || 'Erro ao acessar como convidado');
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao conectar ao servidor');
    }
}

// Função para fazer login
async function handleLogin(event) {
    event.preventDefault();
    removeError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const response = await fetch(`/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('guestMode', 'false');
            localStorage.setItem('userName', data.user.fullName);
            window.location.href = 'index.html';
        } else {
            showError(data.error || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao conectar ao servidor');
    }
}

// Função para registrar novo usuário
async function handleRegister(event) {
    event.preventDefault();
    removeError();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const birthDate = document.getElementById('birthDate').value;

    try {
        const response = await fetch(`/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                fullName, 
                email, 
                password, 
                birthDate 
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('guestMode', 'false');
            localStorage.setItem('userName', data.user.fullName);
            window.location.href = 'index.html';
        } else {
            showError(data.error || 'Erro ao registrar usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao conectar ao servidor');
    }
}

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
}

// Botão de convidado
const guestAccessBtn = document.querySelector('.guest-access');
if (guestAccessBtn) {
    guestAccessBtn.addEventListener('click', accessAsGuest);
} 