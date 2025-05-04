const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    isGuest: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    symptoms: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ['Baixa Gravidade', 'Média Gravidade', 'Alta Gravidade'],
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    conversation: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema); 