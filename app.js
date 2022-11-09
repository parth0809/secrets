//modules needed
require("dotenv").config()
const express=require("express")
const bodyParser=require('body-parser')
const ejs=require("ejs")
const mongoose=require("mongoose")
const GoogleStrategy=require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate')
const passport=require("passport")
const session=require('express-session');
// const passportLocal=require('passport-local');
const passportLocalMongoose=require('passport-local-mongoose')
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);



const app=express();
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));



app.use(session({
    secret: 'Our Little Secret',
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true }
  }));
app.use(passport.initialize());
app.use(passport.session());





//Schema for user database
mongoose.connect("mongodb://localhost:27017/userDb",{useNewUrlParser: true});
const userschema=new mongoose.Schema({
  username:String,
  password:String,
  googleId:String,
  role:String,
  secret:[{
    type:String
  }]
});


userschema.plugin(passportLocalMongoose);
userschema.plugin(findOrCreate);

const User=new mongoose.model("User",userschema);

passport.use(User.createStrategy());



passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
      done(null, user);
  });
 
  app.get("/secrets", function(req, res){
    User.findById(req.user._id, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers.secret});
        }
      }
    });
  });
  app.get("/upgrade", function(req, res){
    User.findById(req.user._id, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("upgrade", {userrole: foundUsers.role});
        }
      }
    });
  });
 app.post("/upgrade",function(req,res){
  const userId=req.body.ID;
  const newrole=req.body.Roles;
    console.log(userId);
    console.log(newrole);
    User.findOne({_id:userId},(err,finduser)=>{
      
      if(!err)
      {
        

              finduser.role=newrole;
              finduser.save(function(err){
                  if(err)
                  {
                      res.send(err);
                      
                  }
                 
              });
              res.redirect("/upgrade");
      }
      else
      {
          console.log("Invalid ")
      }
  });
 });



 app.get("/deleteUser", function(req, res){
  User.findById(req.user._id, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("delete", {userrole: foundUsers.role});
      }
    }
  });
});
app.post("/deleteUser",function(req,res){
const userId=req.body.ID;
  console.log(userId);
  User.deleteOne({_id:userId},(err)=>{
    
    if(!err)
    {
            res.redirect("/deleteUser");
    }
    else
    {
        console.log("Invalid ")
    }
});
});


app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else
  {
    res.render("/login");
  }
});
app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
    // console.log(req.user.id);
  
    console.log(req.user._id);
    User.findById(req.user._id, function(err, foundUser){
      console.log(foundUser);
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          
          foundUser.secret.push(submittedSecret);
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
  });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    
    User.findOrCreate({ googleId: profile.id ,role:"user"}, function (err, user) {
      return cb(err, user); 
    });
  }
));



app.get("/",function(req,res){
    res.render("home.ejs");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get('/login',function(err,res){
    res.render("login.ejs");
});

app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
    req.login(user, function(err){
      if (err){
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
    });



app.get('/register',function(req,res){
    res.render('register.ejs');
});



app.post("/register",function(req,res){
User.register({username:req.body.email,role:"user"},req.body.password,function(err,user){
  if(err)
  {
    console.log(err);
    res.redirect("/register");
  }
  else{
    // passport.authenticate("local")(req,res,function(){
    //   res.redirect("/secrets");
    // })
    res.redirect("/");
  }
});
});


app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }
  else{
    res.redirect("/login");
    
  }
});
app.post("/submit",function(req,res){
  const subbmittedsecret=req.body.secret;
  console.log(subbmittedsecret);
  User.findById(req.User.id,function(err,foundUser){
    if(err)
    {
      console.log(err);
    }
    else
    {
      if(foundUser){
        console.log("Yes")
        foundUser.secret=subbmittedsecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  })

});

app.get("/secrets",function(req,res){
 User.find({"secret": {$ne:null}},function(err,foundUser){
  if(err)
  console.log(err);
  else
  {
    if(foundUser)
    {
      res.render("secrets",{usersWithSecrets:foundUser})
    }
  }
 })
});
app.route("/userData")
.get(function(req,res){
  User.findOne({__id:req.params.id},function(err,foundsecret){
    if(foundsecret){
        res.send(foundsecret);
    }else
    {
        res.send("No Matching articles found");
    }
});
});
app.listen(3000,function(){
    console.log("SERVER STARTED AT PORT 3000!!!")
});