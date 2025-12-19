const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// JWT Secret
const jwtSecret = "51455377159094663701opasufhwiaeuhfwejkcvs9088521955";

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  sessions: [{
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Number,
      required: true
    }
  }]
});

/* INSTANCE METHODS */

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  // return doc except password and sessions
  return _.omit(userObject, ['password', 'sessions']);
};

UserSchema.methods.getUsername = function () {
  const user = this;
  return user.username;
};

UserSchema.methods.generateAccessAuthToken = function () {
  const user = this;

  return new Promise((resolve, reject) => {
    jwt.sign(
      { _id: user._id.toHexString() },
      jwtSecret,
      { expiresIn: "1h" }, 
      (err, token) => {
        if (!err && token) resolve(token);
        else reject(err || new Error("Failed to sign access token"));
      }
    );
  });
};

UserSchema.methods.generateRefreshAuthToken = function () {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (err) return reject(err);
      const token = buf.toString('hex');
      resolve(token);
    });
  });
};

UserSchema.methods.createSession = function () {
  const user = this;

  return user.generateRefreshAuthToken()
    .then((refreshToken) => saveSessionToDatabase(user, refreshToken))
    .then((refreshToken) => refreshToken)
    .catch((e) => Promise.reject('Failed to save session to database.\n' + e));
};

/* MODEL METHODS (static methods) */

UserSchema.statics.getJWTSecret = () => jwtSecret;

UserSchema.statics.findByIdAndToken = function (_id, token) {
  const User = this;
  return User.findOne({
    _id,
    'sessions.token': token
  });
};

UserSchema.statics.findByCredentials = function (username, password) {
  const User = this;

  return User.findOne({ username }).then((user) => {
    if (!user) return Promise.reject();

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) resolve(user);
        else reject();
      });
    });
  });
};

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
  const secondsSinceEpoch = Date.now() / 1000;
  return !(expiresAt > secondsSinceEpoch);
};

/* MIDDLEWARE */

UserSchema.pre('save', function (next) {
  const user = this;
  const costFactor = 10;

  if (user.isModified('password')) {
    bcrypt.genSalt(costFactor, (err, salt) => {
      if (err) return next(err);

      bcrypt.hash(user.password, salt, (err2, hash) => {
        if (err2) return next(err2);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

/* HELPER METHODS */

const saveSessionToDatabase = (user, refreshToken) => {
  return new Promise((resolve, reject) => {
    const expiresAt = generateRefreshTokenExpiryTime();

    user.sessions.push({ token: refreshToken, expiresAt });

    user.save()
      .then(() => resolve(refreshToken))
      .catch((e) => reject(e));
  });
};

const generateRefreshTokenExpiryTime = () => {
  const daysUntilExpire = 10; 
  const secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
  return (Date.now() / 1000) + secondsUntilExpire;
};

const User = mongoose.model('User', UserSchema);
module.exports = { User };
