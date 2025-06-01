const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('api/uploads', express.static('uploads'));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://odddcreator:o0bCPxyCJtCE5s2z@cluster0.tswkhko.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'api/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Routes

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
        
        // Processar imagens
        if (req.files) {
            productData.images = req.files.map(file => `api/uploads/${file.filename}`);
        }
        
        const product = new Product(productData);
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const productData = req.body;
        
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(file => `api/uploads/${file.filename}`);
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
});