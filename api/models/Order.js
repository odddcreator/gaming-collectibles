// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    size: String,
    painting: Boolean,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
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
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
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
        enum: ['pending_payment', 'pending', 'approved', 'processing', 'shipped', 'completed', 'cancelled'],
        default: 'pending_payment'
    },
    notes: String
}, {
    timestamps: true
});

// ✅ Middleware simplificado e mais robusto
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        let orderNumber;
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            // Gerar número único
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 100000);
            orderNumber = `3DC${timestamp}${random}`;
            
            try {
                // Verificar se já existe
                const existing = await mongoose.model('Order').findOne({ 
                    orderNumber: orderNumber 
                }).lean();
                
                if (!existing) {
                    this.orderNumber = orderNumber;
                    console.log(`✅ OrderNumber gerado: ${orderNumber}`);
                    break;
                }
            } catch (error) {
                console.error('Erro ao verificar orderNumber:', error);
            }
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            // Fallback usando ObjectId
            this.orderNumber = `3DC${this._id.toString().toUpperCase()}`;
            console.log(`⚠️ Fallback orderNumber: ${this.orderNumber}`);
        }
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);