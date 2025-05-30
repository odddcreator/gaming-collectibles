// Configuration
const CONFIG = {
    API_BASE_URL: 'https://gaming-collectibles-api.onrender.com', // Replace with your Render backend URL
    MERCADOPAGO_PUBLIC_KEY: 'APP_USR-5ec7f48e-be4d-4a1f-8a41-cb4fa93d0e8f',
    GOOGLE_CLIENT_ID: '901494380579-5m43l4g40g523358l8tmirkn0nqpr1ed.apps.googleusercontent.com',
    MONGODB_URI: 'mongodb+srv://odddcreator:o0bCPxyCJtCE5s2z@cluster0.tswkhko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
};

// Global variables
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    updateCartCount();
    loadUserState();
    
    // Initialize MercadoPago if available
    if (typeof MercadoPago !== 'undefined') {
        const mp = new MercadoPago(CONFIG.MERCADOPAGO_PUBLIC_KEY);
    }
}

// User state management
function loadUserState() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUserDisplay();
    }
}

function updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    const loginLink = document.getElementById('loginLink');
    const profileLink = document.getElementById('profileLink');
    const logoutLink = document.getElementById('logoutLink');
    
    if (currentUser) {
        userDisplay.textContent = currentUser.name || currentUser.email;
        if (loginLink) loginLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'block';
    } else {
        userDisplay.textContent = 'User / Cadastro';
        if (loginLink) loginLink.style.display = 'block';
        if (profileLink) profileLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'none';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('cart');
    cart = [];
    updateUserDisplay();
    updateCartCount();
    window.location.href = 'index.html';
}

// Add logout event listener
document.addEventListener('DOMContentLoaded', function() {
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});

// Cart management
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

function addItemToCart(product) {
    const existingItem = cart.find(item => 
        item.id === product.id && 
        item.size === product.size && 
        item.paint === product.paint
    );
    
    if (existingItem) {
        existingItem.quantity += product.quantity;
    } else {
        cart.push(product);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    loadCartItems();
}

function updateCartItemQuantity(index, quantity) {
    if (quantity <= 0) {
        removeFromCart(index);
    } else {
        cart[index].quantity = quantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        loadCartItems();
    }
}

function clearCart() {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    loadCartItems();
}

function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Products management
async function loadProducts(type = null) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/products${type ? `?type=${type}` : ''}`);
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        products = data.products || [];
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        displayMockProducts(type);
    }
}

function displayMockProducts(type) {
    const mockProducts = [
        {
            id: '1',
            name: 'Guerreiro Élfico de Aion',
            type: 'action-figure',
            basePrice: 199.99,
            image: 'https://via.placeholder.com/300x300?text=Action+Figure+1',
            description: 'Action figure detalhado do guerreiro élfico do MMORPG Aion'
        },
        {
            id: '2',
            name: 'Mago Arcano de Lineage',
            type: 'action-figure',
            basePrice: 249.99,
            image: 'https://via.placeholder.com/300x300?text=Action+Figure+2',
            description: 'Figura colecionável do mago arcano de Lineage II'
        },
        {
            id: '3',
            name: 'Stencil Logo Guild Wars',
            type: 'stencil',
            basePrice: 29.99,
            image: 'https://via.placeholder.com/300x300?text=Stencil+1',
            description: 'Stencil vetorizado do logo do Guild Wars para pintura'
        },
        {
            id: '4',
            name: 'Cavaleiro Sombrio de Perfect World',
            type: 'action-figure',
            basePrice: 299.99,
            image: 'https://via.placeholder.com/300x300?text=Action+Figure+3',
            description: 'Action figure premium do cavaleiro sombrio'
        },
        {
            id: '5',
            name: 'Stencil Símbolo RO',
            type: 'stencil',
            basePrice: 24.99,
            image: 'https://via.placeholder.com/300x300?text=Stencil+2',
            description: 'Stencil do símbolo clássico do Ragnarok Online'
        },
        {
            id: '6',
            name: 'Assassino de Cabal',
            type: 'action-figure',
            basePrice: 189.99,
            image: 'https://via.placeholder.com/300x300?text=Action+Figure+4',
            description: 'Figure do assassino stealth de Cabal Online'
        }
    ];
    
    const filteredProducts = type ? mockProducts.filter(p => p.type === type) : mockProducts;
    displayProducts(filteredProducts);
}

function displayProducts(productsToShow) {
    const grids = [
        document.getElementById('featuredProducts'),
        document.getElementById('actionFiguresGrid'),
        document.getElementById('stencilsGrid')
    ].filter(grid => grid);
    
    grids.forEach(grid => {
        if (grid) {
            grid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
        }
    });
}

function createProductCard(product) {
    const price = formatPrice(product.basePrice);
    return `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
            <div class="product-image" style="background-image: url('${product.image}');">
                <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">${price}</div>
            </div>
        </div>
    `;
}

async function fetchProduct(productId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        
        const product = await response.json();
        displayProductDetail(product);
    } catch (error) {
        console.error('Error loading product:', error);
        displayMockProductDetail(productId);
    }
}

function displayMockProductDetail(productId) {
    const mockProduct = {
        id: productId,
        name: 'Action Figure Personalizado',
        basePrice: 199.99,
        description: 'Action figure detalhado com acabamento premium. Personagem único de MMORPG indie.',
        images: [
            'https://via.placeholder.com/500x500?text=Foto+1',
            'https://via.placeholder.com/500x500?text=Foto+2',
            'https://via.placeholder.com/500x500?text=Foto+3'
        ],
        stock: 4,
        type: 'action-figure'
    };
    
    displayProductDetail(mockProduct);
}

function displayProductDetail(product) {
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productDescription').innerHTML = `<p>${product.description}</p>`;
    document.getElementById('stockInfo').textContent = `${product.stock} peças disponíveis`;
    
    // Update global product reference
    window.currentProduct = product;
    window.basePrice = product.basePrice;
    
    updatePrice();
}

// Shipping calculation
async function calculateShippingCost(zipCode) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/shipping`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                zipCode: zipCode,
                items: cart
            })
        });
        
        if (!response.ok) throw new Error('Failed to calculate shipping');
        
        const shippingData = await response.json();
        displayShippingOptions(shippingData);
    } catch (error) {
        console.error('Error calculating shipping:', error);
        displayMockShippingOptions();
    }
}

