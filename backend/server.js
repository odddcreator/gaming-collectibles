const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'YOUR_MONGODB_CONNECTION_STRING', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, provider } = req.body;
        
        let user = await User.findOne({ email });
        
        if (provider === 'google') {
            if (!user) {
                user = new User({
                    email,
                    name: req.body.name,
                    provider: 'google',
                    googleId: req.body.id
                });
                await user.save();
            }
        } else {
            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                profileComplete: user.profileComplete
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            email,
            password: hashedPassword,
            provider: 'email'
        });
        
        await user.save();
        
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            user: {
                id: user._id,
                email: user.email,
                profileComplete: false
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Products routes
app.get('/api/products', async (req, res) => {
    try {
        const { type } = req.query;
        const filter = type ? { type } : {};
        const products = await Product.find(filter);
        res.json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Shipping calculation
app.post('/api/shipping', async (req, res) => {
    try {
        const { zipCode, items } = req.body;
        
        // Calcular peso total baseado nos items
        const totalWeight = items.reduce((sum, item) => {
            const weight = item.type === 'action-figure' ? 0.5 : 0.1; // kg
            return sum + (weight * item.quantity);
        }, 0);
        
        // Chamar API do Melhor Envio
        const shippingData = {
            from: { postal_code: "01310-100" }, // CEP da sua loja
            to: { postal_code: zipCode },
            package: {
                height: 10,
                width: 15,
                length: 20,
                weight: totalWeight
            }
        };
        
        const response = await axios.post(
            'https://melhorenvio.com.br/api/v2/me/shipment/calculate',
            shippingData,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json({ options: response.data });
    } catch (error) {
        // Fallback para valores fixos
        const options = [
            { code: 'pac', name: 'PAC', price: 15.90, deliveryTime: '7-10 dias úteis' },
            { code: 'sedex', name: 'SEDEX', price: 25.90, deliveryTime: '3-5 dias úteis' }
        ];
        res.json({ options });
    }
});

// Payment routes (MercadoPago integration)
app.post('/api/payment/create-preference', async (req, res) => {
    try {
        // MercadoPago integration would go here
        // For now, return mock response
        res.json({
            init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MOCK_PREFERENCE_ID',
            preference_id: 'MOCK_PREFERENCE_ID'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orders routes
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            userId: req.user.userId
        };
        
        const order = new Order(orderData);
        await order.save();
        
        res.json({ order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin routes
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const user = await User.findById(req.user.userId);
        if (!user.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const products = await Product.find();
        res.json({ products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/products', authenticateToken, upload.array('images'), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const productData = req.body;
        productData.images = req.files ? req.files.map(file => file.path) : [];
        
        const product = new Product(productData);
        await product.save();
        
        res.json({ product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;