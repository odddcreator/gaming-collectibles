// Variáveis específicas da loja (não globais)
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 12;
let currentCategory = '';
let sortBy = 'name';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Shop.js carregado');
    initializeShop();
});

async function initializeShop() {
    // Determinar categoria atual baseada na URL
    if (window.location.pathname.includes('action-figures.html')) {
        currentCategory = 'action-figure';
    } else if (window.location.pathname.includes('stencils.html')) {
        currentCategory = 'stencil';
    }
    
    try {
        await loadShopProducts();
        setupFilters();
        setupSearch();
        displayProducts();
        
        // Verificar se as funções existem antes de chamar
        if (typeof updateCartDisplay === 'function') {
            updateCartDisplay();
        }
        if (typeof checkUserSession === 'function') {
            checkUserSession();
        }
    } catch (error) {
        console.error('Erro ao inicializar loja:', error);
        showError('Erro ao carregar produtos. Tente novamente mais tarde.');
    }
}

async function loadShopProducts() {
    try {
        showLoading();
        
        // Aguardar até que os produtos sejam carregados pelo main.js
        let attempts = 0;
        while ((!window.products || window.products.length === 0) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.products && window.products.length > 0) {
            allProducts = [...window.products];
        } else {
            // Fallback: carregar diretamente da API
            const response = await fetch(`${API_BASE_URL}/api/products`);
            if (response.ok) {
                allProducts = await response.json();
            } else {
                throw new Error('Falha ao carregar produtos');
            }
        }
        
        // Filtrar por categoria se especificada
        if (currentCategory) {
            allProducts = allProducts.filter(product => product.category === currentCategory);
        }
        
        filteredProducts = [...allProducts];
        console.log('Produtos da loja carregados:', allProducts.length);
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        allProducts = [];
        filteredProducts = [];
        throw error;
    }
}

// Resto das funções permanecem iguais...
function setupFilters() {
    const gameFilter = document.getElementById('filterGame');
    if (gameFilter) {
        const games = [...new Set(allProducts.map(p => p.game))].sort();
        gameFilter.innerHTML = '<option value="">Todos</option>' + 
            games.map(game => `<option value="${game}">${game}</option>`).join('');
    }
    
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortBy = this.value;
            sortProducts();
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchQuery = this.value.toLowerCase();
            filterAndDisplayProducts();
        });
    }
}

function filterProducts() {
    const gameFilter = document.getElementById('filterGame');
    const selectedGame = gameFilter ? gameFilter.value : '';
    
    filteredProducts = allProducts.filter(product => {
        const matchesGame = !selectedGame || product.game === selectedGame;
        const matchesSearch = !searchQuery || 
            product.name.toLowerCase().includes(searchQuery) ||
            product.game.toLowerCase().includes(searchQuery) ||
            (product.description && product.description.toLowerCase().includes(searchQuery));
        
        return matchesGame && matchesSearch;
    });
    
    currentPage = 1;
    sortProducts();
}

function sortProducts() {
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'price':
                return a.basePrice - b.basePrice;
            case 'price-desc':
                return b.basePrice - a.basePrice;
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
    
    displayProducts();
}

function filterAndDisplayProducts() {
    filterProducts();
}

function displayProducts() {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <h3>Nenhum produto encontrado</h3>
                <p>Tente ajustar os filtros ou buscar por outros termos.</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    container.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    updatePagination();
    hideLoading();
}

function createProductCard(product) {
    const stockStatus = getStockStatus(product.stock);
    const priceRange = getPriceRange(product.basePrice);
    
    return `
        <div class="product-card" onclick="viewProduct('${product._id}')">
            ${product.featured ? '<div class="product-badge featured">Destaque</div>' : ''}
            <div class="product-image">
                <img src="${product.images[0] || 'assets/placeholder.jpg'}" 
                     alt="${product.name}" 
                     loading="lazy">
                <div class="stock-indicator ${stockStatus.class}">
                    ${stockStatus.label}
                </div>
            </div>
            <div class="product-info">
                <div class="product-game">${product.game}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">R$ ${formatPrice(product.basePrice)}</div>
                <div class="price-range">${priceRange}</div>
                <div class="product-actions">
                    <button class="btn-quick-add" onclick="event.stopPropagation(); openQuickAdd('${product._id}')">
                        Adicionar
                    </button>
                    <button class="btn-view" onclick="event.stopPropagation(); viewProduct('${product._id}')">
                        Ver
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out-of-stock', label: 'Sob encomenda' };
    } else if (stock <= 5) {
        return { class: 'low-stock', label: `${stock} disponíveis` };
    } else {
        return { class: 'in-stock', label: 'Em estoque' };
    }
}

function getPriceRange(basePrice) {
    const smallPrice = basePrice;
    const mediumPrice = basePrice * 1.25;
    const largePrice = basePrice * 1.5;
    const paintedPrice = basePrice * 1.75;
    
    const minPrice = Math.min(smallPrice, mediumPrice, largePrice);
    const maxPrice = Math.max(paintedPrice * 1.5);
    
    return `R$ ${formatPrice(minPrice)} - R$ ${formatPrice(maxPrice)}`;
}

function showLoading() {
    const container = document.getElementById('productsGrid');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Carregando produtos...</p>
            </div>
        `;
    }
}

function hideLoading() {
    // Loading é removido quando os produtos são exibidos
}

function showError(message) {
    const container = document.getElementById('productsGrid');
    if (container) {
        container.innerHTML = `
            <div class="no-products">
                <h3>Erro</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="initializeShop()">Tentar Novamente</button>
            </div>
        `;
    }
}

// Função placeholder para quick add
function openQuickAdd(productId) {
    console.log('Quick add para produto:', productId);
    // Implementar modal de adição rápida
}

function updatePagination() {
    // Implementar paginação se necessário
    console.log('Paginação a ser implementada');
}

// Event listeners globais
window.filterProducts = filterAndDisplayProducts;
window.sortProducts = sortProducts;