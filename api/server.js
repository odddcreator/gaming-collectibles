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