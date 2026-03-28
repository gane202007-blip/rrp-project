const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(bodyParser.json());

app.use(session({
    secret: 'rrp-secret',
    resave: false,
    saveUninitialized: true
}));

// ================= MONGODB =================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ================= MODELS =================
const User = mongoose.model('User', {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' }
});

const Collection = mongoose.model('Collection', {
    user_id: mongoose.Schema.Types.ObjectId,
    plastic_type: String,
    weight: Number,
    collection_point: String,
    date: String
});

// ================= ROUTES =================

// 👉 FORCE LOGIN PAGE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 👉 Serve static files AFTER root
app.use(express.static('public'));

// ================= AUTH =================

// Signup
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashed
        });

        res.send("Signup successful");
    } catch {
        res.status(500).send("User already exists");
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send("Wrong password");

    req.session.user = user;

    res.send({ message: "Login success", role: user.role });
});
// Get logged-in user
app.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.json({ loggedIn: false });
    }

    res.json({
        loggedIn: true,
        name: req.session.user.name,
        role: req.session.user.role
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});
// ================= MIDDLEWARE =================

function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send("Login required");
    }
    next();
}

function checkAdmin(req, res, next) {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send("Admin only");
    }
    next();
}

// ================= COLLECTION =================

// Add data
app.post('/add', checkAuth, async (req, res) => {
    const { plastic_type, weight, collection_point, date } = req.body;

    await Collection.create({
        user_id: req.session.user._id,
        plastic_type,
        weight,
        collection_point,
        date
    });

    res.send("Data added successfully");
});

// Get data
app.get('/data', checkAuth, async (req, res) => {
    let data;

    if (req.session.user.role === 'admin') {
        data = await Collection.find();
    } else {
        data = await Collection.find({ user_id: req.session.user._id });
    }

    res.json(data);
});

// Download CSV
app.get('/download', checkAuth, checkAdmin, async (req, res) => {
    const data = await Collection.find();

    let csv = "Type,Weight,Point,Date\n";

    data.forEach(d => {
        csv += `${d.plastic_type},${d.weight},${d.collection_point},${d.date}\n`;
    });

    fs.writeFileSync('report.csv', csv);

    res.download('report.csv');
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
