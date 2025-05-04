const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    birthDate: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'],
        default: 'Prefiro não informar'
    },
    conditions: {
        type: String,
        trim: true
    },
    allergies: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema); 