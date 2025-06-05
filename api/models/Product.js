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
    sku: String,
    hasPaintingOption: { type: Boolean, default: true },
    availableSizes: {
        type: [String],
        default: function() {
            return this.category === 'stencil' 
                ? ['30cm', '60cm', '90cm', '120cm', '180cm']
                : ['small', 'medium', 'large'];
        }
    },
    sizeMultipliers: {
        type: Map,
        of: Number,
        default: function() {
            if (this.category === 'stencil') {
                return new Map([
                    ['30cm', 1],
                    ['60cm', 2],
                    ['90cm', 3],
                    ['120cm', 4],
                    ['180cm', 5]
                ]);
            } else {
                return new Map([
                    ['small', 1],
                    ['medium', 1.25],
                    ['large', 1.5]
                ]);
            }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);