import { useState } from "react";
import { register } from "../services/api";
import { useNavigate } from "react-router-dom";

function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
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
      await register(form);
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
        <input
          name="name"
          placeholder="Nombre"
          onChange={handleChange}
        />
        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          onChange={handleChange}
        />
        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
}

export default Register;
