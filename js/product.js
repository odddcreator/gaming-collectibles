let currentProduct = null;
let selectedSize = 'small';
let selectedPainting = false;
let selectedQuantity = 1;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (productId) {
        loadProduct(productId);
    } else {
        document.getElementById('productDetails').innerHTML = '<p>Produto não encontrado.</p>';
    }
    
    updateCartDisplay();
    checkUserSession();
});

async function loadProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (response.ok) {
            currentProduct = await response.json();
            displayProduct();
        } else {
            throw new Error('Produto não encontrado');
        }
    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        document.getElementById('productDetails').innerHTML = '<p>Erro ao carregar produto.</p>';
    }
}

function displayProduct() {
    const container = document.getElementById('productDetails');
    
    container.innerHTML = `
        <div class="product-gallery">
            <img src="${currentProduct.images[0] || 'assets/placeholder.jpg'}" 
                 alt="${currentProduct.name}" 
                 class="main-image" 
                 id="mainImage">
            <div class="thumbnail-gallery">
                ${currentProduct.images.map((img, index) => `
                    <img src="${img}" 
                         alt="${currentProduct.name}" 
                         class="thumbnail ${index === 0 ? 'active' : ''}"
                         onclick="changeMainImage('${img}', ${index})">
                `).join('')}
            </div>
        </div>
        
        <div class="product-info">
            <h1>${currentProduct.name}</h1>
            <div class="product-rating">
                <span class="stars">★★★★★</span>
                <span>5.0</span>
            </div>
            <div class="product-price" id="productPrice">
                R$ ${formatPrice(currentProduct.basePrice)}
            </div>
            
            <div class="product-options">
                <div class="option-group">
                    <label>Tamanho:</label>
                    <div class="size-options">
                        <button class="option-btn active" onclick="selectSize('small')">18 cm (1:10)</button>
                        <button class="option-btn" onclick="selectSize('medium')">22 cm (1:8)</button>
                        <button class="option-btn" onclick="selectSize('large')">26 cm (1:7)</button>
                    </div>
                </div>
                
                <div class="option-group">
                    <label>Pintura:</label>
                    <div class="painting-options">
                        <button class="option-btn" onclick="selectPainting(false)">sem pintura</button>
                        <button class="option-btn" onclick="selectPainting(true)">com pintura</button>
                    </div>
                </div>
            </div>
            
            <div class="quantity-selector">
                <label>Quantidade:</label>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                    <input type="number" class="quantity-input" id="quantityInput" value="1" min="1" onchange="updateQuantity()">
                    <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
                </div>
                <span>${currentProduct.stock > 0 ? currentProduct.stock + ' peças disponíveis' : 'Sob encomenda'}</span>
            </div>
            
            <div class="shipping-calculator">
                <label>Simulação de frete:</label>
                <div class="shipping-input">
                    <input type="text" id="cepInput" placeholder="Informe seu CEP" maxlength="9">
                    <button onclick="calculateShipping()">Calcular</button>
                </div>
                <div id="shippingResult"></div>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-add-cart" onclick="addProductToCart()">
                    🛒 Adicionar ao Carrinho
                </button>
                <button class="btn btn-buy-now" onclick="buyNow()">
                    Comprar Agora
                </button>
            </div>
        </div>
        
        <div class="product-description">
            <div class="description-tabs">
                <button class="tab-btn active" onclick="showTab('description')">Descrição</button>
                <button class="tab-btn" onclick="showTab('specifications')">Especificações</button>
            </div>
            <div class="tab-content active" id="description">
                <p>${currentProduct.description || 'Descrição não disponível.'}</p>
            </div>
            <div class="tab-content" id="specifications">
                <ul>
                    <li>Peso: ${currentProduct.weight || 'N/A'}g</li>
                    <li>Material: PLA+</li>
                    <li>Categoria: ${currentProduct.category}</li>
                    <li>Jogo: ${currentProduct.game}</li>
                </ul>
            </div>
        </div>
    `;
}

function changeMainImage(imageSrc, index) {
    document.getElementById('mainImage').src = imageSrc;
    
    // Atualizar thumbnails ativas
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function selectSize(size) {
    selectedSize = size;
    
    // Atualizar botões ativos
    document.querySelectorAll('.size-options .option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updatePrice();
}

function selectPainting(hasPainting) {
    selectedPainting = hasPainting;
    
    // Atualizar botões ativos
    document.querySelectorAll('.painting-options .option-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updatePrice();
}

function updatePrice() {
    const finalPrice = calculatePrice(currentProduct.basePrice, selectedSize, selectedPainting);
    document.getElementById('productPrice').textContent = `R$ ${formatPrice(finalPrice)}`;
}

function changeQuantity(delta) {
    const input = document.getElementById('quantityInput');
    const newValue = parseInt(input.value) + delta;
    if (newValue >= 1) {
        input.value = newValue;
        selectedQuantity = newValue;
    }
}

function updateQuantity() {
    const input = document.getElementById('quantityInput');
    selectedQuantity = Math.max(1, parseInt(input.value) || 1);
    input.value = selectedQuantity;
}

function addProductToCart() {
    addToCart(currentProduct._id, {
        size: selectedSize,
        painting: selectedPainting,
        quantity: selectedQuantity
    });
}

function buyNow() {
    addProductToCart();
    window.location.href = 'checkout.html';
}

function showTab(tabName) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

async function calculateShipping() {
    const cep = document.getElementById('cepInput').value.replace(/\D/g, '');
    const resultDiv = document.getElementById('shippingResult');
    
    if (cep.length !== 8) {
        resultDiv.innerHTML = '<p style="color: red;">CEP inválido</p>';
        return;
    }
    
    try {
        resultDiv.innerHTML = '<p>Calculando...</p>';
        
        // Simular cálculo de frete (implementar API dos Correios)
        const weight = currentProduct.weight * selectedQuantity;
        const shippingOptions = await calculateShippingCost(cep, weight);
        
        resultDiv.innerHTML = shippingOptions.map(option => `
            <div class="shipping-option">
                <strong>${option.name}</strong>: R$ ${formatPrice(option.price)} 
                (${option.deliveryTime} dias úteis)
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        resultDiv.innerHTML = '<p style="color: red;">Erro ao calcular frete</p>';
    }
}

// Função simplificada para cálculo de frete
async function calculateShippingCost(cep, weight) {
    // Aqui você implementaria a integração real com a API dos Correios
    // Por enquanto, retornando valores simulados
    return [
        { name: 'PAC', price: 15.50, deliveryTime: 8 },
        { name: 'SEDEX', price: 25.90, deliveryTime: 3 }
    ];
}