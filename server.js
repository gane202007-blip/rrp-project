const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// ===== IMPORTANT FOR RENDER =====
app.set('trust proxy', 1);

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// ===== SESSION (FIXED FOR PRODUCTION) =====
app.use(session({
    secret: 'rrp-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI
    }),
    cookie: {
        secure: false,
        httpOnly: true
    }
}));

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ===== MODELS =====
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' }
});

const collectionSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    plastic_type: String,
    weight: Number,
    collection_point: String,
    date: String
});

const User = mongoose.model('User', userSchema);
const Collection = mongoose.model('Collection', collectionSchema);

// ===== AUTH MIDDLEWARE =====
function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send("Not logged in");
    }
    next();
}

function checkAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Admin only");
    }
    next();
}

// ===== ROUTES =====

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

        res.send({ message: "Signup success" });
    } catch (err) {
        res.status(500).send({ message: "User already exists" });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(400).send({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).send({ message: "Wrong password" });

    req.session.user = {
        _id: user._id,
        role: user.role
    };

    res.send({ message: "Login success", role: user.role });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send({ message: "Logged out" });
    });
});

// Add Collection
app.post('/add', checkAuth, async (req, res) => {
    const { plastic_type, weight, collection_point, date } = req.body;

    await Collection.create({
        user_id: req.session.user._id,
        plastic_type,
        weight,
        collection_point,
        date
    });

    res.send({ message: "Data added" });
});

// Get Data
app.get('/data', checkAuth, async (req, res) => {
    let data;

    if (req.session.user.role === 'admin') {
        data = await Collection.find();
    } else {
        data = await Collection.find({ user_id: req.session.user._id });
    }

    res.json(data);
});

// Download CSV (Admin Only)
app.get('/download', checkAuth, checkAdmin, async (req, res) => {
    const data = await Collection.find();

    let csv = "Type,Weight,Point,Date\n";

    data.forEach(d => {
        csv += `${d.plastic_type},${d.weight},${d.collection_point},${d.date}\n`;
    });

    fs.writeFileSync('/tmp/report.csv', csv);

    res.download('/tmp/report.csv');
});

// Test session (debug)
app.get('/test-session', (req, res) => {
    res.send(req.session);
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
