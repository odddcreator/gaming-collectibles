const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: String,
    password: String,
    provider: { type: String, enum: ['email', 'google'], default: 'email' },
    googleId: String,
    fullName: String,
    phone: String,
    cpf: String,
    birthDate: Date,
    address: {
        zipCode: String,
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String
    },
    profileComplete: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);