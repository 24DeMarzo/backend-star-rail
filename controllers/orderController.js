import pool from '../database.js';

export const createOrder = async (req, res) => {
  const { userId, total, items, paymentMethod } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO orders (user_id, total, payment_method, items, status) VALUES (?, ?, ?, ?, ?)',
      [userId, total, paymentMethod, JSON.stringify(items), 'PAID']
    );
    res.json({ message: 'Orden creada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getOrdersByUser = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY fecha DESC', [req.params.userId]);
    const orders = rows.map(o => ({ ...o, items: JSON.parse(o.items) }));
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
