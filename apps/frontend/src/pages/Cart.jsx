import { useEffect, useState } from "react";
import { getCart } from "../services/api";

function Cart() {
  const [items, setItems] = useState([]);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (userId) {
      loadCart();
    }
  }, []);

  const loadCart = async () => {
    const data = await getCart(userId);
    setItems(data);
  };

  if (!userId) {
    return <h2>Debes iniciar sesión</h2>;
  }

  const updateQuantity = async (id, currentQuantity) => {
  await fetch(`http://localhost:3003/api/cart/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quantity: currentQuantity + 1,
    }),
  });

  await loadCart(); 
};

  return (
    <div>
      <h1>Carrito</h1>
      {items.length === 0 ? (
        <p>Carrito vacío</p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <p><strong>{item.name}</strong></p>
            <p>Precio: ${item.price}</p>
            <p>Cantidad: {item.quantity}</p>
            
            <button onClick={() => updateQuantity(item.id, item.quantity)}>
              +
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default Cart;
