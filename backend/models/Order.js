const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        size: String,
        paint: String
    }],
    total: { type: Number, required: true },
    paymentMethod: String,
    status: { 
        type: String, 
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
        default: 'pending' 
    },
    shippingAddress: {
        zipCode: String,
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('order', orderSchema);