// Checkout functionality
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('checkout.html')) {
        initializeCheckout();
    }
});

function initializeCheckout() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }
    
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    
    loadCheckoutData();
    setupCheckoutEventListeners();
}

function loadCheckoutData() {
    displayOrderSummary();
    loadUserAddresses();
    initializeMercadoPago();
}

function displayOrderSummary() {
    const orderSummary = document.getElementById('orderSummary');
    if (!orderSummary) return;
    
    const subtotal = getCartTotal();
    const shipping = getSelectedShippingCost();
    const total = subtotal + shipping;
    
    orderSummary.innerHTML = `
        <div class="order-items">
            ${cart.map(item => `
                <div class="order-item">
                    <div class="item-image">
                        <img src="${item.image || 'https://via.placeholder.com/60x60'}" alt="${item.name}">
                    </div>
                    <div class="item-details">
                        <h4>${item.name}</h4>
                        <p>Tamanho: ${item.size || 'Padrão'}</p>
                        <p>Pintura: ${item.paint || 'Sem pintura'}</p>
                        <p>Quantidade: ${item.quantity}</p>
                    </div>
                    <div class="item-price">
                        ${formatCurrency(item.price * item.quantity)}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="order-totals">
            <div class="total-line">
                <span>Subtotal:</span>
                <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-line">
                <span>Frete:</span>
                <span>${shipping > 0 ? formatCurrency(shipping) : 'A calcular'}</span>
            </div>
            <div class="total-line total-final">
                <span>Total:</span>
                <span>${formatCurrency(total)}</span>
            </div>
        </div>
    `;
}

function loadUserAddresses() {
    const addressSelect = document.getElementById('deliveryAddress');
    if (!addressSelect || !currentUser) return;
    
    // Se o usuário tem endereço cadastrado
    if (currentUser.address && currentUser.address.zipCode) {
        addressSelect.innerHTML = `
            <option value="default">
                ${currentUser.address.street}, ${currentUser.address.number} - 
                ${currentUser.address.neighborhood}, ${currentUser.address.city}/${currentUser.address.state}
            </option>
            <option value="new">Usar outro endereço</option>
        `;
    } else {
        addressSelect.innerHTML = '<option value="new">Cadastrar endereço de entrega</option>';
    }
}

async function initializeMercadoPago() {
    try {
        if (typeof MercadoPago !== 'undefined' && CONFIG.MERCADOPAGO_PUBLIC_KEY) {
            const mp = new MercadoPago(CONFIG.MERCADOPAGO_PUBLIC_KEY, {
                locale: 'pt-BR'
            });
            
            // Initialize card form
            const cardForm = mp.cardForm({
                amount: getCartTotal().toString(),
                iframe: true,
                form: {
                    id: "form-checkout",
                    cardNumber: {
                        id: "form-checkout__cardNumber",
                        placeholder: "Número do cartão",
                    },
                    expirationDate: {
                        id: "form-checkout__expirationDate",
                        placeholder: "MM/YY",
                    },
                    securityCode: {
                        id: "form-checkout__securityCode",
                        placeholder: "Código de segurança",
                    },
                    cardholderName: {
                        id: "form-checkout__cardholderName",
                        placeholder: "Titular do cartão",
                    },
                    issuer: {
                        id: "form-checkout__issuer",
                        placeholder: "Banco emissor",
                    },
                    installments: {
                        id: "form-checkout__installments",
                        placeholder: "Parcelas",
                    },
                    identificationType: {
                        id: "form-checkout__identificationType",
                        placeholder: "Tipo de documento",
                    },
                    identificationNumber: {
                        id: "form-checkout__identificationNumber",
                        placeholder: "Número do documento",
                    },
                    cardholderEmail: {
                        id: "form-checkout__cardholderEmail",
                        placeholder: "E-mail",
                    },
                },
                callbacks: {
                    onFormMounted: error => {
                        if (error) console.warn("Form Mounted handling error: ", error);
                    },
                    onSubmit: event => {
                        event.preventDefault();
                        processPayment(cardForm);
                    },
                    onFetching: (resource) => {
                        console.log("Fetching resource: ", resource);
                    }
                },
            });
        }
    } catch (error) {
        console.error('Error initializing MercadoPago:', error);
        showAlternativePaymentMethods();
    }
}

function showAlternativePaymentMethods() {
    const paymentContainer = document.getElementById('paymentContainer');
    if (paymentContainer) {
        paymentContainer.innerHTML = `
            <div class="payment-methods">
                <h3>Formas de Pagamento</h3>
                <div class="payment-option">
                    <input type="radio" name="paymentMethod" value="pix" id="pix">
                    <label for="pix">PIX - À vista</label>
                </div>
                <div class="payment-option">
                    <input type="radio" name="paymentMethod" value="boleto" id="boleto">
                    <label for="boleto">Boleto Bancário</label>
                </div>
                <div class="payment-option">
                    <input type="radio" name="paymentMethod" value="transfer" id="transfer">
                    <label for="transfer">Transferência Bancária</label>
                </div>
            </div>
            <button type="button" class="btn btn-primary" onclick="processAlternativePayment()">
                Finalizar Pedido
            </button>
        `;
    }
}

async function processPayment(cardForm) {
    try {
        const formData = cardForm.getCardFormData();
        
        const paymentData = {
            transaction_amount: getCartTotal(),
            token: formData.token,
            description: `Pedido Gaming Collectibles - ${cart.length} item(s)`,
            payment_method_id: formData.payment_method_id,
            installments: Number(formData.installments),
            issuer_id: formData.issuer_id,
            payer: {
                email: currentUser.email,
                identification: {
                    type: formData.identification_type,
                    number: formData.identification_number
                }
            }
        };
        
        const response = await apiRequest('/api/payment/process', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
        
        if (response.status === 'approved') {
            await createOrder(response.id, 'credit_card');
            showPaymentSuccess(response.id);
        } else {
            showPaymentError(response.status_detail);
        }
        
    } catch (error) {
        console.error('Payment processing error:', error);
        showPaymentError('Erro ao processar pagamento');
    }
}

async function processAlternativePayment() {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedMethod) {
        showMessage('Selecione uma forma de pagamento', 'error');
        return;
    }
    
    try {
        const orderId = `ORDER_${Date.now()}`;
        await createOrder(orderId, selectedMethod.value);
        
        if (selectedMethod.value === 'pix') {
            showPixPayment(orderId);
        } else if (selectedMethod.value === 'boleto') {
            showBoletoPayment(orderId);
        } else {
            showTransferPayment(orderId);
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showMessage('Erro ao processar pagamento', 'error');
    }
}

async function createOrder(paymentId, paymentMethod) {
    const orderData = {
        orderId: paymentId,
        userId: currentUser.id,
        items: cart,
        total: getCartTotal(),
        paymentMethod: paymentMethod,
        status: 'pending',
        shippingAddress: getUserShippingAddress(),
        createdAt: new Date().toISOString()
    };
    
    const response = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    });
    
    return response;
}

function getUserShippingAddress() {
    const addressSelect = document.getElementById('deliveryAddress');
    if (addressSelect && addressSelect.value === 'default' && currentUser.address) {
        return currentUser.address;
    }
    
    // Get address from form if new address was selected
    return {
        zipCode: document.getElementById('newZipCode')?.value || '',
        street: document.getElementById('newStreet')?.value || '',
        number: document.getElementById('newNumber')?.value || '',
        complement: document.getElementById('newComplement')?.value || '',
        neighborhood: document.getElementById('newNeighborhood')?.value || '',
        city: document.getElementById('newCity')?.value || '',
        state: document.getElementById('newState')?.value || ''
    };
}

function showPaymentSuccess(paymentId) {
    clearCart();
    
    const successHTML = `
        <div class="payment-result success">
            <div class="result-icon">✅</div>
            <h2>Pagamento Aprovado!</h2>
            <p>Seu pedido foi confirmado com sucesso.</p>
            <p><strong>ID do Pagamento:</strong> ${paymentId}</p>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="window.location.href='profile.html'">
                    Ver Meus Pedidos
                </button>
                <button class="btn btn-secondary" onclick="window.location.href='index.html'">
                    Continuar Comprando
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('checkoutContainer').innerHTML = successHTML;
}

