let userAddresses = [];
let editingAddressId = null;

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
    
    // Resto da inicialização...
});

// Mover checkUserSession para o início
function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Usuário logado:', currentUser.email);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            localStorage.removeItem('userData');
            currentUser = null;
        }
    } else {
        currentUser = null;
    }
}

async function initializeProfile() {
    try {
        updateCartDisplay();
        loadUserProfile();
        await loadUserAddresses();
        await loadUserOrders();
        setupFormHandlers();
    } catch (error) {
        console.error('Erro ao inicializar perfil:', error);
    }
}

// Corrigir a função loadUserProfile no profile.js
function loadUserProfile() {
    console.log('🔄 Carregando perfil do usuário:', currentUser);
    
    // ✅ CORRIGIR atualização do header do perfil
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileName) {
        profileName.textContent = currentUser.fullName || currentUser.name || 'Usuário';
    }
    
    if (profileEmail) {
        profileEmail.textContent = currentUser.email || 'email@exemplo.com';
    }
    
    if (profileAvatar) {
        if (currentUser.picture) {
            profileAvatar.src = currentUser.picture;
        } else {
            const userName = currentUser.fullName || currentUser.name || 'User';
            profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1e3a8a&color=fff&size=80`;
        }
    }
    
    // Preencher formulário de dados pessoais
    const form = document.getElementById('personalForm');
    if (form) {
        const fields = {
            fullName: currentUser.fullName || currentUser.name || '',
            phone: currentUser.phone || '',
            birthDate: currentUser.birthDate ? currentUser.birthDate.split('T')[0] : '',
            gender: currentUser.gender || '',
            cpf: currentUser.cpf || ''
        };
        
        Object.keys(fields).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.value = fields[fieldName];
            }
        });
    }
}

// ✅ CORRIGIR inicialização do profile
document.addEventListener('DOMContentLoaded', function() {
    if (!requireLogin('Faça login para acessar seu perfil')) {
        return;
    }
    
    console.log('🚀 Inicializando perfil...');
    initializeProfile();
});

async function initializeProfile() {
    try {
        updateCartDisplay();
        loadUserProfile(); // ✅ Chamar aqui
        await loadUserAddresses();
        await loadUserOrders();
        setupFormHandlers();
    } catch (error) {
        console.error('❌ Erro ao inicializar perfil:', error);
    }
}

async function loadUserAddresses() {
    try {
        // Por enquanto, usar endereços salvos localmente no usuário
        userAddresses = currentUser.addresses || [];
        
        // Se tiver endereço principal, adicionar à lista
        if (currentUser.address && !userAddresses.length) {
            userAddresses = [{
                _id: 'default',
                label: 'Principal',
                ...currentUser.address,
                isDefault: true
            }];
        }
        
        displayAddresses();
    } catch (error) {
        console.error('Erro ao carregar endereços:', error);
        document.getElementById('addressesList').innerHTML = '<p>Erro ao carregar endereços.</p>';
    }
}

function displayAddresses() {
    console.log("displayadresses triggered");
    const container = document.getElementById('addressesList');
    
    if (userAddresses.length === 0) {
        container.innerHTML = `
            <div class="no-addresses">
                <p>Nenhum endereço cadastrado.</p>
                <button class="btn btn-primary" onclick="showAddAddressForm()">Adicionar Primeiro Endereço</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userAddresses.map(address => `
        <div class="address-card ${address.isDefault ? 'default' : ''}">
            <div class="address-label">
                ${address.label || 'Endereço'}
                ${address.isDefault ? '<span class="default-badge">Principal</span>' : ''}
            </div>
            <div class="address-info">
                <p>${address.street}, ${address.number}</p>
                ${address.complement ? `<p>${address.complement}</p>` : ''}
                <p>${address.neighborhood} - ${address.city}, ${address.state}</p>
                <p>CEP: ${address.zipCode}</p>
            </div>
            <div class="address-actions">
                <button class="btn-small btn-edit" onclick="editAddress('${address._id || address.id}')">
                    Editar
                </button>
                ${!address.isDefault ? `
                    <button class="btn-small btn-delete" onclick="deleteAddress('${address._id || address.id}')">
                        Excluir
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function loadUserOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/user/${currentUser._id}`);
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
        } else {
            throw new Error('Erro ao carregar pedidos');
        }
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        document.getElementById('ordersList').innerHTML = '<p>Erro ao carregar pedidos.</p>';
    }
}

function displayOrders(orders) {
    const container = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="no-orders">
                <p>Você ainda não fez nenhum pedido.</p>
                <a href="index.html" class="btn btn-primary">Começar a Comprar</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-number">Pedido #${order.orderNumber}</div>
                    <div class="order-date">${new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div class="order-status status-${order.status}">
                    ${getStatusLabel(order.status)}
                </div>
            </div>
            
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <img src="${item.image || 'assets/placeholder.jpg'}" 
                             alt="${item.name}" 
                             class="order-item-image">
                        <div class="order-item-info">
                            <div class="order-item-name">${item.name}</div>
                            <div class="order-item-details">
                                ${getSizeLabel(item.size)} • ${item.painting ? 'Com pintura' : 'Sem pintura'} • Qtd: ${item.quantity}
                            </div>
                        </div>
                        <div class="order-item-price">R$ ${formatPrice(item.totalPrice)}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-total">
                Total: R$ ${formatPrice(order.totals.total)}
            </div>
            
            ${order.shipping.trackingCode ? `
                <div class="tracking-info">
                    <strong>Código de rastreamento:</strong> ${order.shipping.trackingCode}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function setupFormHandlers() {
    // Formulário de dados pessoais
    const personalForm = document.getElementById('personalForm');
    if (personalForm) {
        personalForm.addEventListener('submit', handlePersonalFormSubmit);
    }
    
    // Formulário de endereço
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', handleAddressFormSubmit);
    }
    
    // Máscara para CPF
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }
}

async function handlePersonalFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updateData = {};
    
    for (let [key, value] of formData.entries()) {
        updateData[key] = value;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            
            // Atualizar dados locais
            Object.assign(currentUser, updatedUser);
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            alert('Dados atualizados com sucesso!');
            loadUserProfile();
        } else {
            throw new Error('Erro ao atualizar dados');
        }
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        alert('Erro ao atualizar dados. Tente novamente.');
    }
}

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.profile-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover classe active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    document.getElementById(sectionName).classList.add('active');
    event.target.classList.add('active');
}