function displayMockShippingOptions() {
    const shippingResult = document.getElementById('shippingResult') || document.getElementById('cartShippingResult');
    if (shippingResult) {
        shippingResult.innerHTML = `
            <div class="shipping-options">
                <div class="shipping-option">
                    <input type="radio" name="shipping" value="pac" id="pac">
                    <label for="pac">PAC - R$ 15,90 (7-10 dias úteis)</label>
                </div>
                <div class="shipping-option">
                    <input type="radio" name="shipping" value="sedex" id="sedex">
                    <label for="sedex">SEDEX - R$ 25,90 (3-5 dias úteis)</label>
                </div>
            </div>
        `;
    }
}

function displayShippingOptions(shippingData) {
    const shippingResult = document.getElementById('shippingResult') || document.getElementById('cartShippingResult');
    if (shippingResult && shippingData.options) {
        shippingResult.innerHTML = shippingData.options.map(option => `
            <div class="shipping-option">
                <input type="radio" name="shipping" value="${option.code}" id="${option.code}">
                <label for="${option.code}">${option.name} - ${formatPrice(option.price)} (${option.deliveryTime})</label>
            </div>
        `).join('');
    }
}

// Utility functions
function formatPrice(price) {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search and filter functions
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    displayProducts(filteredProducts);
}

function sortProducts(sortBy) {
    let sortedProducts = [...products];
    
    switch (sortBy) {
        case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-low':
            sortedProducts.sort((a, b) => a.basePrice - b.basePrice);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.basePrice - a.basePrice);
            break;
    }
    
    displayProducts(sortedProducts);
}

// API helper functions
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    if (currentUser && currentUser.token) {
        config.headers.Authorization = `Bearer ${currentUser.token}`;
    }
    
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Form validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let checkDigit = (sum * 10) % 11;
    if (checkDigit === 10) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    checkDigit = (sum * 10) % 11;
    if (checkDigit === 10) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

function validateZipCode(zipCode) {
    const re = /^\d{5}-?\d{3}$/;
    return re.test(zipCode);
}

// Error handling
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function handleError(error, userMessage = 'Ocorreu um erro. Tente novamente.') {
    console.error('Error:', error);
    showMessage(userMessage, 'error');
}

// Local storage helpers
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

// Export functions for global use
window.addItemToCart = addItemToCart;
window.removeFromCart = removeFromCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.clearCart = clearCart;
window.calculateShippingCost = calculateShippingCost;
window.loadProducts = loadProducts;
window.fetchProduct = fetchProduct;
window.filterProducts = filterProducts;
window.sortProducts = sortProducts;
window.formatPrice = formatPrice;
window.formatCurrency = formatCurrency;