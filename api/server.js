const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors({
    origin: ['https://odddcreator.github.io', 'https://3dcutlabs.com.br', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://odddcreator:o0bCPxyCJtCE5s2z@cluster0.tswkhko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

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

// Webhook do Mercado Pago
app.post('/api/webhook/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        if (type === 'payment') {
            // Processar pagamento
            // Implementar lógica específica do Mercado Pago
        }
        
        res.status(200).send('OK');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Uploads será servido em: ${process.env.API_URL || 'https://gaming-collectibles-api.onrender.com'}/uploads/`);
});