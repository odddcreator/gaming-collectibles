const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['action-figure', 'stencil'], required: true },
    basePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    images: [String],
    sizes: [{ type: String, enum: ['small', 'medium', 'large'] }],
    paintOptions: [{ type: String, enum: ['with', 'without'] }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('product', productSchema);