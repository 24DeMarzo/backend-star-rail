import Transbank from 'transbank-sdk';
import pool from '../database.js';

const { 
  WebpayPlus, 
  Options, 
  IntegrationApiKeys, 
  Environment, 
  IntegrationCommerceCodes 
} = Transbank;

export const createWebpayOrder = async (req, res) => {
  const { userId, total, items } = req.body;
  let amount = Math.round(parseFloat(total) * 1000); 
  if (amount < 10) amount = 1000; 

  const buyOrder = "O-" + Math.floor(Math.random() * 100000);
  const sessionId = "S-" + userId;
  const returnUrl = (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://backend-star-rail-production.up.railway.app` : 'http://localhost:4000') + '/api/webpay/commit';

  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO orders (user_id, total, payment_method, status, items) VALUES (?, ?, ?, ?, ?)',
      [userId, total, 'Webpay', 'PENDING', JSON.stringify(items)]
    );
    const dbOrderId = result.insertId;

    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
    const response = await tx.create(buyOrder, sessionId, amount, returnUrl);

    await connection.execute('UPDATE orders SET tb_token = ? WHERE id = ?', [response.token, dbOrderId]);
    
    res.json({ url: response.url, token: response.token });
  } catch (error) {
    console.error("ERROR WEBPAY:", error);
    res.status(500).json({ error: 'Error Webpay' });
  } finally {
    if (connection) connection.release();
  }
};

export const commitWebpayOrder = async (req, res) => {
  const token = req.body.token_ws;
  const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  let connection;
  try {
    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
    const response = await tx.commit(token);
    if (response.status === 'AUTHORIZED') {
      connection = await pool.getConnection();
      await connection.execute('UPDATE orders SET status = ? WHERE tb_token = ?', ['PAID', token]);
      res.redirect(`${frontUrl}/perfil?status=success`);
    } else {
      res.redirect(`${frontUrl}/perfil?status=failure`);
    }
  } catch (error) {
    res.redirect(`${frontUrl}/perfil?status=error`);
  } finally {
    if (connection) connection.release();
  }
};

export const simulateSuccess = async (req, res) => {
  const { userId, total, items } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO orders (user_id, total, payment_method, status, items, tb_token) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, total, 'Webpay (Simulado)', 'PAID', JSON.stringify(items), 'SIMULATED_' + Date.now()]
    );
    res.json({ success: true, message: 'Pago simulado correctamente' });
  } catch (error) {
    console.error("Error simulación:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
