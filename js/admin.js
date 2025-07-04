let isAdminAuthenticated = false;
let currentEditingProduct = null;
let imagesToRemove = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
});

function checkAdminAuth() {
    // Primeiro carregar a sessão
    checkUserSession();
    
    if (!currentUser) {
        redirectToLogin();
        return;
    }
    
    // Verificar se o usuário é admin
    if (!currentUser.isAdmin) {
        alert('Acesso negado. Você não tem permissões de administrador.');
        window.location.href = 'index.html';
        return;
    }
    
    isAdminAuthenticated = true;
    document.getElementById('adminUserName').textContent = currentUser.name || currentUser.email;
    initializeAdmin();
}

function checkUserSession() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            console.log('Sessão admin carregada:', currentUser.email);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
            localStorage.removeItem('userData');
            currentUser = null;
        }
    } else {
        currentUser = null;
    }
}

function redirectToLogin() {
    alert('Faça login como administrador para acessar este painel.');
    window.location.href = 'index.html';
}

async function initializeAdmin() {
    try {
        await loadDashboardStats();
        await loadProducts();
        await loadOrders();
        await loadUsers();
    } catch (error) {
        console.error('Erro ao inicializar painel admin:', error);
    }
}

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover classe active de todos os nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    document.getElementById(sectionName).classList.add('active');
    event.target.classList.add('active');
    
    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'Produtos',
        'orders': 'Pedidos',
        'users': 'Usuários'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionName];
}

async function loadDashboardStats() {
    try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/products`),
            fetch(`${API_BASE_URL}/api/orders`),
            fetch(`${API_BASE_URL}/api/users`),
        ]);
        
        const products = productsRes.ok ? await productsRes.json() : [];
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        const users = usersRes.ok ? await usersRes.json() : [];
        
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'pending').length;
        document.getElementById('totalUsers').textContent = users.length;
        
        // Calcular vendas do mês
        const currentMonth = new Date().getMonth();
        console.log("currentMonth: "+currentMonth);
        const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.getMonth() === currentMonth && order.status === 'completed';

        });
        console.log("monthOrders: "+monthOrders);
        const monthSales = monthOrders.reduce((total, order) => total + order.totals.total, 0);
        document.getElementById('monthSales').textContent = `R$ ${formatPrice(monthSales)}`;
        console.log("monthSales: "+monthSales);

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const products = response.ok ? await response.json() : [];
        
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <img src="${product.images[0] || 'assets/placeholder.jpg'}" 
                         alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover;">
                </td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>R$ ${formatPrice(product.basePrice)}</td>
                <td>${product.stock || 'Sob encomenda'}</td>
                <td>
                    <button onclick="editProduct('${product._id}')" class="btn-small">Editar</button>
                    <button onclick="deleteProduct('${product._id}')" class="btn-small btn-danger">Excluir</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

// Em admin.js, atualizar a função loadOrders
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`);
        const orders = response.ok ? await response.json() : [];
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.orderNumber || order._id.slice(-6)}</td>
                <td>${order.customer.name}</td>
                <td>${order.customer.email}</td>
                <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>R$ ${formatPrice(order.totals.total)}</td>
                <td>
                    ${order.items[0].name}<br>
                    ${order.items[0].size}<br>
                    <span>Pintura: </span>${order.items[0].painting}<br>
                    <span>Qtde: </span>${order.items[0].quantity}
                </td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusLabel(order.status)}
                    </span>
                </td>
                <td>
                    <button onclick="viewOrder('${order._id}')" class="btn-small">Ver</button>
                    <select onchange="updateOrderStatus('${order._id}', this.value)">
                        <option value="pending_payment" ${order.status === 'pending_payment' ? 'selected' : ''}>Aguardando Pagamento</option>
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="approved" ${order.status === 'approved' ? 'selected' : ''}>Aprovado</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processando</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Enviado</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending_payment': 'Aguardando Pagamento',
        'pending': 'Pendente',
        'approved': 'Aprovado', // ✅ Adicionar
        'processing': 'Processando',
        'shipped': 'Enviado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users`);
        const users = response.ok ? await response.json() : [];
        
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>${user.orderCount || 0}</td>
                <td>
                    <button onclick="viewUser('${user._id}')" class="btn-small">Ver</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function showAddProductForm() {
    document.getElementById('addProductModal').style.display = 'block';
}

