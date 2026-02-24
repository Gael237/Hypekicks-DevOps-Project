import { useState } from "react";
import { registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer", // default
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
    try {
      await registerUser(form);
      alert("Usuario registrado");
      navigate("/login");
    } catch (err) {
      alert("Error al registrarse");
    }
  };

  return (
    <div>
      <h1>Registro</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Nombre" onChange={handleChange} />
        <input name="email" placeholder="Email" onChange={handleChange} />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          onChange={handleChange}
        />

        <select name="role" onChange={handleChange} value={form.role}>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
        </select>
        
        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
}

export default Register;
