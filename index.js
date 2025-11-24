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
    connection = await pool.getConnection();

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

    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM products');
    if (rows[0].total === 0) {
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

  } catch (error) {
    console.error(error);
  } finally {
    if (connection) connection.release();
  }
}

async function main() {
  await inicializarBaseDeDatos();

  const app = express();
  const PORT = process.env.PORT || 4000;

  app.use(cors({
    origin: '*', 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/webpay', webpayRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/messages', messageRoutes);

  app.get('/', (req, res) => res.send('Backend Star Rail API v1.0'));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main();