function closeAddProductForm() {
    document.getElementById('addProductModal').style.display = 'none';
    document.getElementById('addProductForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
}

// Handle image preview
document.getElementById('productImages').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    for (let file of e.target.files) {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            img.style.margin = '5px';
            preview.appendChild(img);
        }
    }
});

// Adicionar no admin.js
function toggleProductOptions() {
    const category = document.getElementById('productCategory').value;
    const paintingGroup = document.getElementById('paintingOptionGroup');
    const sizesContainer = document.getElementById('sizesContainer');
    const hasPaintingCheckbox = document.getElementById('hasPaintingOption');
    
    if (category === 'stencil') {
        // Stencils não têm pintura
        hasPaintingCheckbox.checked = false;
        paintingGroup.style.display = 'none';
        
        // Tamanhos para stencils
        sizesContainer.innerHTML = `
            <div class="sizes-grid">
                <label><input type="checkbox" name="availableSizes" value="30cm" checked> 30cm (x1)</label>
                <label><input type="checkbox" name="availableSizes" value="60cm" checked> 60cm (x2)</label>
                <label><input type="checkbox" name="availableSizes" value="90cm" checked> 90cm (x3)</label>
                <label><input type="checkbox" name="availableSizes" value="120cm" checked> 120cm (x4)</label>
                <label><input type="checkbox" name="availableSizes" value="180cm" checked> 180cm (x5)</label>
            </div>
        `;
    } else {
        // Action figures têm pintura
        hasPaintingCheckbox.checked = true;
        paintingGroup.style.display = 'block';
        
        // Tamanhos para action figures
        sizesContainer.innerHTML = `
            <div class="sizes-grid">
                <label><input type="checkbox" name="availableSizes" value="small" checked> 18cm (1:10)</label>
                <label><input type="checkbox" name="availableSizes" value="medium" checked> 22cm (1:8)</label>
                <label><input type="checkbox" name="availableSizes" value="large" checked> 26cm (1:7)</label>
            </div>
        `;
    }
}

// Corrigir o form handler no admin.js
document.getElementById('addProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // ✅ CORRIGIR processamento de tamanhos
    const availableSizes = [];
    const sizeInputs = document.querySelectorAll('input[name="availableSizes"]:checked');
    sizeInputs.forEach(input => availableSizes.push(input.value));
    
    // ✅ CORRIGIR processamento de booleans
    const featured = document.getElementById('productFeatured').checked;
    const hasPaintingOption = document.getElementById('hasPaintingOption').checked;
    
    // Remover os campos que vamos tratar manualmente
    formData.delete('availableSizes');
    formData.delete('featured');
    formData.delete('hasPaintingOption');
    
    // Adicionar campos tratados
    formData.append('availableSizes', JSON.stringify(availableSizes));
    formData.append('featured', featured.toString());
    formData.append('hasPaintingOption', hasPaintingOption.toString());
    
    console.log('📋 Dados do formulário:', {
        availableSizes: availableSizes,
        featured: featured,
        hasPaintingOption: hasPaintingOption
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const product = await response.json();
            console.log('✅ Produto criado:', product);
            alert('Produto adicionado com sucesso!');
            closeAddProductForm();
            loadProducts();
            loadDashboardStats();
        } else {
            const errorData = await response.json();
            console.error('❌ Erro da API:', errorData);
            alert('Erro ao adicionar produto: ' + JSON.stringify(errorData));
        }
    } catch (error) {
        console.error('❌ Erro ao adicionar produto:', error);
        alert('Erro ao adicionar produto: ' + error.message);
    }
});

// Chamar função ao carregar
document.addEventListener('DOMContentLoaded', function() {
    toggleProductOptions();
});

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Produto excluído com sucesso!');
            loadProducts();
            loadDashboardStats();
        } else {
            alert('Erro ao excluir produto');
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            alert('Status do pedido atualizado!');
            loadOrders();
        } else {
            alert('Erro ao atualizar status');
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar status');
    }
}

