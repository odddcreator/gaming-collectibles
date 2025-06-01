const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    size: { type: String, enum: ['small', 'medium', 'large'] },
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
        sparse: true // ✅ Permite valores null sem conflito
    },
    mercadopago_preference_id: { 
        type: String, 
        sparse: true // ✅ Permite valores null
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
        enum: ['pending_payment', 'pending', 'processing', 'shipped', 'completed', 'cancelled'],
        default: 'pending_payment'
    },
    notes: String
}, {
    timestamps: true
});

// Gerar número do pedido automaticamente
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderNumber = `3DC${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);