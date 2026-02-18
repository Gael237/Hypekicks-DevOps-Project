import { useState } from "react";
import { createProduct } from "../services/api";
import Navbar from "../components/Navbar";


function CreateProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createProduct(form);
    alert("Producto publicado");
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
