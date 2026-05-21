const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const Registration = require('./models/Registration');
require('dotenv').config();
const connectDb = require('./config/db');

const app = express();
const port = 3000;

connectDb();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(expressSession({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 60 * 60 * 1000,
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(Registration.createStrategy());
passport.serializeUser(Registration.serializeUser());
passport.deserializeUser(Registration.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

app.use('/', require('./routes/indexRoutes'));
app.use('/', require('./routes/dashboardRoutes'));
app.use('/', require('./routes/salesRoutes'));
app.use('/', require('./routes/stockRoutes'));
app.use('/', require('./routes/supplierRoutes'));
app.use('/', require('./routes/schemeRoutes'));
app.use('/', require('./routes/reportsRoutes'));

app.use((req, res) => {
    res.status(404).send('Oops! Route not found.');
});

app.listen(port, () => console.log(`listening on port ${port}`));