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
            ${product.featured ? '<div class="product-badge featured">Destaque</div>' : ''}
            <div class="product-image">
                <img src="${product.images[0] || 'assets/placeholder.jpg'}" 
                     alt="${product.name}" 
                     loading="lazy">
                <div class="stock-indicator ${getStockStatus(product.stock).class}">
                    ${getStockStatus(product.stock).label}
                </div>
            </div>
            <div class="product-info">
                <div class="product-game">${product.game}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-actions">
                    <button class="btn-view" onclick="event.stopPropagation(); viewProduct('${product._id}')">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ✅ ADICIONAR FUNÇÕES AUXILIARES
function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out-of-stock', label: 'Sob encomenda' };
    } else if (stock <= 5) {
        return { class: 'low-stock', label: `${stock} disponíveis` };
    } else {
        return { class: 'in-stock', label: 'Em estoque' };
    }
}

function getPriceRange(product) {
    if (!product.availableSizes || product.availableSizes.length === 0) {
        return `A partir de R$ ${formatPrice(product.basePrice)}`;
    }
    
    const prices = product.availableSizes.map(size => {
        const multiplier = product.sizeMultipliers?.[size] || 1;
        let price = product.basePrice * multiplier;
        
        // Se tem opção de pintura, considerar o preço com pintura também
        if (product.hasPaintingOption) {
            return [price, price * 1.75]; // sem e com pintura
        }
        return [price];
    }).flat();
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
        return `R$ ${formatPrice(minPrice)}`;
    }
    
    return `R$ ${formatPrice(minPrice)} - R$ ${formatPrice(maxPrice)}`;
}

// ✅ PLACEHOLDER PARA QUICK ADD
function openQuickAdd(productId) {
    // Por enquanto, redirecionar para página do produto
    viewProduct(productId);
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

// Verificar sessão do usuário
function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Sessão do usuário carregada:', currentUser.email);
            updateUserDisplay();
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            localStorage.removeItem('userData');
            currentUser = null;
            updateUserDisplay();
        }
    } else {
        currentUser = null;
        updateUserDisplay();
    }
}

// Atualizar exibição do usuário
function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        if (currentUser) {
            userDisplay.textContent = currentUser.name || currentUser.email;
            userDisplay.onclick = () => window.location.href = 'profile.html';
            userDisplay.style.cursor = 'pointer';
        } else {
            userDisplay.textContent = 'User / Cadastro';
            userDisplay.onclick = openLoginModal;
            userDisplay.style.cursor = 'pointer';
        }
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