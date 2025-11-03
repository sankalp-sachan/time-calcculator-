require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
const MONGO = process.env.MONGO_URI || "";
mongoose
  .connect(MONGO)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err.message));

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

const EntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  personName: { type: String, required: true },
  hours: { type: Number, default: 0 },
  minutes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Entry = mongoose.model("Entry", EntrySchema);

// ✅ NEW: SavedPerson schema
const SavedPersonSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  personName: { type: String, required: true },
  entries: [
    {
      hours: Number,
      minutes: Number,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  totalMinutes: { type: Number, default: 0 },
  savedAt: { type: Date, default: Date.now },
});
const SavedPerson = mongoose.model("SavedPerson", SavedPersonSchema);

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Auth middleware
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ error: "Missing authorization header" });
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Malformed authorization header" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Routes
// ===== Signup =====
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already used" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== Login =====
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Missing fields" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== Entries =====
app.post("/api/entries", authMiddleware, async (req, res) => {
  const { personName, hours = 0, minutes = 0 } = req.body;
  if (!personName)
    return res.status(400).json({ error: "personName required" });
  if (minutes < 0 || minutes > 59)
    return res.status(400).json({ error: "Minutes must be 0-59" });
  try {
    const entry = await Entry.create({
      userId: req.user.id,
      personName,
      hours,
      minutes,
    });
    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/entries", authMiddleware, async (req, res) => {
  const personName = req.query.personName;
  try {
    const filter = { userId: req.user.id };
    if (personName) filter.personName = personName;
    const entries = await Entry.find(filter).sort({ createdAt: 1 });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/entries", authMiddleware, async (req, res) => {
  const personName = req.query.personName;
  try {
    const filter = { userId: req.user.id };
    if (personName) filter.personName = personName;
    const result = await Entry.deleteMany(filter);
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ ===== Save Person (NEW) =====
app.post("/api/save-person", authMiddleware, async (req, res) => {
  const { personName, entries } = req.body;
  if (!personName || !entries || !Array.isArray(entries))
    return res.status(400).json({ error: "Invalid payload" });

  try {
    const totalMinutes = entries.reduce(
      (acc, e) => acc + (e.hours * 60 + e.minutes),
      0
    );
    const saved = await SavedPerson.findOneAndUpdate(
      { userId: req.user.id, personName },
      { entries, totalMinutes, savedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: "Saved successfully", saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ ===== Get Saved Persons =====
app.get("/api/saved-persons", authMiddleware, async (req, res) => {
  try {
    const persons = await SavedPerson.find({ userId: req.user.id }).sort({
      savedAt: -1,
    });
    res.json(persons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== Frontend =====
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
