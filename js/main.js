// Configuração da API
const API_BASE_URL = 'https://gaming-collectibles-api.onrender.com';

// Configuração do Mercado Pago
const mp = new MercadoPago('APP_USR-5ec7f48e-be4d-4a1f-8a41-cb4fa93d0e8f');

// Estado global da aplicação
let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        await loadProducts();
        loadFeaturedProducts();
        updateCartDisplay();
        checkUserSession();
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
    }
}

// Carregar produtos da API
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (response.ok) {
            products = await response.json();
        } else {
            console.warn('Não foi possível carregar produtos da API');
            products = [];
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        products = [];
    }
}

// Carregar produtos em destaque na página inicial
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featuredProducts');
    if (!featuredContainer) return;

    const featuredProducts = products.filter(p => p.featured).slice(0, 6);
    
    if (featuredProducts.length === 0) {
        featuredContainer.innerHTML = '<p>Nenhum produto encontrado. Use o painel admin para adicionar produtos.</p>';
        return;
    }

    featuredContainer.innerHTML = featuredProducts.map(product => `
        <div class="product-card" onclick="viewProduct('${product._id}')">
            <div class="product-image">
                <img src="${product.images[0] || 'assets/placeholder.jpg'}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">R$ ${formatPrice(product.basePrice)}</p>
            </div>
        </div>
    `).join('');
}

// Formatar preço
function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
}

// Visualizar produto
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Verificar sessão do usuário
function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUserDisplay();
    }
}

// Atualizar exibição do usuário
function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    if (currentUser) {
        userDisplay.textContent = currentUser.name || currentUser.email;
        userDisplay.onclick = () => window.location.href = 'profile.html';
    } else {
        userDisplay.textContent = 'User / Cadastro';
        userDisplay.onclick = openLoginModal;
    }
}

// Modal de login
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const cartModal = document.getElementById('cartModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === cartModal) {
        closeCart();
    }
}