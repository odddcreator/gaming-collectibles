let currentStep = 1;
let shippingData = {};
let selectedShippingMethod = null;
let orderData = {};

// Função auxiliar para verificar login (adicione em profile.js, checkout.js, admin.js)
function requireLogin(redirectMessage = 'Faça login para acessar esta página') {
    checkUserSession();
    if (!currentUser) {
        alert(redirectMessage);
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Use assim no início do DOMContentLoaded:
document.addEventListener('DOMContentLoaded', function() {
    if (!requireLogin('Faça login para acessar seu perfil')) {
        return;
    }
    
    
    // Verificar se há itens no carrinho
    if (cart.length === 0) {
        alert('Seu carrinho está vazio');
        window.location.href = 'index.html';
        return;
    }
    
    // Verificar se o usuário está logado
    if (!currentUser) {
        alert('Faça login para continuar com a compra');
        window.location.href = 'index.html';
        return;
    }
    
    initializeCheckout();
});

// Mover checkUserSession para o início
function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Usuário logado no checkout:', currentUser.email);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            localStorage.removeItem('userData');
            currentUser = null;
        }
    } else {
        currentUser = null;
    }
}

function initializeCheckout() {
    updateCartDisplay();
    loadUserData();
    updateOrderSidebar();
    updateSummary();
    calculateShippingOptions();
    calculateShipping();
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
    try {
        console.log('Calculando frete para:', { cep, weight });
        
        const response = await fetch(`${API_BASE_URL}/api/shipping/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cepDestino: cep,
                peso: weight, // em gramas
                comprimento: 20, // cm - ajuste conforme seus produtos
                altura: 15,     // cm
                largura: 15,    // cm
                diametro: 0     // cm (para produtos cilíndricos)
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const shippingOptions = await response.json();
        
        console.log('Opções de frete recebidas:', shippingOptions);
        
        // Verificar se retornou opções válidas
        if (!shippingOptions || shippingOptions.length === 0) {
            throw new Error('Nenhuma opção de frete disponível');
        }
        
        return shippingOptions;
        
    } catch (error) {
        console.error('Erro ao calcular frete real:', error);
        
        // Fallback local em caso de erro total
        return [
            {
                name: 'PAC (Estimativa)',
                price: Math.max(15.50, weight * 0.01),
                deliveryTime: 8,
                service: 'fallback-local'
            },
            {
                name: 'SEDEX (Estimativa)',
                price: Math.max(25.90, weight * 0.02),
                deliveryTime: 3,
                service: 'fallback-local'
            }
        ];
    }
}

// Também atualizar a função calculateShipping para ter melhor tratamento de erro
async function calculateShipping() {
    const cep = document.getElementById('zipCode').value.replace(/\D/g, '');
    
    if (cep.length !== 8) return;
    
    const container = document.getElementById('shippingMethodsContainer');
    container.innerHTML = '<p>Calculando frete...</p>';
    
    try {
        // Calcular peso total dos itens no carrinho
        const totalWeight = cart.reduce((sum, item) => {
            const product = products.find(p => p._id === item.id);
            const productWeight = product?.weight || 100; // peso padrão se não encontrar
            return sum + (productWeight * item.quantity);
        }, 0);
        
        console.log('Peso total do carrinho:', totalWeight, 'gramas');
        
        const shippingMethods = await calculateShippingOptions(cep, totalWeight);
        
        if (shippingMethods.length === 0) {
            container.innerHTML = '<p style="color: orange;">Não foi possível calcular o frete. Entre em contato conosco.</p>';
            return;
        }
        
        container.innerHTML = shippingMethods.map((method, index) => `
            <div class="shipping-method" onclick="selectShippingMethod(${index})">
                <div class="shipping-info">
                    <input type="radio" name="shipping" value="${index}" id="shipping_${index}">
                    <label for="shipping_${index}">
                        <strong>${method.name}</strong><br>
                        <small>${method.deliveryTime} dias úteis</small>
                        ${method.service?.includes('fallback') ? '<br><small style="color: orange;">*Valor estimado</small>' : ''}
                    </label>
                </div>
                <div class="shipping-price">R$ ${formatPrice(method.price)}</div>
            </div>
        `).join('');
        
        // Armazenar métodos para seleção posterior
        window.currentShippingMethods = shippingMethods;
        
    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        container.innerHTML = `
            <p style="color: red;">Erro ao calcular frete.</p>
            <button onclick="calculateShipping()" class="btn btn-secondary" style="margin-top: 10px;">
                Tentar Novamente
            </button>
        `;
    }
}

// Atualizar selectShippingMethod para usar os dados armazenados
function selectShippingMethod(index) {
    if (!window.currentShippingMethods || !window.currentShippingMethods[index]) {
        console.error('Método de frete não encontrado');
        return;
    }
    
    // Remover seleção anterior
    document.querySelectorAll('.shipping-method').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Selecionar método atual
    document.querySelectorAll('.shipping-method')[index].classList.add('selected');
    document.getElementById(`shipping_${index}`).checked = true;
    
    selectedShippingMethod = {
        index: index,
        ...window.currentShippingMethods[index]
    };
    
    console.log('Método selecionado:', selectedShippingMethod);
    
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
        console.log('Inicializando pagamento...');
        
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
        
        console.log('Dados do pedido preparados:', orderData);
        
        // Criar preferência no backend
        const response = await fetch(`${API_BASE_URL}/api/mercadopago/create-preference`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderData })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${errorData.error} - ${errorData.details}`);
        }
        
        const preferenceData = await response.json();
        console.log('Preferência criada:', preferenceData);
        
        // Salvar dados para consulta posterior
        sessionStorage.setItem('currentOrder', JSON.stringify({
            external_reference: preferenceData.external_reference,
            order_id: preferenceData.order_id
        }));
        
        // Criar checkout do Mercado Pago
        if (!mp) {
            throw new Error('SDK do Mercado Pago não carregado');
        }
        
        const checkout = mp.checkout({
            preference: {
                id: preferenceData.preference_id
            },
            render: {
                container: '#mercadopagoContainer',
                label: 'Finalizar Compra'
            }
        });
        
        console.log('Checkout renderizado');
        
        // Adicionar listener para erros do checkout
        checkout.on('error', (error) => {
            console.error('Erro no checkout:', error);
            alert('Erro no checkout. Tente novamente.');
        });
        
        // Monitorar mudanças na janela para detectar retorno do pagamento
        window.addEventListener('focus', checkPaymentStatus);
        
    } catch (error) {
        console.error('Erro ao inicializar pagamento:', error);
        
        // Mostrar erro detalhado para o usuário
        const container = document.getElementById('mercadopagoContainer');
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; border: 1px solid #ef4444; border-radius: 8px; background: #fef2f2;">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">Erro ao processar pagamento</h3>
                <p style="color: #991b1b; margin-bottom: 1rem;">${error.message}</p>
                <button onclick="initializePayment()" class="btn btn-primary">Tentar Novamente</button>
                <button onclick="previousStep()" class="btn btn-secondary" style="margin-left: 1rem;">Voltar</button>
            </div>
        `;
    }
}

// Função para verificar status do pagamento após retorno
async function checkPaymentStatus() {
    const orderData = sessionStorage.getItem('currentOrder');
    if (!orderData) return;
    
    try {
        const order = JSON.parse(orderData);
        
        const response = await fetch(`${API_BASE_URL}/api/payment/status/${order.external_reference}`);
        
        if (response.ok) {
            const status = await response.json();
            
            if (status.payment_status === 'approved') {
                // Limpar dados temporários
                sessionStorage.removeItem('currentOrder');
                localStorage.removeItem('cart');
                
                // Redirecionar para sucesso
                window.location.href = `success.html?order=${status.order_number}`;
            } else if (status.payment_status === 'rejected') {
                // Redirecionar para falha
                window.location.href = 'failure.html';
            }
            // Se pending, não fazer nada (continuar esperando)
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
    }
}

// Remover listener quando sair da página
window.addEventListener('beforeunload', () => {
    window.removeEventListener('focus', checkPaymentStatus);
});