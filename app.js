// app.js (with inline comments)
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

// Stripe payment gateway setup (replace if using Flutterwave or DPO later)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Sessions, password hashing, file uploads
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { OpenAI } = require('openai');

// MongoDB Models
const Order = require('./models/Order');
const User = require('./models/User');

// Fix for dynamic fetch usage in OpenRouter integration
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// Set view engine for rendering EJS templates
app.set('view engine', 'ejs');

// Middleware for parsing request bodies and serving static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'telepharmacySecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 86400000 } // 1 day session
}));

// MongoDB connection setup
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB error:', err));

// Multer config for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Render homepage
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Public pages
app.get('/store', (req, res) => res.render('store', { user: req.session.user }));
app.get('/store2', (req, res) => res.render('store2', { user: req.session.user }));
app.get('/upload', (req, res) => res.render('upload', { user: req.session.user }));
app.get('/services', (req, res) => res.render('services', { user: req.session.user }));
app.get('/login', (req, res) => res.render('login', { user: req.session.user }));
app.get('/register', (req, res) => res.render('register', { user: req.session.user }));

// Protected checkout route
app.get('/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('checkout', { user: req.session.user });
});

// Order history for logged-in users
app.get('/order-history', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const orders = await Order.find({ userId: req.session.user.id }).sort({ createdAt: -1 });
  res.render('order-history', { user: req.session.user, orders });
});

// Checkout order route - saves order to DB
app.post('/checkout', async (req, res) => {
  try {
    const cart = JSON.parse(req.body.cartData);
    const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const order = new Order({ userId: req.session.user.id, items: cart, totalPrice });
    await order.save();

    res.send(`<script>alert("✅ Order placed successfully!"); window.location.href = "/";</script>`);
  } catch (error) {
    console.error("Checkout Error:", error.message);
    res.status(500).send("Something went wrong.");
  }
});

// Direct single item order (from store page)
app.post('/order', async (req, res) => {
  try {
    const { productName, price } = req.body;
    if (!req.session.user) return res.send(`<script>alert("Login required"); window.location.href = '/login';</script>`);

    const order = new Order({
      userId: req.session.user.id,
      items: [{ name: productName, price: parseFloat(price), quantity: 0 }],
      totalPrice: parseFloat(price)
    });
    await order.save();
    res.send(`<script>alert("✅ Order placed for ${productName}!"); window.location.href = '/store';</script>`);
  } catch (err) {
    console.error("Order Error:", err.message);
    res.status(500).send("❌ Something went wrong.");
  }
});

// View and update user profile
app.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const user = await User.findById(req.session.user.id);
  res.render('profile', { user });
});

// Handle profile form submission and photo upload
app.post('/profile', upload.single('profilePicture'), async (req, res) => {
  try {
    const { first_name, last_name, cellphone, address, medical_history } = req.body;
    const profilePicture = req.file ? '/uploads/' + req.file.filename : req.session.user.profilePicture;

    const updatedUser = await User.findByIdAndUpdate(req.session.user.id, {
      first_name, last_name, cellphone, address, medical_history, profilePicture
    }, { new: true });

    req.session.user.first_name = updatedUser.first_name;
    req.session.user.profilePicture = updatedUser.profilePicture;

    res.redirect('/profile');
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send("Something went wrong.");
  }
});

// Registration route with hashing and user creation
app.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send(`<script>alert("User already exists."); window.location.href = '/login';</script>`);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ first_name, last_name, email, password: hashedPassword });
    await user.save();

    res.send(`<script>alert("✅ Registration successful!"); window.location.href = '/login';</script>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

// Login route - creates session
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.send(`<script>alert("User not found"); window.location.href = '/register';</script>`);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send(`<script>alert("Incorrect password"); window.location.href = '/login';</script>`);

    req.session.user = {
      id: user._id,
      first_name: user.first_name,
      email: user.email,
      profilePicture: user.profilePicture || ''
    };

    res.send(`<script>alert("Welcome, ${user.first_name}!"); window.location.href = '/';</script>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
});

// Logout clears session
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Chatbot API route - uses OpenRouter instead of OpenAI directly
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: 'system', content: 'You are a helpful pharmacist.' },
          { role: 'user', content: userMessage }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "⚠️ No reply from OpenRouter.";
    res.json({ reply });
  } catch (err) {
    console.error("OpenRouter error:", err.message);
    res.status(500).json({ reply: '⚠️ Error connecting to OpenRouter.' });
  }
});

// Cart-related logic (view, add, clear)
app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('cart', { cart, total, user: req.session.user });
});

app.post('/cart/add', (req, res) => {
  const { productName, price, quantity } = req.body;
  req.session.cart = req.session.cart || [];

  const existing = req.session.cart.find(item => item.name === productName);
  if (existing) {
    existing.quantity += parseInt(quantity);
  } else {
    req.session.cart.push({ name: productName, price: parseFloat(price), quantity: parseInt(quantity) });
  }

  res.redirect('/cart');
});

app.get('/cart/clear', (req, res) => {
  req.session.cart = [];
  res.redirect('/cart');
});

// Stripe Checkout route
app.post('/create-checkout-session', async (req, res) => {
  const cart = req.session.cart || [];

  if (!cart.length) {
    return res.send(`<script>alert("🛒 Your cart is empty!"); window.location.href = "/cart";</script>`);
  }

  try {
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.quantity
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/cart`
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send("⚠️ Error creating Stripe session.");
  }
});

// Success page route
app.get('/success', (req, res) => {
  req.session.cart = []; // clear cart on success
  res.send(`<script>alert("✅ Payment successful! Thank you for your order."); window.location.href = "/";</script>`);
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
