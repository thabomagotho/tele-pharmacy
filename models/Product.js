const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String, // filename or URL to image
});

module.exports = mongoose.model('Product', productSchema);
