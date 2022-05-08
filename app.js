//jshint esversion:6
//  require and config the dotenv for environment variables in
//  your source code to manage the environment variables
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
// Step 1 require mongoose
const mongoose = require('mongoose');
// express session
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
// Google authentication api
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// findOrCreate to use with google strategy
const findOrCreate = require('mongoose-findorcreate');

// mongoose encryption with a key
//const encrypt = require('mongoose-encryption');

// md5 is used to hash the fields to encrypt
// const md5 = require('md5');

// // bcyrpt is used to salt the hashes
// const bcrypt = require('bcrypt');
// const saltRounds = 10; //10 rounds of salting

const app = express();

app.use(express.static('public'));
app.set('view engine', "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));


// in order to session it should be used after all the app
// use functions and before the mongodb connection below;

app.use(session({
  secret: 'ourLittleSecret!!!',
  resave: false,
  saveUninitialized: false
}));

// after session passport should be initialized and session
app.use(passport.initialize());
app.use(passport.session());


//mongodb creation with mongoose step by step
// Step 1: require mongoose as;
//    const mongoose = require('mongoose');
// Step 2: connect to database either local or distance as;
//    mongoose.connect('mongodb://localhost:27017/userDB');
// Step 3: create your schema for crud operations as;
//    const userSchema = ({email: String, name: String});
// Step 4 create a model to call the crud operations over for as;
//    const User = new mongoose.model('User', userSchema);
//    it gets a name to create the collection from it and
//    it also gets a schema to control the crud operations
// Step 5 create a document object from the model
// const newUser = new User({
//   email: req.body.username,
//   password: req.body.password
// });
// Step 6 save this document to db as;
//    newUser.save(function(err){//fill your function});


// Step 2 connection
mongoose.connect('mongodb://localhost:27017/userDB');

// Step 3 schema - if you will use with encryption
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

// that will be used hash and salt to our password
userSchema.plugin(passportLocalMongoose);
// plugin findOrCreate
userSchema.plugin(findOrCreate);

// Step 3.5 adding encryption to schema
// this will encrypt when you call save
// this will decrypt when you call find
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET,
//   encryptedFields: ['password']
// });

// Step 4 model
const User = new mongoose.model('User', userSchema);

// passport use User.createStrategy
passport.use(User.createStrategy());
// serialise and deserialise is used in sessions
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, {
      id: user.id,
      username: user.username,
      name: user.name
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});
// google authentication strategy should be placed after
// serialize and deserialize
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req, res) {
  res.render('home');
  //res.render sends an ejs page in the views folder to the client
});

// this one is used to get google authentication
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});

// this one is used to a step before authentication
app.get('/secrets', function(req, res) {
  User.find({
    'secret': {
      $ne: null
    }
  }, function(err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', {
          usersWithSecrets: foundUsers
        });
      }
    }
  });
});
// submitting the secret posts
app.get('/submit', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});
// posting the secret posts
app.post('/submit', function(req, res) {
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function() {
          res.redirect('/secrets');
        });
      }
    }
  });
});
// logout is ending the session and redirecting you to home
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/register', function(req, res) {
  {
    //bcrypt is used to hash the password acquired from the user
    //through the form. and salted the number of rounds than create
    //the document and save it to DB
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //   // Step 5 create a document object from the model
    //   const newUser = new User({
    //     email: req.body.username,
    //     password: hash //password is stored as the created hash
    //     // md5 method is used to turn the password into a hash
    //   });
    //   // Step 6 save the document to DB
    //   newUser.save(function(err) {
    //     if (err) {
    //       console.log(err);
    //     } else {
    //       res.render('secrets');
    //     }
    //   });
    // });
  }
  //register method comes from passportLocalMongoose package
  //with this package you can skip all creating user and
  //saving them to DB
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }
  });
});

app.post('/login', function(req, res) {
  {
    // const username = req.body.username;
    // const password = req.body.password;
    // User.findOne({
    //   email: username
    // }, function(err, foundUser) {
    //   if (err) {
    //     console.log(err);
    //   } else {
    //     if (foundUser) {
    //       bcrypt.compare(password, foundUser.password, function(err, result) {
    //         if (result === true) {
    //           res.render('secrets');
    //         } else {
    //           res.send('wrong password, try again');
    //         }
    //       });
    //       // no longer use the password comparison when using
    //       //bcrypt compare method
    //       // if (foundUser.password === password) {
    //       //   res.render('secrets');
    //       // } else {
    //       //   res.send('wrong password, try again');
    //       // }
    //     } else {
    //       res.send('no such username, try again');
    //     }
    //   }
    // });
  }
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
