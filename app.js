//jshint esversion:6
//  require and config the dotenv for environment variables in
//  your source code to manage the environment variables
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
// Step 1 require mongoose
const mongoose = require('mongoose');

const encrypt = require('mongoose-encryption');

const app = express();

app.use(express.static('public'));
app.set('view engine', "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

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
  password: String
});

// Step 3.5 adding encryption to schema
// this will encrypt when you call save
// this will decrypt when you call find
userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ['password']
});

// Step 4 model
const User = new mongoose.model('User', userSchema);

app.get('/', function(req, res) {
  res.render('home');
  //res.render sends an ejs page in the views folder to the client
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});


app.post('/register', function(req, res) {
  // Step 5 create a document object from the model
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  // Step 6 save the document to DB
  newUser.save(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.render('secrets');
    }
  });
});

console.log('test');

app.post('/login', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({
    email: username
  }, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password) {
          res.render('secrets');
        } else {
          res.send('wrong password, try again');
        }
      } else {
        res.send('no such username, try again');
      }
    }
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
