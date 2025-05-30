// Admin panel functionality
let currentProducts = [];
let currentOrders = [];
let currentUsers = [];
let editingProductId = null;

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin.html')) {
        initializeAdmin();
    }
});

function initializeAdmin() {
    // Check if user is admin
    if (!isLoggedIn() || !isAdmin()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadAdminData();
    setupAdminEventListeners();
}

function isAdmin() {
    return currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@example.com');
}

function showAdminSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    document.getElementById(section + 'Section').classList.remove('hidden');
    event.target.classList.add('active');
    
    // Load section-specific data
    switch (section) {
        case 'products':
            loadProductsAdmin();
            break;
        case 'orders':
            loadOrdersAdmin();
            break;
        case 'users':
            loadUsersAdmin();
            break;
        case 'reports':
            loadReportsAdmin();
            break;
    }
}

async function loadAdminData() {
    try {
        await Promise.all([
            loadProductsAdmin(),
            loadOrdersAdmin(),
            loadUsersAdmin(),
            loadReportsAdmin()
        ]);
    } catch (error) {
        console.error('Error loading admin data:', error);
        loadMockAdminData();
    }
}

function loadMockAdminData() {
    // Mock products
    currentProducts = [
        {
            id: '1',
            name: 'Guerreiro Élfico de Aion',
            type: 'action-figure',
            basePrice: 199.99,
            stock: 15,
            status: 'active',
            image: 'https://via.placeholder.com/100x100'
        },
        {
            id: '2',
            name: 'Stencil Logo Guild Wars',
            type: 'stencil',
            basePrice: 29.99,
            stock: 8,
            status: 'active',
            image: 'https://via.placeholder.com/100x100'
        }
    ];
    
    // Mock orders
    currentOrders = [
        {
            id: 'ORDER_001',
            customerName: 'João Silva',
            customerEmail: 'joao@email.com',
            date: '2025-01-15',
            total: 299.99,
            status: 'processing'
        },
        {
            id: 'ORDER_002',
            customerName: 'Maria Santos',
            customerEmail: 'maria@email.com',
            date: '2025-01-14',
            total: 159.99,
            status: 'shipped'
        }
    ];
    
    // Mock users
    currentUsers = [
        {
            id: '1',
            name: 'João Silva',
            email: 'joao@email.com',
            registerDate: '2025-01-01',
            ordersCount: 3,
            status: 'active'
        },
        {
            id: '2',
            name: 'Maria Santos',
            email: 'maria@email.com',
            registerDate: '2025-01-05',
            ordersCount: 1,
            status: 'active'
        }
    ];
    
    displayAdminData();
}

function displayAdminData() {
    displayProductsTable();
    displayOrdersTable();
    displayUsersTable();
    updateOrdersStats();
}

