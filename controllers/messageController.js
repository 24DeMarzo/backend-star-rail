import pool from '../database.js';

export const createMessage = async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute('INSERT INTO messages (nombre, email, asunto, mensaje) VALUES (?, ?, ?, ?)', [nombre, email, asunto, mensaje]);
    res.json({ message: 'Enviado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getMessages = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM messages ORDER BY fecha DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
