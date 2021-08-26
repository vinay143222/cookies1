require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(session({
    secret: 'ourlittlesecret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGODB_CONNECTION, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);
const CookieSchema = new mongoose.Schema({
    name: String,
    password: String,
    googleId: String,
    thougth: String
});
CookieSchema.plugin(passportLocalMongoose);
CookieSchema.plugin(findOrCreate);
const Cookies = mongoose.model('cookie', CookieSchema);
passport.use(Cookies.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    Cookies.findById(id, function(err, user) {
        done(err, user);
    });
});

// passport.serializeUser(Cookies.serializeUser());
// passport.deserializeUser(Cookies.deserializeUser());
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/cookies",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {

        Cookies.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }

));

app.get("/", (req, res) => {
    res.render('home');
})
app.get("/auth/google", passport.authenticate('google', { scope: ['profile'] }));
app.get("/auth/google/cookies", passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect("/welcome");
})
app.get("/register", (req, res) => {

    res.render('register');
})
app.get("/login", (req, res) => {
    res.render('login');
})
app.get("/thougth", (req, res) => {
    if (req.isAuthenticated()) {
        res.render('thougth');
    } else {
        console.log("please login");
        res.redirect('/login');
    }
})
app.get("/welcome", (req, res) => {
    Cookies.find({ 'thougth': { $ne: null } }, (err, foundedresutls) => {
        if (err) {
            console.log(err);
            res.redirect("/");
        } else {

            res.render('welcome', { thougths: foundedresutls });
        }
    })
})
app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/");
})
app.post("/register", (req, res) => {
    Cookies.register({ username: req.body.username }, req.body.password, (err) => {
        if (err) {
            console.log(err)
            res.redirect("/");
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect("/welcome");
            })
        }
    })
})
app.post("/login", (req, res) => {
    const newCookie = new Cookies({
        name: req.body.username,
        password: req.body.password,
    });
    req.logIn(newCookie, (err) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate('local')(req, res, () => {
                res.redirect("/welcome");
            })
        }
    })
})
app.post("/thougth", (req, res) => {
    const newthougth = req.body.newthought;
    Cookies.findById(req.user.id, (err, foundedresutls) => {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            if (foundedresutls) {
                foundedresutls.thougth = newthougth;
                foundedresutls.save((err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect("/welcome");
                    }
                })
            }
        }

    })
})

app.listen(process.env.PORT, 3000, () => {
    console.log('server started');
})