async function loadProductsAdmin() {
    try {
        const response = await apiRequest('/api/admin/products');
        currentProducts = response.products || [];
        displayProductsTable();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProductsTable() {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    
    if (currentProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>';
        return;
    }
    
    tableBody.innerHTML = currentProducts.map(product => `
        <tr>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/50x50'}" 
                     alt="${product.name}" class="product-image-thumb">
            </td>
            <td>${product.name}</td>
            <td>
                <span class="badge ${product.type === 'action-figure' ? 'badge-primary' : 'badge-secondary'}">
                    ${product.type === 'action-figure' ? 'Action Figure' : 'Stencil'}
                </span>
            </td>
            <td>${formatCurrency(product.basePrice)}</td>
            <td>${product.stock}</td>
            <td>
                <span class="status-badge ${product.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${product.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="editProduct('${product.id}')">Editar</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteProduct('${product.id}')">Excluir</button>
                    <button class="btn btn-sm btn-view" onclick="toggleProductStatus('${product.id}')">
                        ${product.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadOrdersAdmin() {
    try {
        const response = await apiRequest('/api/admin/orders');
        currentOrders = response.orders || [];
        displayOrdersTable();
        updateOrdersStats();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrdersTable() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;
    
    if (currentOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum pedido encontrado</td></tr>';
        return;
    }
    
    tableBody.innerHTML = currentOrders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customerName}</td>
            <td>${formatDate(order.date)}</td>
            <td>${formatCurrency(order.total)}</td>
            <td>
                <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processando</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Enviado</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Entregue</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                </select>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewOrder('${order.id}')">Ver Detalhes</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateOrdersStats() {
    const stats = {
        new: currentOrders.filter(o => o.status === 'pending').length,
        processing: currentOrders.filter(o => o.status === 'processing').length,
        shipped: currentOrders.filter(o => o.status === 'shipped').length,
        delivered: currentOrders.filter(o => o.status === 'delivered').length
    };
    
    const newOrdersEl = document.getElementById('newOrders');
    const processingOrdersEl = document.getElementById('processingOrders');
    const shippedOrdersEl = document.getElementById('shippedOrders');
    const deliveredOrdersEl = document.getElementById('deliveredOrders');
    
    if (newOrdersEl) newOrdersEl.textContent = stats.new;
    if (processingOrdersEl) processingOrdersEl.textContent = stats.processing;
    if (shippedOrdersEl) shippedOrdersEl.textContent = stats.shipped;
    if (deliveredOrdersEl) deliveredOrdersEl.textContent = stats.delivered;
}

async function loadUsersAdmin() {
    try {
        const response = await apiRequest('/api/admin/users');
        currentUsers = response.users || [];
        displayUsersTable();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    if (currentUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    tableBody.innerHTML = currentUsers.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${formatDate(user.registerDate)}</td>
            <td>${user.ordersCount}</td>
            <td>
                <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${user.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-view" onclick="viewUser('${user.id}')">Ver Perfil</button>
                    <button class="btn btn-sm btn-edit" onclick="toggleUserStatus('${user.id}')">
                        ${user.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function loadReportsAdmin() {
    // Load reports data
    console.log('Loading reports...');
}

// Product management functions
function showAddProductForm() {
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Adicionar Novo Produto';
    document.getElementById('addProductForm').reset();
    editingProductId = null;
    
    // Show/hide action figure options based on type
    const typeSelect = document.getElementById('productType');
    const actionFigureOptions = document.getElementById('actionFigureOptions');
    
    typeSelect.addEventListener('change', function() {
        if (this.value === 'action-figure') {
            actionFigureOptions.style.display = 'block';
        } else {
            actionFigureOptions.style.display = 'none';
        }
    });
}

function cancelProductForm() {
    document.getElementById('productForm').classList.add('hidden');
    editingProductId = null;
}

function editProduct(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    editingProductId = productId;
    document.getElementById('productForm').classList.remove('hidden');
    document.getElementById('formTitle').textContent = 'Editar Produto';
    
    // Fill form with product data
    document.getElementById('productName').value = product.name;
    document.getElementById('productType').value = product.type;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('basePrice').value = product.basePrice;
    document.getElementById('stock').value = product.stock;
}

async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
        await apiRequest(`/api/admin/products/${productId}`, {
            method: 'DELETE'
        });
        
        currentProducts = currentProducts.filter(p => p.id !== productId);
        displayProductsTable();
        showMessage('Produto excluído com sucesso!', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showMessage('Erro ao excluir produto', 'error');
    }
}

async function toggleProductStatus(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    try {
        await apiRequest(`/api/admin/products/${productId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        product.status = newStatus;
        displayProductsTable();
        showMessage('Status do produto atualizado!', 'success');
    } catch (error) {
        console.error('Error updating product status:', error);
        showMessage('Erro ao atualizar status', 'error');
    }
}

// Order management functions
async function updateOrderStatus(orderId, newStatus) {
    try {
        await apiRequest(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        const order = currentOrders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            updateOrdersStats();
        }
        
        showMessage('Status do pedido atualizado!', 'success');
    } catch (error) {
        console.error('Error updating order status:', error);
        showMessage('Erro ao atualizar status do pedido', 'error');
    }
}

function viewOrder(orderId) {
    // Open order details modal or redirect to order detail page
    window.open(`order-detail.html?id=${orderId}`, '_blank');
}

// User management functions
function viewUser(userId) {
    // Open user profile modal or redirect to user detail page
    window.open(`user-detail.html?id=${userId}`, '_blank');
}

async function toggleUserStatus(userId) {
    const user = currentUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
        await apiRequest(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        
        user.status = newStatus;
        displayUsersTable();
        showMessage('Status do usuário atualizado!', 'success');
    } catch (error) {
        console.error('Error updating user status:', error);
        showMessage('Erro ao atualizar status do usuário', 'error');
    }
}

// Event listeners setup
function setupAdminEventListeners() {
    // Product form submission
    const productForm = document.getElementById('addProductForm');
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const productData = Object.fromEntries(formData);
            
            // Handle multiple selections
            const sizes = Array.from(this.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);
            const paintOptions = Array.from(this.querySelectorAll('input[name="paintOptions"]:checked')).map(cb => cb.value);
            
            productData.sizes = sizes;
            productData.paintOptions = paintOptions;
            productData.images = []; // Handle file uploads separately
            
            try {
                if (editingProductId) {
                    await apiRequest(`/api/admin/products/${editingProductId}`, {
                        method: 'PUT',
                        body: JSON.stringify(productData)
                    });
                    showMessage('Produto atualizado com sucesso!', 'success');
                } else {
                    const response = await apiRequest('/api/admin/products', {
                        method: 'POST',
                        body: JSON.stringify(productData)
                    });
                    currentProducts.push(response.product);
                    showMessage('Produto criado com sucesso!', 'success');
                }
                
                displayProductsTable();
                cancelProductForm();
            } catch (error) {
                console.error('Error saving product:', error);
                showMessage('Erro ao salvar produto', 'error');
            }
        });
    }
    
    // Search and filter functionality
    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(function() {
            filterProducts(this.value);
        }, 300));
    }
    
    const productFilter = document.getElementById('productFilter');
    if (productFilter) {
        productFilter.addEventListener('change', function() {
            filterProducts(document.getElementById('productSearch').value, this.value);
        });
    }
}

function filterProducts(searchTerm = '', typeFilter = 'all') {
    let filteredProducts = [...currentProducts];
    
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (typeFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.type === typeFilter);
    }
    
    // Update display with filtered products
    const tableBody = document.getElementById('productsTableBody');
    if (tableBody) {
        if (filteredProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto encontrado</td></tr>';
        } else {
            // Use the existing display function but with filtered data
            const originalProducts = currentProducts;
            currentProducts = filteredProducts;
            displayProductsTable();
            currentProducts = originalProducts;
        }
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Export admin functions
window.showAdminSection = showAdminSection;
window.showAddProductForm = showAddProductForm;
window.cancelProductForm = cancelProductForm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.toggleProductStatus = toggleProductStatus;
window.updateOrderStatus = updateOrderStatus;
window.viewOrder = viewOrder;
window.viewUser = viewUser;
window.toggleUserStatus = toggleUserStatus;