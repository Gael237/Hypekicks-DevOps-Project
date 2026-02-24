// URLs base de cada microservicio
const API = {
  auth: "http://localhost:3001/api",
  products: "http://localhost:3002/api",
  cart: "http://localhost:3003/api",
  orders: "http://localhost:3000/api",
};

// ---------- AUTH ----------
export async function loginUser(data) {
  const res = await fetch(`${API.auth}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function registerUser(data) {
  const res = await fetch(`${API.auth}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

// ---------- PRODUCTS ----------
export async function getProducts() {
  const res = await fetch(`${API.products}/products`);
  return res.json();
}

export async function createProduct(data) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API.products}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

// ---------- CART ----------
export async function addToCart(data) {
  const res = await fetch(`${API.cart}/cart`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function getCart(userId) {
  const res = await fetch(`${API.cart}/cart/${userId}`);
  return res.json();
}