function showAddAddressForm() {
    editingAddressId = null;
    document.getElementById('addressModalTitle').textContent = 'Adicionar Endereço';
    document.getElementById('addressForm').reset();
    document.getElementById('addressModal').style.display = 'block';
}

function editAddress(addressId) {
    const address = userAddresses.find(addr => (addr._id || addr.id) === addressId);
    if (!address) return;
    
    editingAddressId = addressId;
    document.getElementById('addressModalTitle').textContent = 'Editar Endereço';
    
    // Preencher formulário
    const form = document.getElementById('addressForm');
    form.addressId.value = addressId;
    form.label.value = address.label || '';
    form.zipCode.value = address.zipCode || '';
    form.state.value = address.state || '';
    form.city.value = address.city || '';
    form.neighborhood.value = address.neighborhood || '';
    form.street.value = address.street || '';
    form.number.value = address.number || '';
    form.complement.value = address.complement || '';
    
    document.getElementById('addressModal').style.display = 'block';
}

async function handleAddressFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const addressData = {};
    
    for (let [key, value] of formData.entries()) {
        if (key !== 'addressId') {
            addressData[key] = value;
        }
    }
    
    try {
        if (editingAddressId) {
            // Editar endereço existente
            const addressIndex = userAddresses.findIndex(addr => (addr._id || addr.id) === editingAddressId);
            if (addressIndex >= 0) {
                userAddresses[addressIndex] = { ...userAddresses[addressIndex], ...addressData };
            }
        } else {
            // Adicionar novo endereço
            const newAddress = {
                id: Date.now().toString(),
                ...addressData,
                isDefault: userAddresses.length === 0
            };
            userAddresses.push(newAddress);
        }
        
        // Atualizar no servidor
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addresses: userAddresses })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser.addresses = updatedUser.addresses;
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            displayAddresses();
            closeAddressModal();
            alert('Endereço salvo com sucesso!');
        } else {
            throw new Error('Erro ao salvar endereço');
        }
    } catch (error) {
        console.error('Erro ao salvar endereço:', error);
        alert('Erro ao salvar endereço. Tente novamente.');
    }
}

async function deleteAddress(addressId) {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return;
    
    try {
        userAddresses = userAddresses.filter(addr => (addr._id || addr.id) !== addressId);
        
        // Atualizar no servidor
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addresses: userAddresses })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser.addresses = updatedUser.addresses;
            localStorage.setItem('userData', JSON.stringify(currentUser));
            
            displayAddresses();
            alert('Endereço excluído com sucesso!');
        } else {
            throw new Error('Erro ao excluir endereço');
        }
    } catch (error) {
        console.error('Erro ao excluir endereço:', error);
        alert('Erro ao excluir endereço. Tente novamente.');
    }
}

function closeAddressModal() {
    document.getElementById('addressModal').style.display = 'none';
    editingAddressId = null;
}

async function searchAddressCEP() {
    const cep = document.getElementById('addressZipCode').value.replace(/\D/g, '');
    
    if (cep.length === 8) {
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                document.getElementById('addressState').value = data.uf;
                document.getElementById('addressCity').value = data.localidade;
                document.getElementById('addressNeighborhood').value = data.bairro;
                document.getElementById('addressStreet').value = data.logradouro;
            } else {
                alert('CEP não encontrado');
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            alert('Erro ao buscar CEP');
        }
    }
}

async function deleteAccount() {
    const confirmation = prompt('Para confirmar a exclusão da sua conta, digite "EXCLUIR" (sem aspas):');
    
    if (confirmation !== 'EXCLUIR') {
        alert('Confirmação incorreta. Operação cancelada.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${currentUser._id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Conta excluída com sucesso.');
            logout();
        } else {
            throw new Error('Erro ao excluir conta');
        }
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta. Tente novamente ou entre em contato conosco.');
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending_payment': 'Aguardando Pagamento',
        'pending': 'Pendente',
        'processing': 'Processando',
        'shipped': 'Enviado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const addressModal = document.getElementById('addressModal');
    
    if (event.target === addressModal) {
        closeAddressModal();
    }
}

// Máscara para CEP no modal de endereço
document.addEventListener('DOMContentLoaded', function() {
    const addressZipCode = document.getElementById('addressZipCode');
    if (addressZipCode) {
        addressZipCode.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }
});