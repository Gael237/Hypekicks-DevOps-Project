import express from "express";
import cors from "cors";
import dotenv from "dotenv";
//import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createPool } from "./db.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Middleware para verificar token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "token_required" });

  jwt.verify(
    token,
    process.env.JWT_SECRET || "secretkey",
    (err, user) => {
      if (err) return res.status(403).json({ error: "invalid_token" });

      req.user = user; // aquí guardamos id y role
      next();
    }
  );
}

function requireSeller(req, res, next) {
  if (req.user.role !== "seller") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

const port = process.env.PORT || 3002;
const pool = createPool();

// Health check
app.get("/health", (req, res) => res.send("auth ok"));

//--PRODUCTOS--
  // Obtener todos los productos
app.get("/api/products", async (req, res) => {
  try{
    const { rows } = await pool.query(
      `SELECT id, name, description, price, stock, seller_id, created_at
       FROM products
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

 //Obtener producto por id
app.get("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  try{
    const { rows } = await pool.query(
      `SELECT id, name, description, price, stock, seller_id, created_at
       FROM products
       WHERE id = $1`,
       [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "product_not_found"});
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Crear producto (seller)
app.post("/api/products",
  authenticateToken,
  requireSeller,
  async (req, res)=> {
  const { name, description, price, stock } = req.body;
  const seller_id = req.user.id;

  if (!name || !price) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price, stock, seller_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, price, stock, seller_id, created_at`,
      [name, description, price, stock || 0, seller_id]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Editar producto
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE products
       SET name = $1,
           description = $2,
           price = $3,
           stock = $4
       WHERE id = $5
       RETURNING id, name, description, price, stock, seller_id, created_at`,
      [name, description, price, stock, id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "product_not_found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

// Eliminar producto
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM products WHERE id = $1",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "product_not_found" });
    }

    res.json({ message: "product_deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "db_error" });
  }
});

app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

app.get("/readyz", (req, res) => {
  res.status(200).send("ready");
});

app.listen(port, () => {
  console.log(`Product service running on port ${port}`);
});

