// Configuração do Google OAuth
window.handleCredentialResponse = async function(response) {
    try {
        // Decodificar o JWT do Google
        const userInfo = parseJWT(response.credential);
        
        // Salvar dados básicos do usuário
        const userData = {
            googleId: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        };

        // Verificar se o usuário já existe no banco
        const existingUser = await fetch(`${API_BASE_URL}/api/users/google/${userInfo.sub}`);
        
        if (existingUser.ok) {
            // Usuário existe, fazer login
            const user = await existingUser.json();
            currentUser = user;
            localStorage.setItem('userData', JSON.stringify(user));
        } else {
            // Novo usuário, redirecionar para completar cadastro
            localStorage.setItem('tempUserData', JSON.stringify(userData));
            window.location.href = 'complete-profile.html';
            return;
        }

        updateUserDisplay();
        closeLoginModal();
        
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
    }
};

// Função para decodificar JWT
function parseJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('userData');
    localStorage.removeItem('tempUserData');
    updateUserDisplay();
    window.location.href = 'index.html';
}