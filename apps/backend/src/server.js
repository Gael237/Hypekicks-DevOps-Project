import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import bcrypt from "bcrypt";
//import jwt from "jsonwebtoken";
import { createPool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;
const pool = createPool();

// Health check
app.get("/health", (req, res) => res.send("auth ok"));

//-- ORDENES DE COMPRA --
// Crear orden desde el carrito
app.post("/api/orders", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_required" });
  }

  try {
    // Obtener carrito
    const { rows: cartItems } = await pool.query(
      `SELECT ci.product_id, ci.quantity, p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [user_id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "cart_empty" });
    }

    // Calcular total
    let total = 0;
    for (const item of cartItems) {
      total += item.price * item.quantity;
    }

    // Crear orden
    const { rows: orderRows } = await pool.query(
      `INSERT INTO orders (user_id, total)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, total]
    );

    const order = orderRows[0];

    // Insertar items
    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    // Vaciar carrito
    await pool.query(
      `DELETE FROM cart_items WHERE user_id = $1`,
      [user_id]
    );

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Ver órdenes de un usuario
app.get("/api/orders/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

//Fin de los cambios

app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});
