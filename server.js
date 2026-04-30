// SECTION 1: Dependencies
const express = require('express');
const expressSession = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const Registration = require('./models/Registration');

require('dotenv').config();
const connectDb = require('./config/db')

// SECTION 2: Instantiations
const app = express();
const port = 3000;

// SECTION 3: Configurations
connectDb();
// set the templating engine to pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname,'views'));


// SECTION 4: Middleware
app.use(express.static(path.join(__dirname,'public')));
// To parse URL encoded data
app.use(express.urlencoded({ extended: false }));
app.use(expressSession({
  secret:"secret",
  resave: false,
  saveUninitialized: false
}))

// // Passport
app.use(passport.initialize());
app.use(passport.session());

// // Use email as username field
passport.use(Registration.createStrategy());
passport.serializeUser(Registration.serializeUser());
passport.deserializeUser(Registration.deserializeUser());

// global variable to make the logged in user available to all pug templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
})

// SECTION 5: Routes
 app.use('/', require('./routes/indexRoutes'))
 app.use('/', require('./routes/salesRoutes'))
 app.use('/', require('./routes/stockRoutes'))
//  app.use('/', require('./routes/stockRoutes'))
// app.use('/', require('./routes/indexRoutes'))
// app.use('/login', require('./routes/loginRoutes'))






// Second last chunk of code in this file ever
// Handling non-existent routes
app.use((req, res) => {
  res.status(404).send('Oops! Route not found.');
});

// SECTION 6: Bootstrapping Server
// Last line of code in this file ever because it's responsible for running the server.
app.listen(port, () => console.log(`listening on port ${port}`));