let isAdminAuthenticated = false;

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
            fetch(`${API_BASE_URL}/api/users`)
        ]);
        
        const products = productsRes.ok ? await productsRes.json() : [];
        const orders = ordersRes.ok ? await ordersRes.json() : [];
        const users = usersRes.ok ? await usersRes.json() : [];
        
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'pending').length;
        document.getElementById('totalUsers').textContent = users.length;
        
        // Calcular vendas do mês
        const currentMonth = new Date().getMonth();
        const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.getMonth() === currentMonth && order.status === 'completed';
        });
        
        const monthSales = monthOrders.reduce((total, order) => total + order.total, 0);
        document.getElementById('monthSales').textContent = `R$ ${formatPrice(monthSales)}`;
        
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

async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`);
        const orders = response.ok ? await response.json() : [];
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order._id.slice(-6)}</td>
                <td>${order.customer.name}</td>
                <td>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>R$ ${formatPrice(order.totals.total)}</td>
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

// Handle form submission
document.getElementById('addProductForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: 'POST',
            body: formData // FormData já inclui as imagens
        });
        
        if (response.ok) {
            const product = await response.json();
            console.log('Produto criado com imagens:', product.images);
            alert('Produto adicionado com sucesso!');
            closeAddProductForm();
            loadProducts();
            loadDashboardStats();
        } else {
            const error = await response.text();
            alert('Erro ao adicionar produto: ' + error);
        }
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        alert('Erro ao adicionar produto');
    }
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

function getStatusLabel(status) {
    const labels = {
        'pending_payment': 'Aguardando Pagamento', // ✅ Novo status
        'pending': 'Pendente',
        'processing': 'Processando',
        'shipped': 'Enviado',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return labels[status] || status;
}

function editProduct(productId) {
    // Implementar edição de produto
    alert('Funcionalidade de edição em desenvolvimento');
}

function viewOrder(orderId) {
    // Implementar visualização de pedido
    alert('Funcionalidade de visualização em desenvolvimento');
}

function viewUser(userId) {
    // Implementar visualização de usuário
    alert('Funcionalidade de visualização em desenvolvimento');
}