function showPaymentError(error) {
    const errorHTML = `
        <div class="payment-result error">
            <div class="result-icon">❌</div>
            <h2>Erro no Pagamento</h2>
            <p>Não foi possível processar seu pagamento.</p>
            <p><strong>Motivo:</strong> ${error}</p>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="location.reload()">
                    Tentar Novamente
                </button>
                <button class="btn btn-secondary" onclick="window.location.href='cart.html'">
                    Voltar ao Carrinho
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('checkoutContainer').innerHTML = errorHTML;
}

function showPixPayment(orderId) {
    const pixHTML = `
        <div class="payment-result pix">
            <div class="result-icon">📱</div>
            <h2>Pagamento via PIX</h2>
            <p>Use o QR Code abaixo ou copie o código PIX:</p>
            <div class="pix-code">
                <div class="qr-code">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX_CODE_${orderId}" alt="QR Code PIX">
                </div>
                <div class="pix-copy">
                    <input type="text" value="PIX_CODE_${orderId}" id="pixCode" readonly>
                    <button onclick="copyPixCode()">Copiar</button>
                </div>
            </div>
            <p><small>O pagamento será confirmado automaticamente em até 2 horas.</small></p>
        </div>
    `;
    
    document.getElementById('checkoutContainer').innerHTML = pixHTML;
}

function showBoletoPayment(orderId) {
    const boletoHTML = `
        <div class="payment-result boleto">
            <div class="result-icon">🧾</div>
            <h2>Boleto Bancário</h2>
            <p>Seu boleto foi gerado com sucesso!</p>
            <div class="boleto-actions">
                <button class="btn btn-primary" onclick="downloadBoleto('${orderId}')">
                    📄 Baixar Boleto
                </button>
                <button class="btn btn-secondary" onclick="emailBoleto('${orderId}')">
                    📧 Enviar por Email
                </button>
            </div>
            <p><small>Vencimento: 3 dias úteis</small></p>
        </div>
    `;
    
    document.getElementById('checkoutContainer').innerHTML = boletoHTML;
}

function showTransferPayment(orderId) {
    const transferHTML = `
        <div class="payment-result transfer">
            <div class="result-icon">🏦</div>
            <h2>Transferência Bancária</h2>
            <div class="bank-details">
                <h3>Dados para Transferência:</h3>
                <p><strong>Banco:</strong> Banco do Brasil</p>
                <p><strong>Agência:</strong> 1234-5</p>
                <p><strong>Conta:</strong> 12345-6</p>
                <p><strong>CNPJ:</strong> 12.345.678/0001-90</p>
                <p><strong>Valor:</strong> ${formatCurrency(getCartTotal())}</p>
                <p><strong>Identificação:</strong> ${orderId}</p>
            </div>
            <p><small>Envie o comprovante para: pagamentos@gamingcollectibles.com</small></p>
        </div>
    `;
    
    document.getElementById('checkoutContainer').innerHTML = transferHTML;
}

function setupCheckoutEventListeners() {
    // Address selection
    const addressSelect = document.getElementById('deliveryAddress');
    if (addressSelect) {
        addressSelect.addEventListener('change', function() {
            const newAddressForm = document.getElementById('newAddressForm');
            if (this.value === 'new') {
                newAddressForm.style.display = 'block';
            } else {
                newAddressForm.style.display = 'none';
            }
        });
    }
    
    // CEP lookup for new address
    const newZipCode = document.getElementById('newZipCode');
    if (newZipCode) {
        newZipCode.addEventListener('blur', function() {
            const zipCode = this.value.replace(/\D/g, '');
            if (zipCode.length === 8) {
                lookupNewAddress(zipCode);
            }
        });
    }
}

async function lookupNewAddress(zipCode) {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
            document.getElementById('newStreet').value = data.logradouro || '';
            document.getElementById('newNeighborhood').value = data.bairro || '';
            document.getElementById('newCity').value = data.localidade || '';
            document.getElementById('newState').value = data.uf || '';
        }
    } catch (error) {
        console.error('Error looking up address:', error);
    }
}

// Utility functions
function copyPixCode() {
    const pixCodeInput = document.getElementById('pixCode');
    pixCodeInput.select();
    document.execCommand('copy');
    showMessage('Código PIX copiado!', 'success');
}

function downloadBoleto(orderId) {
    // Simulate boleto download
    const link = document.createElement('a');
    link.href = `${CONFIG.API_BASE_URL}/api/payment/boleto/${orderId}`;
    link.download = `boleto_${orderId}.pdf`;
    link.click();
}

function emailBoleto(orderId) {
    // Send boleto via email
    apiRequest('/api/payment/boleto/email', {
        method: 'POST',
        body: JSON.stringify({ orderId, email: currentUser.email })
    }).then(() => {
        showMessage('Boleto enviado para seu email!', 'success');
    }).catch(() => {
        showMessage('Erro ao enviar boleto', 'error');
    });
}

// Export functions
window.processAlternativePayment = processAlternativePayment;
window.copyPixCode = copyPixCode;
window.downloadBoleto = downloadBoleto;
window.emailBoleto = emailBoleto;