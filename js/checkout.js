let currentStep = 1;
let shippingData = {};
let selectedShippingMethod = null;
let orderData = {};

document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há itens no carrinho
    if (cart.length === 0) {
        alert('Seu carrinho está vazio');
        window.location.href = 'index.html';
        return;
    }
    
    // Verificar se o usuário está logado
    if (!currentUser) {
        alert('Faça login para continuar');
        window.location.href = 'index.html';
        return;
    }
    
    initializeCheckout();
});

function initializeCheckout() {
    updateCartDisplay();
    loadUserData();
    updateOrderSidebar();
    updateSummary();
}

function loadUserData() {
    if (currentUser && currentUser.address) {
        const address = currentUser.address;
        document.getElementById('fullName').value = currentUser.fullName || '';
        document.getElementById('phone').value = currentUser.phone || '';
        document.getElementById('zipCode').value = address.zipCode || '';
        document.getElementById('state').value = address.state || '';
        document.getElementById('city').value = address.city || '';
        document.getElementById('neighborhood').value = address.neighborhood || '';
        document.getElementById('street').value = address.street || '';
        document.getElementById('number').value = address.number || '';
        document.getElementById('complement').value = address.complement || '';
    }
}

function nextStep() {
    if (currentStep === 1) {
        if (validateShippingForm()) {
            collectShippingData();
            calculateShipping();
            showStep(2);
        }
    } else if (currentStep === 2) {
        updateOrderReview();
        showStep(3);
        initializePayment();
    }
}

function previousStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

function showStep(step) {
    // Esconder todas as etapas
    document.querySelectorAll('.checkout-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Esconder todos os indicadores de etapa
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostrar etapa atual
    if (step === 1) {
        document.getElementById('shippingStep').classList.add('active');
    } else if (step === 2) {
        document.getElementById('reviewStep').classList.add('active');
    } else if (step === 3) {
        document.getElementById('paymentStep').classList.add('active');
    }
    
    // Ativar indicador da etapa
    document.querySelectorAll('.step')[step - 1].classList.add('active');
    
    currentStep = step;
}

function validateShippingForm() {
    const form = document.getElementById('shippingForm');
    const formData = new FormData(form);
    
    for (let [key, value] of formData.entries()) {
        if (!value.trim() && key !== 'complement') {
            alert('Por favor, preencha todos os campos obrigatórios');
            return false;
        }
    }
    
    if (!selectedShippingMethod) {
        alert('Por favor, selecione um método de envio');
        return false;
    }
    
    return true;
}

function collectShippingData() {
    const form = document.getElementById('shippingForm');
    const formData = new FormData(form);
    
    shippingData = {};
    for (let [key, value] of formData.entries()) {
        shippingData[key] = value;
    }
    
    shippingData.shippingMethod = selectedShippingMethod;
}

async function searchCEP() {
    const cep = document.getElementById('zipCode').value.replace(/\D/g, '');
    
    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                document.getElementById('state').value = data.uf;
                document.getElementById('city').value = data.localidade;
                document.getElementById('neighborhood').value = data.bairro;
                document.getElementById('street').value = data.logradouro;
                
                // Calcular frete automaticamente
                calculateShipping();
            } else {
                alert('CEP não encontrado');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Erro ao buscar CEP');
        }
    }
}

