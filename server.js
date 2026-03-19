const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// ================== MongoDB ==================
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fuelradar', { useNewUrlParser: true });

// ================== Models ==================
const Station = mongoose.model('Station', {
  name: String,
  lat: Number,
  lng: Number,
  fuels: Object, // { diesel: %, G95: %, G91: %, E20: % }
});

const Truck = mongoose.model('Truck', {
  license: String,
  lat: Number,
  lng: Number,
  status: String
});

const User = mongoose.model('User', {
  username: String,
  password: String
});

// ================== API ==================

// Seed ปั๊มตัวอย่างจริงในสิงห์บุรี
app.get('/api/seed', async (req, res) => {
  await Station.deleteMany({});
  await Truck.deleteMany({});

  const stations = await Station.insertMany([
    { name: "PTT Station สิงห์บุรี", lat: 14.8940, lng: 100.4246, fuels: { diesel: 80, G95: 70, G91: 60, E20: 50 } },
    { name: "บางจาก อินทร์บุรี", lat: 15.0216, lng: 100.3393, fuels: { diesel: 0, G95: 20, G91: 50, E20: 10 } },
    { name: "Shell สิงห์บุรี", lat: 15.0329, lng: 100.3360, fuels: { diesel: 50, G95: 50, G91: 50, E20: 50 } }
  ]);

  const trucks = await Truck.insertMany([
    { license: "70-1234", lat: 14.85, lng: 100.38, status: "กำลังส่ง" }
  ]);

  res.json({ stations, trucks });
});

// ดึงข้อมูลปั๊ม
app.get('/api/stations', async (req, res) => {
  res.json(await Station.find({}));
});

// ดึงข้อมูลรถ
app.get('/api/trucks', async (req, res) => {
  res.json(await Truck.find({}));
});

// เพิ่ม/แก้ไขปั๊ม (ต้อง login)
app.post('/api/stations', async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Unauthorized");
  try {
    jwt.verify(token, JWT_SECRET);
    const station = await Station.create(req.body);
    io.emit('update');
    res.json(station);
  } catch { return res.status(401).send("Unauthorized"); }
});

// ================== Login ==================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username });
  if (!user) return res.status(400).send("User not found");
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).send("Wrong password");
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Seed admin
app.get('/api/seed-user', async (req, res) => {
  await User.deleteMany({});
  const hashed = bcrypt.hashSync("admin123", 10);
  const user = await User.create({ username: "admin", password: hashed });
  res.json(user);
});

// ================== Realtime ==================
io.on('connection', () => console.log("Client connected"));

server.listen(PORT, () => console.log("FuelRadar running on port " + PORT));