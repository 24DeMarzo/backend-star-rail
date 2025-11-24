import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './database.js';
import bcrypt from 'bcrypt'; // Asegúrate de tener instalado bcrypt (npm install bcrypt)

// IMPORTANTE: Dejamos las otras rutas importadas por si acaso,
// pero el REGISTRO lo haremos aquí directo para asegurar que funcione.
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import webpayRoutes from './routes/webpay.js';
import dashboardRoutes from './routes/dashboard.js';
import messageRoutes from './routes/messages.js';

async function main() {
  // 1. Configuración Express
  const app = express();
  const PORT = process.env.PORT || 4000;

  // 2. CORS (Permisivo para evitar bloqueos)
  app.use(cors({ origin: '*', methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
  app.use(express.json());

  // 3. LOG DE DEPURACIÓN (Para ver en Railway qué está llegando)
  app.use((req, res, next) => {
    console.log(`🔍 Petición entrando: [${req.method}] ${req.url}`);
    next();
  });

  // ==================================================================
  // 🚨 ZONA SEGURA: LÓGICA DE REGISTRO DIRECTA (Sin archivos externos)
  // ==================================================================
  
  app.post('/api/register', async (req, res) => {
    console.log("⚡ Intentando registrar usuario:", req.body);
    const { username, email, password } = req.body;

    try {
      // Validar datos
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Faltan datos" });
      }

      // Verificar si existe
      const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (existing.length > 0) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      // Encriptar password (si falla bcrypt usa texto plano temporalmente para probar)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insertar
      const [result] = await pool.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')",
        [username, email, hashedPassword]
      );

      console.log("✅ Usuario registrado con ID:", result.insertId);
      res.status(201).json({ message: "Usuario registrado con éxito", userId: result.insertId });

    } catch (error) {
      console.error("❌ Error en registro directo:", error);
      res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    console.log("⚡ Intentando login:", req.body);
    const { email, password } = req.body;
    try {
      const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (users.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

      const user = users[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

      res.json({ 
        message: "Login exitoso", 
        user: { id: user.id, username: user.username, email: user.email, role: user.role } 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error en login" });
    }
  });

  // ==================================================================

  // 4. Resto de rutas (Las cargamos después)
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/webpay', webpayRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/messages', messageRoutes);

  // 5. Root Check
  app.get('/', (req, res) => res.send('Backend Online - Ruta Directa Activa 🟢'));

  // 6. Arrancar
  app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
    console.log(`🛣️ Ruta garantizada: POST /api/register`);
  });
}

main();