async function calculateShipping() {
    const cep = document.getElementById('zipCode').value.replace(/\D/g, '');
    
    if (cep.length !== 8) return;
    
    const container = document.getElementById('shippingMethodsContainer');
    container.innerHTML = '<p>Calculando frete...</p>';
    
    try {
        // Calcular peso total
        const totalWeight = cart.reduce((sum, item) => {
            const product = products.find(p => p._id === item.id);
            return sum + (product?.weight || 100) * item.quantity;
        }, 0);
        
        const shippingMethods = await calculateShippingOptions(cep, totalWeight);
        
        container.innerHTML = shippingMethods.map((method, index) => `
            <div class="shipping-method" onclick="selectShippingMethod(${index})">
                <div class="shipping-info">
                    <input type="radio" name="shipping" value="${index}" id="shipping_${index}">
                    <label for="shipping_${index}">
                        <strong>${method.name}</strong><br>
                        <small>${method.deliveryTime} dias úteis</small>
                    </label>
                </div>
                <div class="shipping-price">R$ ${formatPrice(method.price)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        container.innerHTML = '<p>Erro ao calcular frete. Tente novamente.</p>';
    }
}

async function calculateShippingOptions(cep, weight) {
    // Simulação da API dos Correios - substituir pela integração real
    return [
        {
            name: 'PAC',
            price: Math.max(15.50, weight * 0.01),
            deliveryTime: 8
        },
        {
            name: 'SEDEX',
            price: Math.max(25.90, weight * 0.02),
            deliveryTime: 3
        }
    ];
}

function selectShippingMethod(index) {
    // Remover seleção anterior
    document.querySelectorAll('.shipping-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Selecionar método atual
    document.querySelectorAll('.shipping-method')[index].classList.add('selected');
    document.getElementById(`shipping_${index}`).checked = true;
    
    selectedShippingMethod = {
        index: index,
        name: document.querySelector(`.shipping-method:nth-child(${index + 1}) strong`).textContent,
        price: parseFloat(document.querySelector(`.shipping-method:nth-child(${index + 1}) .shipping-price`).textContent.replace('R$ ', '').replace(',', '.')),
        deliveryTime: parseInt(document.querySelector(`.shipping-method:nth-child(${index + 1}) small`).textContent)
    };
    
    updateSummary();
}

function updateOrderSidebar() {
    const container = document.getElementById('sidebarItems');
    
    container.innerHTML = cart.map(item => `
        <div class="sidebar-item">
            <img src="${item.image}" alt="${item.name}" class="sidebar-item-image">
            <div class="sidebar-item-info">
                <div class="sidebar-item-name">${item.name}</div>
                <div class="sidebar-item-details">
                    ${getSizeLabel(item.size)} • ${item.painting ? 'Com pintura' : 'Sem pintura'} • Qtd: ${item.quantity}
                </div>
                <div class="sidebar-item-price">R$ ${formatPrice(item.finalPrice * item.quantity)}</div>
            </div>
        </div>
    `).join('');
}

function updateSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const shippingCost = selectedShippingMethod ? selectedShippingMethod.price : 0;
    const total = subtotal + shippingCost;
    
    // Atualizar sidebar
    document.getElementById('sidebarSubtotal').textContent = formatPrice(subtotal);
    document.getElementById('sidebarShipping').textContent = formatPrice(shippingCost);
    document.getElementById('sidebarTotal').textContent = formatPrice(total);
    
    // Atualizar revisão
    if (document.getElementById('reviewSubtotal')) {
        document.getElementById('reviewSubtotal').textContent = `R$ ${formatPrice(subtotal)}`;
        document.getElementById('reviewShipping').textContent = `R$ ${formatPrice(shippingCost)}`;
        document.getElementById('reviewTotal').textContent = `R$ ${formatPrice(total)}`;
    }
    
    // Atualizar pagamento
    if (document.getElementById('finalTotal')) {
        document.getElementById('finalTotal').textContent = formatPrice(total);
    }
}

function updateOrderReview() {
    // Atualizar endereço de entrega
    const addressReview = document.getElementById('shippingAddressReview');
    addressReview.innerHTML = `
        <p><strong>${shippingData.fullName}</strong></p>
        <p>${shippingData.street}, ${shippingData.number}</p>
        ${shippingData.complement ? `<p>${shippingData.complement}</p>` : ''}
        <p>${shippingData.neighborhood} - ${shippingData.city}, ${shippingData.state}</p>
        <p>CEP: ${shippingData.zipCode}</p>
        <p>Tel: ${shippingData.phone}</p>
        <p><strong>Frete:</strong> ${selectedShippingMethod.name} (${selectedShippingMethod.deliveryTime} dias úteis)</p>
    `;
    
    // Atualizar itens do pedido
    const itemsReview = document.getElementById('orderItemsReview');
    itemsReview.innerHTML = cart.map(item => `
        <div class="review-item">
            <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">
            <div style="flex: 1; margin-left: 1rem;">
                <h4>${item.name}</h4>
                <p>Tamanho: ${getSizeLabel(item.size)}</p>
                <p>Pintura: ${item.painting ? 'Sim' : 'Não'}</p>
                <p>Quantidade: ${item.quantity}</p>
                <p><strong>R$ ${formatPrice(item.finalPrice * item.quantity)}</strong></p>
            </div>
        </div>
    `).join('');
    
    updateSummary();
}

function editShipping() {
    showStep(1);
}

async function initializePayment() {
    try {
        // Preparar dados do pedido
        const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
        const shippingCost = selectedShippingMethod.price;
        const total = subtotal + shippingCost;
        
        orderData = {
            customer: {
                id: currentUser._id,
                name: shippingData.fullName,
                email: currentUser.email,
                phone: shippingData.phone
            },
            items: cart.map(item => ({
                productId: item.id,
                name: item.name,
                size: item.size,
                painting: item.painting,
                quantity: item.quantity,
                unitPrice: item.finalPrice,
                totalPrice: item.finalPrice * item.quantity
            })),
            shipping: {
                address: {
                    street: shippingData.street,
                    number: shippingData.number,
                    complement: shippingData.complement,
                    neighborhood: shippingData.neighborhood,
                    city: shippingData.city,
                    state: shippingData.state,
                    zipCode: shippingData.zipCode
                },
                method: selectedShippingMethod.name,
                cost: shippingCost,
                deliveryTime: selectedShippingMethod.deliveryTime
            },
            totals: {
                subtotal: subtotal,
                shipping: shippingCost,
                total: total
            }
        };
        
        // Criar preferência do Mercado Pago
        const preference = {
            items: [{
                id: 'order-' + Date.now(),
                title: `Pedido 3D CutLabs - ${cart.length} item(s)`,
                quantity: 1,
                unit_price: total
            }],
            payer: {
                name: shippingData.fullName,
                email: currentUser.email,
                phone: {
                    number: shippingData.phone
                }
            },
            back_urls: {
                success: `${window.location.origin}/success.html`,
                failure: `${window.location.origin}/failure.html`,
                pending: `${window.location.origin}/pending.html`
            },
            auto_return: 'approved',
            external_reference: 'order-' + Date.now()
        };
        
        // Criar checkout do Mercado Pago
        const checkout = mp.checkout({
            preference: preference
        });
        
        // Renderizar checkout
        checkout.render({
            container: '#mercadopagoContainer',
            label: 'Finalizar Compra'
        });
        
    } catch (error) {
        console.error('Erro ao inicializar pagamento:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
    }
}

// Função para processar o pedido após o pagamento
async function processOrder(paymentData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                ...orderData,
                payment: paymentData
            })
        });
        
        if (response.ok) {
            const order = await response.json();
            
            // Limpar carrinho
            cart = [];
            saveCart();
            
            // Redirecionar para página de sucesso
            window.location.href = `success.html?order=${order._id}`;
        } else {
            throw new Error('Erro ao processar pedido');
        }
    } catch (error) {
        console.error('Erro ao processar pedido:', error);
        alert('Erro ao processar pedido. Entre em contato conosco.');
    }
}