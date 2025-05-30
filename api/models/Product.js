// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    category: { 
        type: String, 
        required: true,
        enum: ['action-figure', 'stencil']
    },
    game: String,
    basePrice: { type: Number, required: true },
    weight: { type: Number, required: true },
    images: [String],
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    tags: [String],
    sku: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);