// ✅ IMPLEMENTAR função editProduct
async function editProduct(productId) {
    try {
        console.log('📝 Editando produto:', productId);
        
        // Buscar dados do produto
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Produto não encontrado');
        }
        
        const product = await response.json();
        console.log('📦 Produto carregado:', product);
        
        currentEditingProduct = product;
        imagesToRemove = [];
        
        // Preencher formulário
        populateEditForm(product);
        
        // Mostrar modal
        document.getElementById('editProductModal').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        alert('Erro ao carregar produto: ' + error.message);
    }
}

// ✅ Preencher formulário de edição
function populateEditForm(product) {
    console.log('📋 Preenchendo formulário com:', product);
    
    // Campos básicos
    document.getElementById('editProductId').value = product._id;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductCategory').value = product.category || 'action-figure';
    document.getElementById('editProductGame').value = product.game || '';
    document.getElementById('editProductPrice').value = product.basePrice || '';
    document.getElementById('editProductWeight').value = product.weight || '';
    document.getElementById('editProductStock').value = product.stock || '';
    document.getElementById('editProductDescription').value = product.description || '';
    
    // Checkboxes
    document.getElementById('editHasPaintingOption').checked = product.hasPaintingOption !== false;
    document.getElementById('editProductFeatured').checked = product.featured || false;
    document.getElementById('editProductActive').checked = product.active !== false;
    
    // Configurar opções baseadas na categoria
    toggleEditProductOptions();
    
    // Preencher tamanhos disponíveis
    populateEditSizes(product);
    
    // Mostrar imagens atuais
    displayCurrentImages(product.images || []);
}

// ✅ Configurar opções baseadas na categoria (edição)
function toggleEditProductOptions() {
    const category = document.getElementById('editProductCategory').value;
    const paintingGroup = document.getElementById('editPaintingOptionGroup');
    const sizesContainer = document.getElementById('editSizesContainer');
    const hasPaintingCheckbox = document.getElementById('editHasPaintingOption');
    
    if (category === 'stencil') {
        // Stencils não têm pintura
        hasPaintingCheckbox.checked = false;
        paintingGroup.style.display = 'none';
        
        // Tamanhos para stencils
        sizesContainer.innerHTML = `
            <div class="sizes-grid">
                <label><input type="checkbox" name="editAvailableSizes" value="30cm"> 30cm (x1)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="60cm"> 60cm (x2)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="90cm"> 90cm (x3)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="120cm"> 120cm (x4)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="180cm"> 180cm (x5)</label>
            </div>
        `;
    } else {
        // Action figures têm pintura
        paintingGroup.style.display = 'block';
        
        // Tamanhos para action figures
        sizesContainer.innerHTML = `
            <div class="sizes-grid">
                <label><input type="checkbox" name="editAvailableSizes" value="small"> 18cm (1:10)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="medium"> 22cm (1:8)</label>
                <label><input type="checkbox" name="editAvailableSizes" value="large"> 26cm (1:7)</label>
            </div>
        `;
    }
}

// ✅ Preencher tamanhos selecionados
function populateEditSizes(product) {
    const availableSizes = product.availableSizes || [];
    console.log('📏 Tamanhos disponíveis:', availableSizes);
    
    // Aguardar um pouco para o HTML ser renderizado
    setTimeout(() => {
        const sizeCheckboxes = document.querySelectorAll('input[name="editAvailableSizes"]');
        sizeCheckboxes.forEach(checkbox => {
            checkbox.checked = availableSizes.includes(checkbox.value);
        });
    }, 100);
}

// ✅ Mostrar imagens atuais
function displayCurrentImages(images) {
    const container = document.getElementById('currentImages');
    
    if (!images || images.length === 0) {
        container.innerHTML = '<div class="image-placeholder">Nenhuma imagem</div>';
        return;
    }
    
    container.innerHTML = images.map((image, index) => `
        <div class="current-image" data-image-url="${image}">
            <img src="${image}" alt="Imagem ${index + 1}">
            <button type="button" class="remove-image" onclick="markImageForRemoval('${image}', this)">×</button>
        </div>
    `).join('');
}

