// models/User.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    label: String,
    zipCode: String,
    state: String,
    city: String,
    neighborhood: String,
    street: String,
    number: String,
    complement: String,
    isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
    googleId: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    name: String,
    fullName: String,
    picture: String,
    phone: String,
    birthDate: Date,
    gender: String,
    cpf: String,
    addresses: [addressSchema],
    address: addressSchema, // Endereço principal para compatibilidade
    newsletter: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    orderCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);