// Cart management and checkout functionality

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('cart.html')) {
        loadCartItems();
    }
});

function loadCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCartContainer = document.getElementById('emptyCart');
    
    if (cart.length === 0) {
        if (cartItemsContainer) cartItemsContainer.style.display = 'none';
        if (emptyCartContainer) emptyCartContainer.classList.remove('hidden');
        return;
    }
    
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (emptyCartContainer) emptyCartContainer.classList.add('hidden');
    
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = cart.map((item, index) => createCartItemHTML(item, index)).join('');
    }
    
    updateCartSummary();
}

function createCartItemHTML(item, index) {
    return `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image || 'https://via.placeholder.com/100x100'}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>Tamanho: ${item.size || 'Padrão'}</p>
                <p>Pintura: ${item.paint || 'Sem pintura'}</p>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})">-</button>
                <input type="number" value="${item.quantity}" min="1" onchange="updateCartItemQuantity(${index}, this.value)">
                <button class="quantity-btn" onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-price">
                ${formatCurrency(item.price)}
            </div>
            <div class="cart-item-total">
                ${formatCurrency(item.price * item.quantity)}
            </div>
            <div class="cart-item-actions">
                <button class="btn-remove" onclick="removeFromCart(${index})">×</button>
            </div>
        </div>
    `;
}

function updateCartSummary() {
    const subtotal = getCartTotal();
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('totalAmount');
    
    if (subtotalElement) {
        subtotalElement.textContent = formatCurrency(subtotal);
    }
    
    // Update total (will include shipping when calculated)
    const shippingCost = getSelectedShippingCost();
    const total = subtotal + shippingCost;
    
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
}

function getSelectedShippingCost() {
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    if (selectedShipping) {
        // Extract price from label text
        const label = document.querySelector(`label[for="${selectedShipping.id}"]`);
        if (label) {
            const priceMatch = label.textContent.match(/R\$\s*([\d,]+\.?\d*)/);
            if (priceMatch) {
                return parseFloat(priceMatch[1].replace(',', '.'));
            }
        }
    }
    return 0;
}

function calculateCartShipping() {
    const zipCode = document.getElementById('cartZipCode').value;
    if (!validateZipCode(zipCode)) {
        showMessage('Por favor, insira um CEP válido', 'error');
        return;
    }
    
    calculateShippingCost(zipCode).then(() => {
        // Add event listeners to shipping options
        document.querySelectorAll('input[name="shipping"]').forEach(radio => {
            radio.addEventListener('change', function() {
                updateShippingCost();
            });
        });
    });
}

function updateShippingCost() {
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    const shippingCostElement = document.getElementById('shippingCost');
    
    if (selectedShipping && shippingCostElement) {
        const label = document.querySelector(`label[for="${selectedShipping.id}"]`);
        if (label) {
            const priceMatch = label.textContent.match(/R\$\s*([\d,]+\.?\d*)/);
            if (priceMatch) {
                shippingCostElement.textContent = `R$ ${priceMatch[1]}`;
                updateCartSummary();
            }
        }
    }
}

async function proceedToCheckout() {
    if (cart.length === 0) {
        showMessage('Seu carrinho está vazio', 'error');
        return;
    }
    
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=cart.html';
        return;
    }
    
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    if (!selectedShipping) {
        showMessage('Por favor, selecione uma opção de frete', 'error');
        return;
    }
    
    try {
        await createMercadoPagoCheckout();
    } catch (error) {
        console.error('Checkout error:', error);
        showMessage('Erro ao processar pagamento. Tente novamente.', 'error');
    }
}