// ✅ Marcar imagem para remoção
function markImageForRemoval(imageUrl, button) {
    const imageDiv = button.parentElement;
    
    if (imageDiv.classList.contains('marked-for-removal')) {
        // Desmarcar
        imageDiv.classList.remove('marked-for-removal');
        imageDiv.style.opacity = '1';
        button.textContent = '×';
        button.style.background = '#ef4444';
        
        const index = imagesToRemove.indexOf(imageUrl);
        if (index > -1) {
            imagesToRemove.splice(index, 1);
        }
    } else {
        // Marcar para remoção
        imageDiv.classList.add('marked-for-removal');
        imageDiv.style.opacity = '0.5';
        button.textContent = '↶';
        button.style.background = '#059669';
        
        if (!imagesToRemove.includes(imageUrl)) {
            imagesToRemove.push(imageUrl);
        }
    }
    
    console.log('🗑️ Imagens marcadas para remoção:', imagesToRemove);
}

// ✅ Preview de novas imagens (edição)
document.getElementById('editProductImages').addEventListener('change', function(e) {
    const preview = document.getElementById('editImagePreview');
    preview.innerHTML = '';
    
    for (let file of e.target.files) {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.style.width = '100px';
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            img.style.margin = '5px';
            img.style.borderRadius = '8px';
            preview.appendChild(img);
        }
    }
});

// ✅ Fechar modal de edição
function closeEditProductForm() {
    document.getElementById('editProductModal').style.display = 'none';
    document.getElementById('editProductForm').reset();
    document.getElementById('editImagePreview').innerHTML = '';
    currentEditingProduct = null;
    imagesToRemove = [];
}

// ✅ Handler do formulário de edição
document.getElementById('editProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const productId = document.getElementById('editProductId').value;
    
    console.log('💾 Atualizando produto:', productId);
    
    // Processar tamanhos selecionados
    const availableSizes = [];
    const sizeInputs = document.querySelectorAll('input[name="editAvailableSizes"]:checked');
    sizeInputs.forEach(input => availableSizes.push(input.value));
    
    // Processar booleans
    const featured = document.getElementById('editProductFeatured').checked;
    const hasPaintingOption = document.getElementById('editHasPaintingOption').checked;
    const active = document.getElementById('editProductActive').checked;
    
    // Remover campos que vamos tratar manualmente
    formData.delete('editAvailableSizes');
    formData.delete('featured');
    formData.delete('hasPaintingOption');
    formData.delete('active');
    formData.delete('productId');
    
    // Adicionar campos tratados
    formData.append('availableSizes', JSON.stringify(availableSizes));
    formData.append('featured', featured.toString());
    formData.append('hasPaintingOption', hasPaintingOption.toString());
    formData.append('active', active.toString());
    
    // Adicionar imagens para remoção
    if (imagesToRemove.length > 0) {
        formData.append('imagesToRemove', JSON.stringify(imagesToRemove));
    }
    
    console.log('📤 Enviando dados:', {
        availableSizes: availableSizes,
        featured: featured,
        hasPaintingOption: hasPaintingOption,
        active: active,
        imagesToRemove: imagesToRemove
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'PUT',
            body: formData
        });
        
        if (response.ok) {
            const product = await response.json();
            console.log('✅ Produto atualizado:', product);
            alert('Produto atualizado com sucesso!');
            closeEditProductForm();
            loadProducts();
            loadDashboardStats();
        } else {
            const errorData = await response.json();
            console.error('❌ Erro da API:', errorData);
            alert('Erro ao atualizar produto: ' + JSON.stringify(errorData));
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        alert('Erro ao atualizar produto: ' + error.message);
    }
});

function viewOrder(orderId) {
    // Implementar visualização de pedido
    alert('Funcionalidade de visualização em desenvolvimento');
}

function viewUser(userId) {
    // Implementar visualização de usuário
    alert('Funcionalidade de visualização em desenvolvimento');
}

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar eventos
    toggleProductOptions(); // Para o form de criar
    
    // Fechar modais ao clicar fora
    window.onclick = function(event) {
        const addModal = document.getElementById('addProductModal');
        const editModal = document.getElementById('editProductModal');
        
        if (event.target === addModal) {
            closeAddProductForm();
        }
        if (event.target === editModal) {
            closeEditProductForm();
        }
    };
});