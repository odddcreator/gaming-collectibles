const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
    origin: ['https://odddcreator.github.io', 'https://3dcutlabs.com.br', 'http://localhost:3000'],
    credentials: true
}));

// Para webhooks, usar raw body
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Configurar MercadoPago
const mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: {
        timeout: 5000,
        idempotencyKey: 'abc123'
    }
});

const preference = new Preference(mercadopago);
const payment = new Payment(mercadopago);

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://odddcreator:o0bCPxyCJtCE5s2z@cluster0.tswkhko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Relativo ao server.js
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        // Verificar se é imagem
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-googleId');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/google/:googleId', async (req, res) => {
    try {
        const user = await User.findOne({ googleId: req.params.googleId });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
    });

// Configurações dos Correios (adicione no .env também)
const CORREIOS_CONFIG = {
    cepOrigem: process.env.CEP_ORIGEM || '01310-100', // CEP da sua empresa
    usuario: process.env.CORREIOS_USUARIO || '', // Usuário dos correios (se tiver contrato)
    senha: process.env.CORREIOS_SENHA || '', // Senha dos correios (se tiver contrato)
    cartaoPostagem: process.env.CARTAO_POSTAGEM || '', // Cartão de postagem (se tiver)
    codigoAdministrativo: process.env.CODIGO_ADMINISTRATIVO || '' // Código administrativo (se tiver)
};

// Endpoint para calcular frete
app.post('/api/shipping/calculate', async (req, res) => {
    try {
        const { cepDestino, peso, comprimento = 20, altura = 15, largura = 15, diametro = 0 } = req.body;
        
        console.log('Calculando frete:', { cepDestino, peso, comprimento, altura, largura });
        
        // Validar CEP
        if (!cepDestino || cepDestino.replace(/\D/g, '').length !== 8) {
            return res.status(400).json({ error: 'CEP de destino inválido' });
        }
        
        // Validar peso (mínimo 100g para os Correios)
        const pesoFinal = Math.max(peso, 100);
        
        try {
            // Tentar API oficial dos Correios primeiro
            const shippingOptions = await calculateCorreiosShipping({
                cepOrigem: CORREIOS_CONFIG.cepOrigem,
                cepDestino: cepDestino.replace(/\D/g, ''),
                peso: pesoFinal,
                comprimento,
                altura,
                largura,
                diametro
            });
            
            res.json(shippingOptions);
        } catch (correiosError) {
            console.warn('Erro na API dos Correios, usando fallback:', correiosError.message);
            
            // Fallback com cálculo baseado em tabela
            const fallbackOptions = calculateFallbackShipping(cepDestino, pesoFinal);
            res.json(fallbackOptions);
        }
        
    } catch (error) {
        console.error('Erro ao calcular frete:', error);
        res.status(500).json({ error: 'Erro interno ao calcular frete' });
    }
});

