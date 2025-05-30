// Authentication management
let googleAuth = null;

// Initialize Google Sign-In
function initializeGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
    }
}

// Google Sign-In callback
function handleCredentialResponse(response) {
    try {
        const credential = response.credential;
        const payload = JSON.parse(atob(credential.split('.')[1]));
        
        const userData = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            provider: 'google',
            token: credential
        };
        
        loginUser(userData);
    } catch (error) {
        console.error('Error processing Google credential:', error);
        showMessage('Erro ao fazer login com Google', 'error');
    }
}

// User authentication functions
async function loginUser(userData) {
    try {
        // Send user data to backend for verification and storage
        const response = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        currentUser = response.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
        
        // Check if user needs to complete profile
        if (!currentUser.profileComplete) {
            showAdditionalInfoForm();
        } else {
            redirectAfterLogin();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        // Fallback for offline mode
        currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
        showAdditionalInfoForm();
    }
}

async function registerUser(userData) {
    try {
        const response = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        currentUser = response.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
        showAdditionalInfoForm();
        
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function updateUserProfile(profileData) {
    try {
        const response = await apiRequest('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        currentUser = { ...currentUser, ...response.user };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
        
        return response;
    } catch (error) {
        console.error('Profile update error:', error);
        throw error;
    }
}

function isLoggedIn() {
    return currentUser !== null;
}

function getCurrentUser() {
    return currentUser;
}

function redirectAfterLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || 'index.html';
    window.location.href = redirect;
}

// Form management
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('additionalInfoForm').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('additionalInfoForm').classList.add('hidden');
}

function showAdditionalInfoForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('additionalInfoForm').classList.remove('hidden');
    
    // Pre-fill with existing data if available
    if (currentUser) {
        const form = document.getElementById('additionalInfoForm');
        if (currentUser.name) {
            const nameInput = form.querySelector('#fullName');
            if (nameInput) nameInput.value = currentUser.name;
        }
    }
}

// Form event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeGoogleAuth();
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const email = formData.get('email');
            const password = formData.get('password');
            
            if (!validateEmail(email)) {
                showMessage('Por favor, insira um e-mail válido', 'error');
                return;
            }
            
            try {
                const userData = {
                    email: email,
                    password: password,
                    provider: 'email'
                };
                
                await loginUser(userData);
            } catch (error) {
                showMessage('E-mail ou senha incorretos', 'error');
            }
        });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const email = formData.get('email');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            
            if (!validateEmail(email)) {
                showMessage('Por favor, insira um e-mail válido', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
                return;
            }
            
            try {
                const userData = {
                    email: email,
                    password: password,
                    provider: 'email'
                };
                
                await registerUser(userData);
                showMessage('Conta criada com sucesso!', 'success');
            } catch (error) {
                showMessage('Erro ao criar conta. E-mail pode já estar em uso.', 'error');
            }
        });
    }
    
    // Additional info form
    const additionalInfoForm = document.getElementById('additionalInfoForm');
    if (additionalInfoForm) {
        additionalInfoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const profileData = Object.fromEntries(formData);
            
            // Validate required fields
            if (!profileData.fullName || !profileData.phone || !profileData.cpf) {
                showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
                return;
            }
            
            if (!validateCPF(profileData.cpf)) {
                showMessage('Por favor, insira um CPF válido', 'error');
                return;
            }
            
            if (!validateZipCode(profileData.zipCode)) {
                showMessage('Por favor, insira um CEP válido', 'error');
                return;
            }
            
            try {
                profileData.profileComplete = true;
                await updateUserProfile(profileData);
                showMessage('Perfil completado com sucesso!', 'success');
                
                setTimeout(() => {
                    redirectAfterLogin();
                }, 2000);
            } catch (error) {
                showMessage('Erro ao salvar informações. Tente novamente.', 'error');
            }
        });
        
        // CEP lookup
        const zipCodeInput = document.getElementById('zipCode');
        if (zipCodeInput) {
            zipCodeInput.addEventListener('blur', function() {
                const zipCode = this.value.replace(/\D/g, '');
                if (zipCode.length === 8) {
                    lookupAddress(zipCode);
                }
            });
        }
    }
});

// Address lookup via CEP
async function lookupAddress(zipCode) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
            const form = document.getElementById('additionalInfoForm');
            if (form) {
                const streetInput = form.querySelector('#street');
                const neighborhoodInput = form.querySelector('#neighborhood');
                const cityInput = form.querySelector('#city');
                const stateInput = form.querySelector('#state');
                
                if (streetInput) streetInput.value = data.logradouro || '';
                if (neighborhoodInput) neighborhoodInput.value = data.bairro || '';
                if (cityInput) cityInput.value = data.localidade || '';
                if (stateInput) stateInput.value = data.uf || '';
            }
        }
    } catch (error) {
        console.error('Error looking up address:', error);
    }
}

// Input masks and formatting
document.addEventListener('DOMContentLoaded', function() {
    // CPF mask
    const cpfInputs = document.querySelectorAll('input[name="cpf"]');
    cpfInputs.forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            this.value = value;
        });
    });
    
    // Phone mask
    const phoneInputs = document.querySelectorAll('input[name="phone"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
            this.value = value;
        });
    });
    
    // CEP mask
    const zipCodeInputs = document.querySelectorAll('input[name="zipCode"]');
    zipCodeInputs.forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            this.value = value;
        });
    });
});

// Password strength validation
function checkPasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let strength = 0;
    let feedback = [];
    
    if (password.length >= minLength) strength++;
    else feedback.push('Pelo menos 8 caracteres');
    
    if (hasUpperCase) strength++;
    else feedback.push('Uma letra maiúscula');
    
    if (hasLowerCase) strength++;
    else feedback.push('Uma letra minúscula');
    
    if (hasNumbers) strength++;
    else feedback.push('Um número');
    
    if (hasSpecialChar) strength++;
    else feedback.push('Um caractere especial');
    
    return {
        score: strength,
        feedback: feedback,
        isStrong: strength >= 4
    };
}

// Session management
function refreshAuthToken() {
    if (currentUser && currentUser.token) {
        // Implement token refresh logic
        const tokenPayload = JSON.parse(atob(currentUser.token.split('.')[1]));
        const expirationTime = tokenPayload.exp * 1000;
        const currentTime = Date.now();
        
        // Refresh token if it expires in the next 5 minutes
        if (expirationTime - currentTime < 5 * 60 * 1000) {
            refreshToken();
        }
    }
}

async function refreshToken() {
    try {
        const response = await apiRequest('/api/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ token: currentUser.token })
        });
        
        currentUser.token = response.token;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
    }
}

// Auto-refresh token every 4 minutes
setInterval(refreshAuthToken, 4 * 60 * 1000);

// Social login helpers
function initializeFacebookAuth() {
    // Facebook SDK initialization
    // This would be implemented if Facebook login is needed
}

function initializeTwitterAuth() {
    // Twitter SDK initialization
    // This would be implemented if Twitter login is needed
}

// Export auth functions
window.handleCredentialResponse = handleCredentialResponse;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.showAdditionalInfoForm = showAdditionalInfoForm;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.updateUserProfile = updateUserProfile;
window.lookupAddress = lookupAddress;