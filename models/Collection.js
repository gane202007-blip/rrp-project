const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    plastic_type: String,
    weight: Number,
    collection_point: String,
    date: String
});

module.exports = mongoose.model('Collection', collectionSchema);