// Função para calcular frete via API oficial dos Correios
async function calculateCorreiosShipping({ cepOrigem, cepDestino, peso, comprimento, altura, largura, diametro }) {
    const fetch = require('node-fetch'); // npm install node-fetch@2
    
    // Códigos dos serviços dos Correios
    const servicos = [
        { codigo: '03298', nome: 'PAC' },        // PAC Contrato Agência
        { codigo: '03220', nome: 'SEDEX' }       // SEDEX Contrato Agência
    ];
    
    const results = [];
    
    for (const servico of servicos) {
        try {
            // URL da API oficial dos Correios (nova API REST)
            const url = `https://cep.correios.com.br/cep/app/consulta/precosPrazos`;
            
            const params = new URLSearchParams({
                nCdEmpresa: CORREIOS_CONFIG.codigoAdministrativo || '',
                sDsSenha: CORREIOS_CONFIG.senha || '',
                nCdServico: servico.codigo,
                sCepOrigem: cepOrigem,
                sCepDestino: cepDestino,
                nVlPeso: (peso / 1000).toString(), // kg
                nCdFormato: '1', // Caixa/pacote
                nVlComprimento: comprimento.toString(),
                nVlAltura: altura.toString(),
                nVlLargura: largura.toString(),
                nVlDiametro: diametro.toString(),
                sCdMaoPropria: 'n',
                nVlValorDeclarado: '0',
                sCdAvisoRecebimento: 'n'
            });
            
            const response = await fetch(`${url}?${params}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; 3DCutLabs/1.0)',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.Erro && data.Erro !== '0') {
                console.warn(`Erro no serviço ${servico.nome}:`, data.MsgErro);
                continue;
            }
            
            results.push({
                name: servico.nome,
                price: parseFloat(data.Valor.replace(',', '.')),
                deliveryTime: parseInt(data.PrazoEntrega),
                service: servico.codigo
            });
            
        } catch (error) {
            console.warn(`Erro ao consultar ${servico.nome}:`, error.message);
            continue;
        }
    }
    
    if (results.length === 0) {
        throw new Error('Nenhum serviço disponível');
    }
    
    return results;
}

// Função de fallback com tabela de preços
function calculateFallbackShipping(cepDestino, peso) {
    const cep = cepDestino.replace(/\D/g, '');
    const cepNum = parseInt(cep.substring(0, 2));
    
    // Determinar região baseada no CEP
    let regiao = 'sudeste'; // padrão
    
    if (cepNum >= 1 && cepNum <= 19) regiao = 'sudeste';        // SP
    else if (cepNum >= 20 && cepNum <= 28) regiao = 'sudeste';  // RJ/ES
    else if (cepNum >= 30 && cepNum <= 39) regiao = 'sudeste';  // MG
    else if (cepNum >= 40 && cepNum <= 48) regiao = 'nordeste'; // BA/SE/AL
    else if (cepNum >= 49 && cepNum <= 56) regiao = 'nordeste'; // PE/PB/RN/CE
    else if (cepNum >= 57 && cepNum <= 63) regiao = 'nordeste'; // AL/PI/MA
    else if (cepNum >= 64 && cepNum <= 72) regiao = 'norte';    // GO/TO/MT/MS
    else if (cepNum >= 73 && cepNum <= 77) regiao = 'norte';    // RO/AC/AM/RR/AP/PA
    else if (cepNum >= 78 && cepNum <= 78) regiao = 'norte';    // MT
    else if (cepNum >= 79 && cepNum <= 79) regiao = 'norte';    // MS
    else if (cepNum >= 80 && cepNum <= 87) regiao = 'sul';      // PR
    else if (cepNum >= 88 && cepNum <= 89) regiao = 'sul';      // SC
    else if (cepNum >= 90 && cepNum <= 99) regiao = 'sul';      // RS
    
    // Tabela de preços por região e peso
    const tabelaPrecos = {
        sudeste: {
            pac: { base: 15.50, adicionalPorKg: 8.00, prazo: 8 },
            sedex: { base: 25.90, adicionalPorKg: 12.00, prazo: 3 }
        },
        sul: {
            pac: { base: 18.50, adicionalPorKg: 9.50, prazo: 10 },
            sedex: { base: 32.90, adicionalPorKg: 15.00, prazo: 4 }
        },
        nordeste: {
            pac: { base: 22.50, adicionalPorKg: 11.00, prazo: 12 },
            sedex: { base: 38.90, adicionalPorKg: 18.00, prazo: 5 }
        },
        norte: {
            pac: { base: 28.50, adicionalPorKg: 14.00, prazo: 15 },
            sedex: { base: 45.90, adicionalPorKg: 22.00, prazo: 7 }
        }
    };
    
    const precos = tabelaPrecos[regiao];
    const pesoKg = peso / 1000;
    
    return [
        {
            name: 'PAC',
            price: Math.round((precos.pac.base + (pesoKg * precos.pac.adicionalPorKg)) * 100) / 100,
            deliveryTime: precos.pac.prazo,
            service: 'fallback-pac'
        },
        {
            name: 'SEDEX',
            price: Math.round((precos.sedex.base + (pesoKg * precos.sedex.adicionalPorKg)) * 100) / 100,
            deliveryTime: precos.sedex.prazo,
            service: 'fallback-sedex'
        }
    ];
}
// Routes

// Endpoint específico para servir imagens (com headers corretos)
app.get('/api/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', filename);
    
    res.sendFile(filepath, (err) => {
        if (err) {
            res.status(404).json({ error: 'Imagem não encontrada' });
        }
    });
});

// Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ active: true });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const productData = req.body;
        
        // Processar imagens com URL completa do backend
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(file => 
                `${process.env.API_URL || 'https://gaming-collectibles-api.onrender.com'}/uploads/${file.filename}`
            );
        }
        
        const product = new Product(productData);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const productData = req.body;
        
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(file => `uploads/${file.filename}`);
        }
        
        const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
        res.json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { active: false });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().populate('customer.id', 'name email').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ 'customer.id': req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        
        // Atualizar contador de pedidos do usuário
        await User.findByIdAndUpdate(order.customer.id, {
            $inc: { orderCount: 1, totalSpent: order.totals.total }
        });
        
        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Criar preferência de pagamento
app.post('/api/mercadopago/create-preference', async (req, res) => {
    try {
        const { orderData } = req.body;
        
        console.log('Criando preferência para pedido:', orderData);
        
        // Gerar external_reference único
        const externalReference = `3DCUTLABS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Preparar itens para o Mercado Pago
        const items = orderData.items.map(item => ({
            id: item.productId,
            title: `${item.name} - ${getSizeLabel(item.size)} - ${item.painting ? 'Com pintura' : 'Sem pintura'}`,
            description: `Quantidade: ${item.quantity}`,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            currency_id: 'BRL'
        }));
        
        // Adicionar frete como item separado
        if (orderData.shipping.cost > 0) {
            items.push({
                id: 'shipping',
                title: `Frete - ${orderData.shipping.method}`,
                description: `Entrega em ${orderData.shipping.deliveryTime} dias úteis`,
                quantity: 1,
                unit_price: orderData.shipping.cost,
                currency_id: 'BRL'
            });
        }
        
        const preferenceData = {
            items: items,
            payer: {
                name: orderData.customer.name,
                email: orderData.customer.email,
                phone: {
                    area_code: orderData.customer.phone.substring(1, 3),
                    number: orderData.customer.phone.substring(3).replace(/\D/g, '')
                },
                address: {
                    street_name: orderData.shipping.address.street,
                    street_number: parseInt(orderData.shipping.address.number) || 0,
                    zip_code: orderData.shipping.address.zipCode.replace(/\D/g, '')
                }
            },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/success.html`,
                failure: `${process.env.FRONTEND_URL}/failure.html`,
                pending: `${process.env.FRONTEND_URL}/pending.html`
            },
            auto_return: 'approved',
            external_reference: externalReference,
            notification_url: `${process.env.API_URL}/api/webhook/mercadopago`,
            statement_descriptor: '3D CUTLABS',
            expires: true,
            expiration_date_from: new Date().toISOString(),
            expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
            metadata: {
                customer_id: orderData.customer.id,
                order_items_count: orderData.items.length,
                shipping_method: orderData.shipping.method
            }
        };
        
        console.log('Dados da preferência:', JSON.stringify(preferenceData, null, 2));
        
        const result = await preference.create({ body: preferenceData });
        
        console.log('Preferência criada:', result.id);
        
        // Salvar pedido temporário no banco com status 'pending_payment'
        const orderToSave = {
            ...orderData,
            external_reference: externalReference,
            mercadopago_preference_id: result.id,
            status: 'pending_payment',
            payment: {
                status: 'pending',
                method: 'mercadopago'
            }
        };
        
        const order = new Order(orderToSave);
        await order.save();
        
        console.log('Pedido temporário salvo:', order.orderNumber);
        
        res.json({
            preference_id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
            external_reference: externalReference,
            order_id: order._id
        });
        
    } catch (error) {
        console.error('Erro ao criar preferência:', error);
        res.status(500).json({ 
            error: 'Erro ao criar preferência de pagamento',
            details: error.message 
        });
    }
});

// Webhook do Mercado Pago - com logs mais detalhados
app.post('/api/webhook/mercadopago', async (req, res) => {
    try {
        console.log('=== WEBHOOK RECEBIDO ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        
        const { type, data, action } = req.body;
        
        // Responder rapidamente para evitar timeout
        res.status(200).send('OK');
        
        if (type === 'payment') {
            const paymentId = data.id;
            console.log('💳 Processando pagamento ID:', paymentId);
            
            // Aguardar um pouco antes de consultar (MP pode demorar para processar)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                // Buscar dados do pagamento no Mercado Pago
                const paymentData = await payment.get({ id: paymentId });
                console.log('💰 Dados do pagamento:', JSON.stringify(paymentData, null, 2));
                
                const externalReference = paymentData.external_reference;
                
                if (!externalReference) {
                    console.warn('⚠️ External reference não encontrado no pagamento');
                    return;
                }
                
                console.log('🔍 Buscando pedido com external_reference:', externalReference);
                
                // Buscar pedido no banco
                const order = await Order.findOne({ external_reference: externalReference });
                
                if (!order) {
                    console.warn('❌ Pedido não encontrado:', externalReference);
                    
                    // Listar todos os pedidos para debug
                    const allOrders = await Order.find({}, 'orderNumber external_reference').limit(10);
                    console.log('📋 Pedidos existentes:', allOrders);
                    return;
                }
                
                console.log('✅ Pedido encontrado:', order.orderNumber);
                console.log('📊 Status atual do pedido:', order.status);
                console.log('💳 Status do pagamento MP:', paymentData.status);
                
                // Atualizar status do pedido baseado no status do pagamento
                let newOrderStatus = order.status;
                let newPaymentStatus = paymentData.status;
                
                switch (paymentData.status) {
                    case 'approved':
                        newOrderStatus = 'processing';
                        newPaymentStatus = 'approved';
                        console.log('✅ Pagamento APROVADO para pedido:', order.orderNumber);
                        break;
                        
                    case 'pending':
                    case 'in_process':
                        newOrderStatus = 'pending_payment';
                        newPaymentStatus = 'pending';
                        console.log('⏳ Pagamento PENDENTE para pedido:', order.orderNumber);
                        break;
                        
                    case 'rejected':
                    case 'cancelled':
                        newOrderStatus = 'cancelled';
                        newPaymentStatus = 'rejected';
                        console.log('❌ Pagamento REJEITADO para pedido:', order.orderNumber);
                        break;
                        
                    default:
                        console.log('❓ Status de pagamento não reconhecido:', paymentData.status);
                }
                
                // Atualizar pedido
                const updatedOrder = await Order.findByIdAndUpdate(
                    order._id,
                    {
                        status: newOrderStatus,
                        'payment.status': newPaymentStatus,
                        'payment.transactionId': paymentId,
                        'payment.method': paymentData.payment_method_id,
                        'payment.paidAt': paymentData.status === 'approved' ? new Date() : null,
                        'payment.details': {
                            installments: paymentData.installments,
                            card_last_four_digits: paymentData.card?.last_four_digits,
                            payment_type: paymentData.payment_type_id
                        }
                    },
                    { new: true }
                );
                
                console.log('🔄 Pedido atualizado:', updatedOrder.orderNumber, 'Novo status:', newOrderStatus);
                
                // Se aprovado, processar ações pós-pagamento
                if (paymentData.status === 'approved') {
                    console.log('🎉 Processando aprovação do pagamento...');
                    
                    // Reduzir estoque dos produtos
                    for (const item of order.items) {
                        const updatedProduct = await Product.findByIdAndUpdate(
                            item.productId,
                            { $inc: { stock: -item.quantity } },
                            { new: true }
                        );
                        console.log(`📦 Estoque atualizado - Produto: ${item.name}, Novo estoque: ${updatedProduct?.stock}`);
                    }
                    
                    // Atualizar estatísticas do usuário
                    const updatedUser = await User.findByIdAndUpdate(
                        order.customer.id,
                        { 
                            $inc: { 
                                orderCount: 1,
                                totalSpent: order.totals.total 
                            }
                        },
                        { new: true }
                    );
                    
                    console.log('👤 Estatísticas do usuário atualizadas:', {
                        email: updatedUser?.email,
                        orderCount: updatedUser?.orderCount,
                        totalSpent: updatedUser?.totalSpent
                    });
                }
                
                console.log('=== WEBHOOK PROCESSADO COM SUCESSO ===');
                
            } catch (paymentError) {
                console.error('❌ Erro ao processar dados do pagamento:', paymentError);
            }
        } else {
            console.log('ℹ️ Tipo de webhook ignorado:', type);
        }
        
    } catch (error) {
        console.error('💥 Erro geral no webhook:', error);
        // Não retornar erro para evitar reenvios desnecessários
    }
});

// Endpoint para testar webhook manualmente
app.post('/api/webhook/test', async (req, res) => {
    try {
        console.log('🧪 TESTE DE WEBHOOK');
        console.log('Body recebido:', req.body);
        
        // Simular processamento
        const { payment_id, external_reference } = req.body;
        
        if (external_reference) {
            const order = await Order.findOne({ external_reference });
            console.log('Pedido encontrado:', order ? order.orderNumber : 'Não encontrado');
        }
        
        res.json({ success: true, message: 'Teste realizado' });
    } catch (error) {
        console.error('Erro no teste:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para verificar configuração do webhook
app.get('/api/webhook/status', (req, res) => {
    res.json({
        webhook_url: `${process.env.API_URL}/api/webhook/mercadopago`,
        api_url: process.env.API_URL,
        frontend_url: process.env.FRONTEND_URL,
        timestamp: new Date().toISOString()
    });
});

// Consultar status de pagamento
app.get('/api/payment/status/:external_reference', async (req, res) => {
    try {
        const { external_reference } = req.params;
        
        const order = await Order.findOne({ external_reference });
        
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        
        res.json({
            order_number: order.orderNumber,
            status: order.status,
            payment_status: order.payment.status,
            total: order.totals.total
        });
        
    } catch (error) {
        console.error('Erro ao consultar status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Função auxiliar para labels de tamanho
function getSizeLabel(size) {
    const labels = {
        'small': '18cm (1:10)',
        'medium': '22cm (1:8)', 
        'large': '26cm (1:7)'
    };
    return labels[size] || size;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Uploads será servido em: ${process.env.API_URL || 'https://gaming-collectibles-api.onrender.com'}/uploads/`);
});