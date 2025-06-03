// models/Order.js - CORRIGIR o erro de duplicate key
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    size: { type: String },  // ✅ Remover enum para aceitar tamanhos de stencils
    painting: Boolean,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true }, // ✅ Manter apenas este como unique
    external_reference: { 
        type: String, 
        unique: true, 
        sparse: true
    },
    mercadopago_preference_id: { 
        type: String, 
        sparse: true
    },
    customer: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: String,
        email: String,
        phone: String
    },
    items: [orderItemSchema],
    shipping: {
        address: {
            street: String,
            number: String,
            complement: String,
            neighborhood: String,
            city: String,
            state: String,
            zipCode: String
        },
        method: String,
        cost: Number,
        deliveryTime: Number,
        trackingCode: String
    },
    payment: {
        method: String,
        transactionId: String,
        status: { 
            type: String, 
            enum: ['pending', 'approved', 'rejected', 'cancelled'], // ✅ Adicionar 'approved'
            default: 'pending'
        },
        paidAt: Date,
        details: {
            installments: Number,
            card_last_four_digits: String,
            payment_type: String
        }
    },
    totals: {
        subtotal: Number,
        shipping: Number,
        total: Number
    },
    status: {
        type: String,
        enum: ['pending_payment', 'pending', 'approved', 'processing', 'shipped', 'completed', 'cancelled'], // ✅ Adicionar 'approved'
        default: 'pending_payment'
    },
    notes: String
}, {
    timestamps: true
});

// ✅ MELHORAR geração do orderNumber
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        let orderNumber;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 20) { // Aumentar tentativas
            // Gerar número mais único
            const timestamp = Date.now().toString();
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            orderNumber = `3DC${timestamp.slice(-8)}${random}`;
            
            // Verificar se já existe
            const existing = await mongoose.model('Order').findOne({ orderNumber });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }
        
        if (!isUnique) {
            // Fallback mais robusto
            orderNumber = `3DC${this._id.toString().slice(-8).toUpperCase()}${Date.now().toString().slice(-4)}`;
        }
        
        this.orderNumber = orderNumber;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);