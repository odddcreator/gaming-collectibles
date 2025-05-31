let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 12;
let currentCategory = '';
let sortBy = 'name';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', function() {
    initializeShop();
});
console.log('Shop.js carregado');
console.log('API_BASE_URL disponível:', typeof API_BASE_URL !== 'undefined');
console.log('products disponível:', typeof products !== 'undefined');

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
        updateCartDisplay();
        checkUserSession();
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
        while (!window.products && attempts < 50) {
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

function setupFilters() {
    // Configurar filtro de jogos
    const gameFilter = document.getElementById('filterGame');
    if (gameFilter) {
        const games = [...new Set(allProducts.map(p => p.game))].sort();
        gameFilter.innerHTML = '<option value="">Todos</option>' + 
            games.map(game => `<option value="${game}">${game}</option>`).join('');
    }
    
    // Configurar ordenação
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
    
    // Calcular produtos para a página atual
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    container.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    
    // Atualizar paginação
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
    const maxPrice = Math.max(paintedPrice * 1.5); // Maior tamanho com pintura
    
    return `R$ ${formatPrice(minPrice)} - R$ ${formatPrice(maxPrice)}`;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    // Remover paginação existente
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    if (totalPages <= 1) return;
    
    // Criar nova paginação
    const container = document.getElementById('productsGrid').parentNode;
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // Botão anterior
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    pagination.appendChild(prevBtn);
    
    // Números das páginas
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => changePage(1);
        pagination.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => changePage(i);
        pagination.appendChild(pageBtn);
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = totalPages;
        lastBtn.onclick = () => changePage(totalPages);
        pagination.appendChild(lastBtn);
    }
    
    // Botão próximo
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Próximo →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    pagination.appendChild(nextBtn);
    
    container.appendChild(pagination);
}

function changePage(page) {
    currentPage = page;
    displayProducts();
    
    // Scroll para o topo dos produtos
    document.getElementById('productsGrid').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Quick Add Modal
let quickAddProduct = null;
let quickAddOptions = {
    size: 'small',
    painting: false,
    quantity: 1
};

function openQuickAdd(productId) {
    quickAddProduct = allProducts.find(p => p._id === productId);
    if (!quickAddProduct) return;
    
    // Reset options
    quickAddOptions = {
        size: 'small',
        painting: false,
        quantity: 1
    };
    
    // Criar modal se não existir
    let modal = document.getElementById('quickAddModal');
    if (!modal) {
        modal = createQuickAddModal();
        document.body.appendChild(modal);
    }
    
    // Preencher dados do produto
    updateQuickAddContent();
    
    modal.style.display = 'block';
}

function createQuickAddModal() {
    const modal = document.createElement('div');
    modal.id = 'quickAddModal';
    modal.className = 'quick-add-modal';
    
    modal.innerHTML = `
        <div class="quick-add-content">
            <span class="close" onclick="closeQuickAdd()">&times;</span>
            <div id="quickAddProductInfo"></div>
        </div>
    `;
    
    // Fechar ao clicar fora
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeQuickAdd();
        }
    };
    
    return modal;
}

function updateQuickAddContent() {
    const container = document.getElementById('quickAddProductInfo');
    const finalPrice = calculatePrice(quickAddProduct.basePrice, quickAddOptions.size, quickAddOptions.painting);
    
    container.innerHTML = `
        <div class="quick-add-product">
            <img src="${quickAddProduct.images[0] || 'assets/placeholder.jpg'}" 
                 alt="${quickAddProduct.name}" 
                 class="quick-add-image">
            <div class="quick-add-info">
                <h3>${quickAddProduct.name}</h3>
                <p>${quickAddProduct.game}</p>
                <div class="quick-add-price">R$ ${formatPrice(finalPrice)}</div>
            </div>
        </div>
        
        <div class="quick-options">
            <div class="option-group">
                <label>Tamanho:</label>
                <div class="size-options">
                    <button class="option-btn ${quickAddOptions.size === 'small' ? 'active' : ''}" 
                            onclick="selectQuickOption('size', 'small')">
                        18 cm (1:10)
                    </button>
                    <button class="option-btn ${quickAddOptions.size === 'medium' ? 'active' : ''}" 
                            onclick="selectQuickOption('size', 'medium')">
                        22 cm (1:8)
                    </button>
                    <button class="option-btn ${quickAddOptions.size === 'large' ? 'active' : ''}" 
                            onclick="selectQuickOption('size', 'large')">
                        26 cm (1:7)
                    </button>
                </div>
            </div>
            
            <div class="option-group">
                <label>Pintura:</label>
                <div class="painting-options">
                    <button class="option-btn ${!quickAddOptions.painting ? 'active' : ''}" 
                            onclick="selectQuickOption('painting', false)">
                        Sem pintura
                    </button>
                    <button class="option-btn ${quickAddOptions.painting ? 'active' : ''}" 
                            onclick="selectQuickOption('painting', true)">
                        Com pintura
                    </button>
                </div>
            </div>
            
            <div class="option-group">
                <label>Quantidade:</label>
                <div class="quantity-group">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="changeQuickQuantity(-1)">-</button>
                        <input type="number" class="quantity-input" value="${quickAddOptions.quantity}" 
                               min="1" onchange="updateQuickQuantity(this.value)">
                        <button class="quantity-btn" onclick="changeQuickQuantity(1)">+</button>
                    </div>
                    <span>${getStockStatus(quickAddProduct.stock).label}</span>
                </div>
            </div>
        </div>
        
        <div class="quick-add-actions">
            <button class="btn-cancel" onclick="closeQuickAdd()">Cancelar</button>
            <button class="btn-add-to-cart" onclick="addQuickToCart()">Adicionar ao Carrinho</button>
        </div>
    `;
}

function selectQuickOption(type, value) {
    quickAddOptions[type] = value;
    updateQuickAddContent();
}

function changeQuickQuantity(delta) {
    const newQuantity = quickAddOptions.quantity + delta;
    if (newQuantity >= 1) {
        quickAddOptions.quantity = newQuantity;
        updateQuickAddContent();
    }
}

function updateQuickQuantity(value) {
    const quantity = Math.max(1, parseInt(value) || 1);
    quickAddOptions.quantity = quantity;
    updateQuickAddContent();
}

function addQuickToCart() {
    if (!quickAddProduct) return;
    
    addToCart(quickAddProduct._id, quickAddOptions);
    closeQuickAdd();
}

function closeQuickAdd() {
    const modal = document.getElementById('quickAddModal');
    if (modal) {
        modal.style.display = 'none';
    }
    quickAddProduct = null;
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

// Event listeners globais
window.filterProducts = filterAndDisplayProducts;
window.sortProducts = sortProducts;