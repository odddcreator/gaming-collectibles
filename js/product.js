let currentProduct = null;
let selectedSize = null;
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
            console.log('📦 Produto carregado:', currentProduct);
            
            // ✅ Definir tamanho padrão baseado na categoria
            if (currentProduct.category === 'stencil') {
                selectedSize = currentProduct.availableSizes?.[0] || '30cm';
                selectedPainting = false; // Stencils não têm pintura
            } else {
                selectedSize = currentProduct.availableSizes?.[0] || 'small';
                selectedPainting = false; // Padrão sem pintura
            }
            
            displayProduct();
        } else {
            throw new Error('Produto não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        document.getElementById('productDetails').innerHTML = '<p>Erro ao carregar produto.</p>';
    }
}

function displayProduct() {
    const container = document.getElementById('productDetails');
    
    // ✅ ADAPTAR interface baseada na categoria
    const isStencil = currentProduct.category === 'stencil';
    
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
                R$ ${formatPrice(calculateCurrentPrice())}
            </div>
            
            <div class="product-options">
                <div class="option-group">
                    <label>${isStencil ? 'Tamanho:' : 'Tamanho:'}</label>
                    <div class="size-options">
                        ${generateSizeOptions()}
                    </div>
                </div>
                
                ${!isStencil ? `
                <div class="option-group">
                    <label>Pintura:</label>
                    <div class="painting-options">
                        <button class="option-btn active" onclick="selectPainting(false)">sem pintura</button>
                        <button class="option-btn" onclick="selectPainting(true)">com pintura</button>
                    </div>
                </div>
                ` : ''}
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
                ${isStencil ? '<button class="tab-btn" onclick="showTab(\'usage\')">Como Usar</button>' : ''}
            </div>
            
            <div class="tab-content active" id="description">
                <p>${currentProduct.description || 'Descrição não disponível.'}</p>
            </div>
            
            <div class="tab-content" id="specifications">
                <ul>
                    <li>Peso: ${currentProduct.weight || 'N/A'}g</li>
                    <li>Material: ${isStencil ? 'PVC flexível' : 'PLA+'}</li>
                    <li>Categoria: ${currentProduct.category}</li>
                    <li>Jogo: ${currentProduct.game}</li>
                    ${isStencil ? '<li>Espessura: 0.25mm</li><li>Reutilizável: Sim</li>' : ''}
                </ul>
            </div>
            
            ${isStencil ? `
            <div class="tab-content" id="usage">
                <div class="usage-steps">
                    <div class="step">
                        <h4>1. Posicionamento</h4>
                        <p>Fixe o stencil na superfície com fita adesiva</p>
                    </div>
                    <div class="step">
                        <h4>2. Aplicação</h4>
                        <p>Use pincel ou rolo para aplicar a tinta</p>
                    </div>
                    <div class="step">
                        <h4>3. Remoção</h4>
                        <p>Retire cuidadosamente antes da tinta secar</p>
                    </div>
                    <div class="step">
                        <h4>4. Limpeza</h4>
                        <p>Lave com água e sabão para reutilizar</p>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    updatePrice();
}

function generateSizeOptions() {
    if (!currentProduct.availableSizes) return '';
    
    const isStencil = currentProduct.category === 'stencil';
    
    return currentProduct.availableSizes.map(size => {
        let label = size;
        
        if (isStencil) {
            const multiplier = currentProduct.sizeMultipliers?.[size] || 1;
            label = `${size} (x${multiplier})`;
        } else {
            const labels = {
                'small': '18cm (1:10)',
                'medium': '22cm (1:8)',
                'large': '26cm (1:7)'
            };
            label = labels[size] || size;
        }
        
        const isFirst = size === currentProduct.availableSizes[0];
        return `<button class="option-btn ${isFirst ? 'active' : ''}" onclick="selectSize('${size}')">${label}</button>`;
    }).join('');
}

function calculateCurrentPrice() {
    if (!currentProduct || !selectedSize) return currentProduct?.basePrice || 0;
    
    let price = currentProduct.basePrice;
    
    // Aplicar multiplicador de tamanho
    const multiplier = currentProduct.sizeMultipliers?.[selectedSize] || 1;
    price *= multiplier;
    
    // Aplicar multiplicador de pintura (só para action figures)
    if (selectedPainting && currentProduct.hasPaintingOption) {
        price *= 1.75;
    }
    
    return price;
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
    const finalPrice = calculateCurrentPrice();
    const priceElement = document.getElementById('productPrice');
    if (priceElement) {
        priceElement.textContent = `R$ ${formatPrice(finalPrice)}`;
    }
}

function changeMainImage(imageSrc, index) {
    document.getElementById('mainImage').src = imageSrc;
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
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
    // ✅ USAR função do cart.js com parâmetros corretos
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