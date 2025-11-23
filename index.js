import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config'; // Para leer las variables de Railway
import Transbank from 'transbank-sdk';

const { 
  WebpayPlus, 
  Options, 
  IntegrationApiKeys, 
  Environment, 
  IntegrationCommerceCodes 
} = Transbank;

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'este-es-un-secreto-muy-secreto';

// Configuración Inteligente: Si hay variables de entorno (Nube), las usa. Si no, usa local.
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'star_rail_db',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// --- FUNCIÓN DE "AUTO-CONSTRUCCIÓN" (LA JUGADA MAESTRA) ---
async function inicializarBaseDeDatos() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("🛠️ Verificando estado de la Base de Datos...");

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

    // 3. Insertar productos SOLO si la tabla está vacía
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM products');
    if (rows[0].total === 0) {
      console.log("📦 Tabla productos vacía. Insertando datos iniciales...");
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

    // 4. Tabla Pedidos
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

    // 5. Tabla Mensajes
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

    console.log("✅ Base de Datos lista y actualizada.");
    await connection.end();
  } catch (error) {
    console.error("❌ Error inicializando DB:", error.message);
  }
}
// -----------------------------------------------------------

// ENDPOINTS

app.get('/', (req, res) => res.send('Backend Star Rail API v1.0'));

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    await connection.end();
    res.status(201).json({ message: 'Registrado', userId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    await connection.end();
    if (rows.length === 0) return res.status(401).json({ message: 'Error de credenciales' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Error de credenciales' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login OK', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM products');
  await connection.end();
  res.json(rows);
});

app.post('/api/products', async (req, res) => {
  const { nombre, precio, imagen } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('INSERT INTO products (nombre, precio, imagen) VALUES (?, ?, ?)', [nombre, precio, imagen]);
  await connection.end();
  res.status(201).json({ message: 'Producto creado' });
});

app.delete('/api/products/:id', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
  await connection.end();
  res.json({ message: 'Eliminado' });
});

app.put('/api/products/:id', async (req, res) => {
  const { nombre, precio, imagen } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('UPDATE products SET nombre=?, precio=?, imagen=? WHERE id=?', [nombre, precio, imagen, req.params.id]);
  await connection.end();
  res.json({ message: 'Actualizado' });
});

app.get('/api/users', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT id, username, email, role, created_at FROM users');
  await connection.end();
  res.json(rows);
});

app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [uCount] = await connection.execute('SELECT COUNT(*) as total FROM users');
    const [pCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const [sales] = await connection.execute("SELECT SUM(total) as total FROM orders WHERE status = 'PAID' OR payment_method != 'Webpay'");
    await connection.end();
    res.json({ 
      users: uCount[0].total, 
      products: pCount[0].total, 
      sales: sales[0].total || 0 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { userId, total, items, paymentMethod } = req.body;
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute(
    'INSERT INTO orders (user_id, total, payment_method, items, status) VALUES (?, ?, ?, ?, ?)',
    [userId, total, paymentMethod, JSON.stringify(items), 'PAID']
  );
  await connection.end();
  res.json({ message: 'Orden creada' });
});

app.get('/api/orders/user/:userId', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY fecha DESC', [req.params.userId]);
  await connection.end();
  const orders = rows.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(orders);
});

app.post('/api/webpay/create', async (req, res) => {
  const { userId, total, items } = req.body;
  let amount = Math.round(parseFloat(total) * 1000); 
  if (amount < 10) amount = 1000; 

  const buyOrder = "O-" + Math.floor(Math.random() * 100000);
  const sessionId = "S-" + userId;
  // IMPORTANTE: Cuando subas a producción, cambia esta URL
  const returnUrl = (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:4000') + '/api/webpay/commit';

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'INSERT INTO orders (user_id, total, payment_method, status, items) VALUES (?, ?, ?, ?, ?)',
      [userId, total, 'Webpay', 'PENDING', JSON.stringify(items)]
    );
    const dbOrderId = result.insertId;

    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    await connection.execute('UPDATE orders SET tb_token = ? WHERE id = ?', [response.token, dbOrderId]);
    await connection.end();

    res.json({ url: response.url, token: response.token });
  } catch (error) {
    console.error("ERROR WEBPAY:", error);
    res.status(500).json({ error: 'Error Webpay' });
  }
});

app.post('/api/webpay/commit', async (req, res) => {
  const token = req.body.token_ws;
  // URL del frontend (Si está en Railway, pondremos la nueva luego)
  const frontUrl = 'http://localhost:5173'; // OJO AQUÍ PARA DESPUÉS

  try {
    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
    const response = await tx.commit(token);
    if (response.status === 'AUTHORIZED') {
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute('UPDATE orders SET status = ? WHERE tb_token = ?', ['PAID', token]);
      await connection.end();
      res.redirect(`${frontUrl}/perfil?status=success`);
    } else {
      res.redirect(`${frontUrl}/perfil?status=failure`);
    }
  } catch (error) {
    res.redirect(`${frontUrl}/perfil?status=error`);
  }
});

app.post('/api/webpay/simulate-success', async (req, res) => {
  const { userId, total, items } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO orders (user_id, total, payment_method, status, items, tb_token) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, total, 'Webpay (Simulado)', 'PAID', JSON.stringify(items), 'SIMULATED_' + Date.now()]
    );
    await connection.end();
    res.json({ success: true, message: 'Pago simulado correctamente' });
  } catch (error) {
    console.error("Error simulación:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('INSERT INTO messages (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)', [nombre, email, asunto, mensaje]);
    await connection.end();
    res.json({ message: 'Enviado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute('SELECT * FROM messages ORDER BY fecha DESC');
  await connection.end();
  res.json(rows);
});

// Iniciamos DB antes de escuchar
inicializarBaseDeDatos().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
});