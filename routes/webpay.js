import { Router } from 'express';
import pool from '../database.js';

const router = Router();

router.post('/simulate-success', async (req, res) => {
  console.log("💳 Iniciando simulación de pago...", req.body);
  
  const { userId, total, items } = req.body;

  if (!userId || !total || !items) {
    return res.status(400).json({ message: "Faltan datos de la compra" });
  }

  try {
    const itemsJSON = JSON.stringify(items);

    const [result] = await pool.query(
      `INSERT INTO orders (user_id, total, payment_method, status, items, fecha) 
       VALUES (?, ?, 'Webpay Simulado', 'APPROVED', ?, NOW())`,
      [userId, total, itemsJSON]
    );

    console.log("✅ Orden guardada con ID:", result.insertId);

    res.json({ 
      success: true, 
      orderId: result.insertId,
      message: "Compra simulada exitosa" 
    });

  } catch (error) {
    console.error("❌ Error guardando la orden:", error);
    res.status(500).json({ message: "Error al guardar el pedido en la base de datos" });
  }
});

router.post('/create', async (req, res) => {
  console.log("⚠️ Intento de pago real (No configurado)");
  res.status(501).json({ 
    message: "El pago real con Transbank requiere configuración de API Keys en Railway. Usa la opción 'Simulado' por ahora." 
  });
});

export default router;