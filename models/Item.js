const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  category: { type: String, index: true },
  qty: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  description: { type: String },
  tags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

// Create a text index for simple text search
ItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Item', ItemSchema);
