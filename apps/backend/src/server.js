import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPool, ensureSchema, isMemoryMode } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

let memItems = [{ id: 1, text: "Hello FinLab", created_at: new Date().toISOString() }];
let httpServer;

const memoryMode = isMemoryMode();
const pool = createPool();

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDatabase() {
  if (!pool) return;

  const maxAttempts = parseIntOrDefault(process.env.DB_INIT_MAX_ATTEMPTS, 30);
  const retryDelayMs = parseIntOrDefault(process.env.DB_INIT_RETRY_DELAY_MS, 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ensureSchema(pool);
      console.log(`DB schema ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.error(
        `DB init failed (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelayMs}ms:`,
        error.message
      );
      await delay(retryDelayMs);
    }
  }
}

async function dbOk() {
  if (!pool) return true; // Memory mode is always ready.
  const res = await pool.query("SELECT 1 AS ok");
  return res?.rows?.[0]?.ok === 1;
}

app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.get("/readyz", async (req, res) => {
  try {
    const ok = await dbOk();
    return ok ? res.status(200).send("ready") : res.status(503).send("not ready");
  } catch (e) {
    return res.status(503).send("not ready");
  }
});

app.get("/api/items", async (req, res) => {
  try {
    if (!pool) return res.json(memItems);
    const { rows } = await pool.query("SELECT id, text, created_at FROM items ORDER BY id DESC LIMIT 200");
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "db_error" });
  }
});

app.post("/api/items", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text_required" });

  try {
    if (!pool) {
      const nextId = (memItems[0]?.id || 0) + 1;
      const item = { id: nextId, text, created_at: new Date().toISOString() };
      memItems = [item, ...memItems];
      return res.status(201).json(item);
    }
    const { rows } = await pool.query(
      "INSERT INTO items(text) VALUES($1) RETURNING id, text, created_at",
      [text]
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "db_error" });
  }
});

//Cambios a partir de aqui
//--REGISTER--
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = role || "buyer";

    const { rows } = await pool.query(
      `INSERT INTO users(name, email, password, role)
       VALUES($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, userRole]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(400).json({ error: "email_already_exists" });
    }

    return res.status(500).json({ error: "db_error" });
  }
});

//--LOGIN--
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1",
      [email]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      "secretkey",
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "server_error" });
  }
});

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
       WHERE id = $1`
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
app.post("/api/products", async (req, res) => {
  const { name, description, price, stock, seller_id } = req.body;

  if (!name || !price || !seller_id) {
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

async function start() {
  if (pool) {
    pool.on("error", (err) => console.error("Postgres pool error:", err));
    console.log("DB mode: postgres");
    await initDatabase();
  } else if (memoryMode) {
    console.warn("DB mode: memory (set DB_MODE=postgres to use PostgreSQL)");
  }

  httpServer = app.listen(port, () => {
    console.log(`API listening on 0.0.0.0:${port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  if (pool) {
    await pool.end();
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Shutdown failed:", error);
        process.exit(1);
      });
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
