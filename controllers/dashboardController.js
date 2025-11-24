import pool from '../database.js';

export const getDashboardStats = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [uCount] = await connection.execute('SELECT COUNT(*) as total FROM users');
    const [pCount] = await connection.execute('SELECT COUNT(*) as total FROM products');
    const [sales] = await connection.execute("SELECT SUM(total) as total FROM orders WHERE status = 'PAID' OR payment_method != 'Webpay'");
    res.json({ 
      users: uCount[0].total, 
      products: pCount[0].total, 
      sales: sales[0].total || 0 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
