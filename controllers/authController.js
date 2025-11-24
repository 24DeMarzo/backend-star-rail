import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'este-es-un-secreto-muy-secreto';

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Verificar si el email ya existe
    const [emailExists] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (emailExists.length > 0) {
      return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Verificar si el nombre de usuario ya existe
    const [usernameExists] = await connection.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (usernameExists.length > 0) {
      return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
    }

    // Si no existen, proceder con el registro
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    
    res.status(201).json({ message: '¡Registro exitoso! Ahora puedes iniciar sesión.', userId: result.insertId });

  } catch (error) {
    console.error('Error en el registro:', error); // Log para depuración en el servidor
    res.status(500).json({ message: 'Error interno del servidor. Por favor, inténtalo de nuevo más tarde.' });
  
  } finally {
    if (connection) connection.release();
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Error de credenciales' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Error de credenciales' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login OK', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
