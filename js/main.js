// Configuração da API
const API_BASE_URL = 'https://gaming-collectibles-api.onrender.com';

// Configuração do Mercado Pago - só inicializar quando o SDK estiver carregado
let mp = null;

// Estado global da aplicação
let currentUser = null;
let products = [];
let cart = [];

// Inicializar MercadoPago quando disponível
function initializeMercadoPago() {
    if (typeof MercadoPago !== 'undefined') {
        mp = new MercadoPago('APP_USR-5ec7f48e-be4d-4a1f-8a41-cb4fa93d0e8f');
        console.log('MercadoPago inicializado');
    } else {
        console.warn('MercadoPago SDK não carregado');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar variáveis globais
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Tentar inicializar MercadoPago
    initializeMercadoPago();
    
    // Inicializar app
    initializeApp();
});

// Resto do código permanece igual...
async function initializeApp() {
    try {
        await loadProducts();
        loadFeaturedProducts();
        updateCartDisplay();
        updateUserDisplay()
        checkUserSession();
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (response.ok) {
            products = await response.json();
            console.log('Produtos carregados:', products.length);
        } else {
            console.warn('Não foi possível carregar produtos da API');
            products = [];
        }
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        products = [];
    }
}

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

function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(price);
}

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    console.log('updateUserDisplay');
    if (userDisplay) {
        if (currentUser) {
            userDisplay.textContent = currentUser.name || currentUser.email;
            console.log('Logado'+currentUser.name);
            userDisplay.onclick = () => window.location.href = 'profile.html';
        } else {
            userDisplay.textContent = 'User / Cadastro';
            userDisplay.onclick = openLoginModal;
            userDisplay.onclick = console.log('openLoginModal');
        }
    }
}

function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUserDisplay();
        console.log('checkUserSession');
    }
}


function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Placeholder para funções do carrinho
function updateCartDisplay() {
    // Esta função será sobrescrita pelo cart.js
    const cartCount = document.getElementById('cartCount');
    if (cartCount && typeof cart !== 'undefined') {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

function openCart() {
    console.log('Função openCart será carregada pelo cart.js');
}

function closeCart() {
    console.log('Função closeCart será carregada pelo cart.js');
}

window.onclick = function(event) {
    const loginModal = document.getElementById('loginModal');
    const cartModal = document.getElementById('cartModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === cartModal && typeof closeCart === 'function') {
        closeCart();
    }
}