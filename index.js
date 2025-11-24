import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import webpayRoutes from './routes/webpay.js';
import dashboardRoutes from './routes/dashboard.js';
import messageRoutes from './routes/messages.js';

async function inicializarBaseDeDatos() {
  let connection;
  try {
    console.log("  [DB] Obteniendo conexión del pool...");
    connection = await pool.getConnection();
    console.log("  [DB] Conexión obtenida. Verificando/creando tablas...");

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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        precio DECIMAL(10, 2) NOT NULL,
        imagen VARCHAR(255) NULL,
        PRIMARY KEY (id)
      )
    `);
    
    console.log("  [DB] Tabla 'users' y 'products' aseguradas.");

    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM products');
    if (rows[0].total === 0) {
      console.log("  [DB] Tabla 'products' vacía. Insertando datos iniciales...");
      await connection.execute(`
        INSERT INTO products (nombre, precio, imagen) VALUES
        ('60 Esquirlas Oníricas', 0.99, 'img/esquirla-60.png'),
        ('300 Esquirlas Oníricas (+30)', 4.99, 'img/esquirla-300.png'),
        ('980 Esquirlas Oníricas (+110)', 14.99, 'img/esquirla-980.png'),
        ('1980 Esquirlas Oníricas (+260)', 29.99, 'img/esquirla-1980.png'),
        ('3280 Esquirlas Oníricas (+600)', 49.99, 'img/esquirla-3280.png'),
        ('6480 Esquirlas Oníricas (+1600)', 99.99, 'img/esquirla-6480.png'),
        ('Boleto de Suministro Expreso', 4.99, 'img/boleto.png'),
        ('Honor Sin Nombre (Gloria)', 9.99, 'img/pase-gloria.png')
      `);
      console.log("  [DB] Datos iniciales de productos insertados.");
    }

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
    console.log("  [DB] Tabla 'orders' y 'messages' aseguradas.");

  } catch (error) {
    console.error("❌ Error durante la inicialización de la base de datos:", error);
    throw error; // Lanzamos el error para que el proceso principal falle
  } finally {
    if (connection) {
      connection.release();
      console.log("  [DB] Conexión a la base de datos liberada.");
    }
  }
}

async function main() {
  try {
    console.log("🚀 [1/4] Iniciando servidor...");
    
    // 1. Inicializar la base de datos primero.
    console.log("🛠️ [2/4] Preparando base de datos...");
    await inicializarBaseDeDatos();
    console.log("✅ [2/4] Base de datos lista.");

    // 2. Crear y configurar la aplicación Express.
    console.log("🌐 [3/4] Configurando la aplicación Express...");
    const app = express();
    const PORT = process.env.PORT || 4000;

    const whitelist = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,https://frontend-star-rail-qgx3.vercel.app').split(',');
    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    };

    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configuración de rutas
    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/webpay', webpayRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/messages', messageRoutes);
    app.get('/', (req, res) => res.send('Backend Star Rail API v1.0 - Healthy'));
    console.log("✅ [3/4] Aplicación Express configurada.");

    // 3. Iniciar el servidor para escuchar peticiones.
    console.log("👂 [4/4] Iniciando servidor para escuchar en el puerto...");
    app.listen(PORT, () => {
      console.log(`✅ [4/4] Servidor corriendo y escuchando en el puerto ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Error fatal durante el arranque del servidor. El proceso terminará.", error);
    process.exit(1); // Salir con código de error
  }
}

main();