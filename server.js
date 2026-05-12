// SECTION 1: Dependencies
const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const Registration = require('./models/Registration');
require('dotenv').config();
const connectDb = require('./config/db');

// SECTION 2: Instantiations
const app = express();
const port = 3000;

// SECTION 3: Configurations
connectDb();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// SECTION 4: Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // Essential for handling modern form/data requests

app.use(expressSession({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

passport.use(Registration.createStrategy());
passport.serializeUser(Registration.serializeUser());
passport.deserializeUser(Registration.deserializeUser());

// Global variable for pug templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// SECTION 5: Routes
app.use('/', require('./routes/dashboardRoutes'));
app.use('/', require('./routes/indexRoutes'));
app.use('/', require('./routes/salesRoutes'));
app.use('/', require('./routes/stockRoutes'));
app.use('/', require('./routes/supplierRoutes'));
app.use('/', require('./routes/schemeRoutes'));

// Handling non-existent routes
app.use((req, res) => {
  res.status(404).send('Oops! Route not found.');
});

// SECTION 6: Bootstrapping Server
app.listen(port, () => console.log(`listening on port ${port}`));