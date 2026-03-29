// ================= IMPORTS =================
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;


// ================= MIDDLEWARE =================
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
    secret: 'rrp-secret',
    resave: false,
    saveUninitialized: false
}));


// ================= DATABASE =================
mongoose.connect('mongodb://127.0.0.1:27017/rrp')
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ DB Error:", err));


// ================= MODELS =================

// USER MODEL
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);


// COLLECTION MODEL
const collectionSchema = new mongoose.Schema({
    user_id: mongoose.Schema.Types.ObjectId,
    plastic_type: String,
    weight: Number,
    collection_point: String,
    date: String
});

const Collection = mongoose.model('Collection', collectionSchema);


// ================= AUTH MIDDLEWARE =================

function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send("❌ Please login first");
    }
    next();
}

function checkAdmin(req, res, next) {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send("❌ Admin access only");
    }
    next();
}


// ================= AUTH ROUTES =================

// SIGNUP
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.send({ message: "✅ Signup successful" });

    } catch (err) {
        res.status(500).send({ message: "❌ User already exists" });
    }
});


// LOGIN
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).send({ message: "❌ User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).send({ message: "❌ Wrong password" });
    }

    req.session.user = user;

    res.send({
        message: "✅ Login successful",
        role: user.role
    });
});


// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send({ message: "Logged out" });
    });
});


// ================= COLLECTION ROUTES =================

// ADD DATA
app.post('/add', checkAuth, async (req, res) => {
    try {
        const { plastic_type, weight, collection_point, date } = req.body;

        await Collection.create({
            user_id: req.session.user._id,
            plastic_type,
            weight,
            collection_point,
            date
        });

        res.send({ message: "✅ Data added successfully" });

    } catch (err) {
        res.status(500).send({ message: "❌ Error adding data" });
    }
});


// GET DATA (ROLE BASED)
app.get('/data', checkAuth, async (req, res) => {
    try {
        let data;

        if (req.session.user.role === 'admin') {
            data = await Collection.find();
        } else {
            data = await Collection.find({
                user_id: req.session.user._id
            });
        }

        res.json(data);

    } catch (err) {
        res.status(500).send({ message: "❌ Error fetching data" });
    }
});


// ================= DOWNLOAD REPORT =================

app.get('/download', checkAuth, checkAdmin, async (req, res) => {
    try {
        const data = await Collection.find();

        let csv = "Type,Weight,Point,Date\n";

        data.forEach(d => {
            csv += `${d.plastic_type},${d.weight},${d.collection_point},${d.date}\n`;
        });

        const filePath = path.join(__dirname, 'report.csv');

        fs.writeFileSync(filePath, csv);

        res.download(filePath);

    } catch (err) {
        res.status(500).send({ message: "❌ Error generating report" });
    }
});


// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
