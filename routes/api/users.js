const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/user");
const auth = require("../../middlewares/auth");
const Joi = require("joi");

// Schematy walidacyjne
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Rejestracja użytkownika
router.post("/signup", async (req, res, next) => {
  try {
    const { error } = userSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: `Validation error: ${error.details[0].message}`,
      });
    }
    const { email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Email in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logowanie użytkownika
router.post("/login", async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: `Validation error: ${error.details[0].message}`,
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email or password is wrong" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    user.token = token;
    await user.save();

    res.status(200).json({
      token,
      user: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Wylogowanie użytkownika
router.get("/logout", auth, async (req, res, next) => {
  try {
    const user = req.user;
    user.token = null;
    await user.save();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Obecny użytkownik
router.get("/current", auth, async (req, res) => {
  const { email, subscription } = req.user;
  res.status(200).json({
    email,
    subscription,
  });
});

module.exports = router;
