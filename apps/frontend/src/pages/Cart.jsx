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

  return (
    <div>
      <h1>Carrito</h1>
      {items.length === 0 ? (
        <p>Carrito vacío</p>
      ) : (
        items.map((item) => (
          <div key={item.id}>
            <p>
              Producto: {item.product_name} | Cantidad: {item.quantity}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default Cart;
