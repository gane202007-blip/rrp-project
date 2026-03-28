CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user' -- 'user' or 'admin'
);

CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plastic_type TEXT,
    weight REAL,
    collection_point TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);