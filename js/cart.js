// Funções do carrinho
function addToCart(productId, options = {}) {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    const cartItem = {
        id: productId,
        name: product.name,
        image: product.images[0],
        basePrice: product.basePrice,
        size: options.size || 'small',
        painting: options.painting || false,
        quantity: options.quantity || 1,
        finalPrice: calculatePrice(product.basePrice, options.size, options.painting)
    };

    // Verificar se item já existe no carrinho
    const existingIndex = cart.findIndex(item => 
        item.id === cartItem.id && 
        item.size === cartItem.size && 
        item.painting === cartItem.painting
    );

    if (existingIndex >= 0) {
        cart[existingIndex].quantity += cartItem.quantity;
    } else {
        cart.push(cartItem);
    }

    saveCart();
    updateCartDisplay();
    showCartNotification();
}

function calculatePrice(basePrice, size, painting) {
    let price = basePrice;
    
    // Multiplicadores de tamanho
    if (size === 'medium') price *= 1.25;
    if (size === 'large') price *= 1.5;
    
    // Multiplicador de pintura
    if (painting) price *= 1.75;
    
    return price;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartDisplay();
    displayCartItems();
}

function updateCartQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    cart[index].quantity = newQuantity;
    saveCart();
    updateCartDisplay();
    displayCartItems();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function openCart() {
    document.getElementById('cartModal').style.display = 'block';
    displayCartItems();
}

function closeCart() {
    document.getElementById('cartModal').style.display = 'none';
}

function displayCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Seu carrinho está vazio</p>';
        cartTotalElement.textContent = '0,00';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map((item, index) => {
        const itemTotal = item.finalPrice * item.quantity;
        total += itemTotal;
        
        return `
        <div class="modalCart-content">
            <div class="cart-item">
                            <img src="${item.image || 'assets/placeholder.jpg'}" 
                                alt="${item.name}" 
                                class="cart-item-image">
                            <div class="cart-item-info">
                                <div class="cart-item-name">${item.name}</div>
                                <div class="cart-item-details">
                                    ${getSizeLabel(item.size)} • ${item.painting ? 'Com pintura' : 'Sem pintura'} • Qtd: ${item.quantity}
                                </div>
                            </div>
                            <div class="cart-item-price">R$ ${formatPrice(item.finalPrice)}</div>
                        
                    <div class="cart-item-controls">
                        <button onclick="updateCartQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
            </div>
        </div>
        `;
    }).join('');
    
    cartTotalElement.textContent = formatPrice(total);
}

function getSizeLabel(size) {
    const labels = {
        'small': '18 cm (1:10)',
        'medium': '22 cm (1:8)',
        'large': '26 cm (1:7)'
    };
    return labels[size] || size;
}

function showCartNotification() {
    // Implementar notificação de item adicionado
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = 'Item adicionado ao carrinho!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function proceedToCheckout() {
    if (!currentUser) {
        alert('Faça login para continuar com a compra');
        openLoginModal();
        return;
    }
    
    if (cart.length === 0) {
        alert('Seu carrinho está vazio');
        return;
    }
    
    window.location.href = 'checkout.html';
}