async function createMercadoPagoCheckout() {
    const orderData = {
        items: cart.map(item => ({
            id: item.id,
            title: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            currency_id: 'BRL'
        })),
        payer: {
            email: currentUser.email,
            name: currentUser.fullName || currentUser.name,
            phone: {
                number: currentUser.phone || ''
            },
            address: {
                zip_code: currentUser.zipCode || '',
                street_name: currentUser.street || '',
                street_number: currentUser.number || ''
            }
        },
        back_urls: {
            success: `${window.location.origin}/success.html`,
            failure: `${window.location.origin}/failure.html`,
            pending: `${window.location.origin}/pending.html`
        },
        auto_return: 'approved',
        external_reference: `ORDER_${Date.now()}`,
        notification_url: `${CONFIG.API_BASE_URL}/api/payment/webhook`
    };
    
    try {
        const response = await apiRequest('/api/payment/create-preference', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        if (response.init_point) {
            window.location.href = response.init_point;
        } else {
            throw new Error('No payment URL received');
        }
    } catch (error) {
        console.error('MercadoPago checkout error:', error);
        
        // Fallback: create mock checkout
        createMockCheckout(orderData);
    }
}

function createMockCheckout(orderData) {
    const total = getCartTotal() + getSelectedShippingCost();
    const orderId = `ORDER_${Date.now()}`;
    
    const checkoutHTML = `
        <div class="modal-overlay" id="checkoutModal">
            <div class="modal-content">
                <h3>Finalizar Pedido</h3>
                <div class="order-summary">
                    <h4>Resumo do Pedido #${orderId}</h4>
                    <p>Total: ${formatCurrency(total)}</p>
                    <p>Cliente: ${currentUser.name || currentUser.email}</p>
                </div>
                <div class="payment-methods">
                    <h4>Forma de Pagamento</h4>
                    <label><input type="radio" name="payment" value="pix"> PIX</label>
                    <label><input type="radio" name="payment" value="card"> Cartão de Crédito</label>
                    <label><input type="radio" name="payment" value="boleto"> Boleto</label>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeCheckoutModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmMockPayment('${orderId}', ${total})">Confirmar Pagamento</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', checkoutHTML);
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        modal.remove();
    }
}

async function confirmMockPayment(orderId, total) {
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    if (!selectedPayment) {
        showMessage('Selecione uma forma de pagamento', 'error');
        return;
    }
    
    try {
        // Save order to backend
        const orderData = {
            orderId: orderId,
            userId: currentUser.id,
            items: cart,
            total: total,
            paymentMethod: selectedPayment.value,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        // Clear cart and redirect
        clearCart();
        closeCheckoutModal();
        
        showMessage('Pedido realizado com sucesso!', 'success');
        
        setTimeout(() => {
            window.location.href = `success.html?order=${orderId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Order creation error:', error);
        showMessage('Erro ao criar pedido. Tente novamente.', 'error');
    }
}

// Wishlist functionality
function addToWishlist(productId) {
    if (!isLoggedIn()) {
        showMessage('Faça login para adicionar à lista de desejos', 'error');
        return;
    }
    
    let wishlist = loadFromStorage('wishlist', []);
    if (!wishlist.includes(productId)) {
        wishlist.push(productId);
        saveToStorage('wishlist', wishlist);
        showMessage('Produto adicionado à lista de desejos', 'success');
    } else {
        showMessage('Produto já está na lista de desejos', 'info');
    }
}

function removeFromWishlist(productId) {
    let wishlist = loadFromStorage('wishlist', []);
    wishlist = wishlist.filter(id => id !== productId);
    saveToStorage('wishlist', wishlist);
    showMessage('Produto removido da lista de desejos', 'success');
}

function loadWishlist() {
    return loadFromStorage('wishlist', []);
}

// Quick buy functionality
function quickBuy(productId, options = {}) {
    const product = {
        id: productId,
        ...options,
        quantity: 1
    };
    
    // Clear cart and add single product
    cart = [product];
    saveToStorage('cart', cart);
    updateCartCount();
    
    // Redirect to cart
    window.location.href = 'cart.html';
}

// Cart persistence across sessions
function syncCartWithBackend() {
    if (isLoggedIn()) {
        apiRequest('/api/cart/sync', {
            method: 'POST',
            body: JSON.stringify({ cart: cart })
        }).catch(error => {
            console.error('Cart sync error:', error);
        });
    }
}

function loadCartFromBackend() {
    if (isLoggedIn()) {
        apiRequest('/api/cart')
            .then(response => {
                if (response.cart) {
                    cart = response.cart;
                    saveToStorage('cart', cart);
                    updateCartCount();
                }
            })
            .catch(error => {
                console.error('Load cart error:', error);
            });
    }
}

// Gift functionality
function addGiftMessage(message) {
    cart.giftMessage = message;
    saveToStorage('cart', cart);
}

function setAsGift(isGift) {
    cart.isGift = isGift;
    saveToStorage('cart', cart);
}

// Cart analytics
function trackCartEvent(event, data = {}) {
    const eventData = {
        event: event,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id,
        cartTotal: getCartTotal(),
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        ...data
    };
    
    // Send to analytics service
    console.log('Cart event:', eventData);
}

// Export cart functions
window.loadCartItems = loadCartItems;
window.updateCartSummary = updateCartSummary;
window.calculateCartShipping = calculateCartShipping;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.confirmMockPayment = confirmMockPayment;
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.quickBuy = quickBuy;

// Auto-sync cart when user logs in
document.addEventListener('DOMContentLoaded', function() {
    if (isLoggedIn()) {
        loadCartFromBackend();
    }
});

// Sync cart when items are added/removed
const originalAddItemToCart = window.addItemToCart;
window.addItemToCart = function(product) {
    originalAddItemToCart(product);
    trackCartEvent('item_added', { productId: product.id });
    syncCartWithBackend();
};

const originalRemoveFromCart = window.removeFromCart;
window.removeFromCart = function(index) {
    const item = cart[index];
    originalRemoveFromCart(index);
    trackCartEvent('item_removed', { productId: item?.id });
    syncCartWithBackend();
};