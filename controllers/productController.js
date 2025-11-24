import pool from '../database.js';

export const getProducts = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const createProduct = async (req, res) => {
  const { nombre, precio, imagen } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute('INSERT INTO products (nombre, precio, imagen) VALUES (?, ?, ?)', [nombre, precio, imagen]);
    res.status(201).json({ message: 'Producto creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const deleteProduct = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const updateProduct = async (req, res) => {
  const { nombre, precio, imagen } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute('UPDATE products SET nombre=?, precio=?, imagen=? WHERE id=?', [nombre, precio, imagen, req.params.id]);
    res.json({ message: 'Actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
