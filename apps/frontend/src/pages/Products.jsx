import { useEffect, useState } from "react";
import { getProducts, addToCart } from "../services/api";
import React from "react";

function Products() {
  const [products, setProducts] = useState([]);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    console.log("Productos:", data);
    setProducts(data);
  };

  const handleAddToCart = async (productId) => {
    if (!userId) {
      alert("Debes iniciar sesión");
      return;
    }

    await addToCart({
      user_id: userId,
      product_id: productId,
      quantity: 1,
    });

    alert("Producto agregado al carrito");
  };

  return (
    <div>
      <h1>Productos</h1>
      {products.map((p) => (
        <div key={p.id}>
          <h3>{p.name}</h3>
          <p>${p.price}</p>
          <button onClick={() => handleAddToCart(p.id)}>
            Agregar al carrito
          </button>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Products;
