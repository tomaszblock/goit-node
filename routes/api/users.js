const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const User = require("../../models/userModel");
const Joi = require("joi");
const multer = require("multer");
const jimp = require("jimp");
const path = require("path");
const fs = require("fs").promises;
const router = express.Router();
const auth = require("../../middlewares/auth");

// Schematy walidacji
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Konfiguracja Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../tmp"));
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Rejestracja
router.post("/signup", async (req, res) => {
  const { error } = signupSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email in use" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email, { s: "250", r: "pg", d: "monsterid" });
  const newUser = await User.create({
    email,
    password: hashedPassword,
    avatarURL,
  });

  res.status(201).json({
    user: {
      email: newUser.email,
      subscription: newUser.subscription,
      avatarURL: newUser.avatarURL,
    },
  });
});

// Logowanie
router.post("/login", async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Email or password is wrong" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  await User.findByIdAndUpdate(user._id, { token });

  res.status(200).json({
    token,
    user: {
      email: user.email,
      subscription: user.subscription,
      avatarURL: user.avatarURL,
    },
  });
});

// Obecny użytkownik
router.get("/current", auth, (req, res) => {
  res.status(200).json({
    email: req.user.email,
    subscription: req.user.subscription,
    avatarURL: req.user.avatarURL,
  });
});

// Wylogowanie
router.get("/logout", auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { token: null });
  res.status(200).json({ message: "Successfully logged out" });
});

// Aktualizacja awatara
router.patch("/avatars", auth, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Missing file" });
  }

  try {
    const { path: tempPath, filename } = req.file;
    const avatar = await jimp.read(tempPath);
    await avatar.resize(250, 250).writeAsync(tempPath);

    const newAvatarPath = path.join(
      __dirname,
      "../../public/avatars",
      filename
    );
    await fs.rename(tempPath, newAvatarPath);

    const avatarURL = `/public/avatars/${filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatarURL });

    res.status(200).json({ avatarURL });
  } catch (error) {
    await fs.unlink(req.file.path);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
