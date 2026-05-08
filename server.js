const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// Serve all static files from root
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'login.html')));
app.get('/login', (req,res) => res.sendFile(path.join(__dirname,'login.html')));
app.get('/adminloginsadhin6145', (req,res) => res.sendFile(path.join(__dirname,'admin-login.html')));
app.get('/setup', (req,res) => res.sendFile(path.join(__dirname,'setup.html')));
app.get('/register', (req,res) => res.sendFile(path.join(__dirname,'register.html')));
app.get('/dashboard', (req,res) => res.sendFile(path.join(__dirname,'dashboard.html')));
app.use((req,res) => res.redirect('/login'));

app.listen(PORT, () => console.log(`✅ Power SMS running on port ${PORT}`));
