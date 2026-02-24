import { useState } from "react";
import { createProduct } from "../services/api";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";


function CreateProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
  });

  const navigate = useNavigate();

  const role = localStorage.getItem("role");

  if (!role) {
    return <h2>Debes iniciar sesión</h2>;
  }

  if (role !== "seller") {
    return <h2>No tienes permisos para publicar productos</h2>;
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  //cambios nuevos
  const sellerId = localStorage.getItem("userId");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await createProduct({
    ...form,
    seller_id: sellerId,
    });

    alert("Producto publicado");
    navigate("/");
  };

  return (
    <div>
      <h1>Publicar producto</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Nombre"
          onChange={handleChange}
        />
        <input
          name="price"
          placeholder="Precio"
          onChange={handleChange}
        />
        <button type="submit">Publicar</button>
      </form>
    </div>
  );
}

export default CreateProduct;
