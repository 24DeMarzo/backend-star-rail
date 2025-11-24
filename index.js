import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './database.js';
import bcrypt from 'bcrypt';

// Importamos las rutas
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import webpayRoutes from './routes/webpay.js';
import dashboardRoutes from './routes/dashboard.js';
import messageRoutes from './routes/messages.js';

// --- FUNCIÓN PARA CREAR LAS TABLAS SI NO EXISTEN ---
async function createTables() {
  try {
    const connection = await pool.getConnection();
    console.log("🔨 Creando tablas en la base de datos...");

    // 1. Tabla Usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);

    // 2. Tabla Productos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        precio DECIMAL(10, 2) NOT NULL,
        imagen VARCHAR(255) NULL,
        PRIMARY KEY (id)
      )
    `);

    // 3. Tabla Pedidos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        items TEXT NOT NULL, 
        tb_token VARCHAR(255) NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

     await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        asunto VARCHAR(150) NOT NULL,
        mensaje TEXT NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);

    console.log("✅ Tablas creadas/verificadas correctamente.");
    connection.release();
  } catch (error) {
    console.error("❌ Error creando tablas:", error);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'https://frontend-star-rail-qgx3.vercel.app',
    'https://frontend-star-rail-qgx3-56itxk7tk-arukus-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📥 Petición: ${req.method} ${req.url}`);
  next();
});

app.post('/api/register', async (req, res) => {
  console.log("📝 Intentando registrar usuario:", req.body);
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) return res.status(400).json({ message: "Faltan datos" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')",
      [username, email, hashedPassword]
    );

    console.log("✨ Usuario creado ID:", result.insertId);
    res.status(201).json({ message: "Usuario registrado con éxito", userId: result.insertId });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ message: "Error del servidor", error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, users[0].password);
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    res.json({ message: "Login exitoso", user: users[0] });
  } catch (error) {
    res.status(500).json({ message: "Error en login" });
  }
});

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/webpay', webpayRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => res.send('Backend Online 🟢'));

app.listen(PORT, async () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
  await createTables();
});