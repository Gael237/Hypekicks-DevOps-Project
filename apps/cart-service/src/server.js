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

const port = process.env.PORT || 3003;
const pool = createPool();

// Health check
app.get("/health", (req, res) => res.send("auth ok"));

//--CARRITO--
// Ver carrito de un usuario
app.get("/api/cart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT 
        ci.id,
        ci.quantity,
        p.id AS product_id,
        p.name,
        p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Agregar producto al carrito
app.post("/api/cart", async (req, res) => {
  const { user_id, product_id, quantity } = req.body;

  if (!user_id || !product_id) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, product_id, quantity || 1]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Actualizar cantidad
app.put("/api/cart/:id", async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity) {
    return res.status(400).json({ error: "quantity_required" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE cart_items
       SET quantity = $1
       WHERE id = $2
       RETURNING *`,
      [quantity, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "cart_item_not_found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Eliminar producto del carrito
app.delete("/api/cart/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "cart_item_not_found" });
    }

    res.json({ message: "item_removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

app.listen(port, () => {
  console.log(`Auth service running on port ${port}`);
});
