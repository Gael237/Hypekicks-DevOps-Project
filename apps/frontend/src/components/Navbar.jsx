import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <Link to="/">Productos</Link> |{" "}
      <Link to="/cart">Carrito</Link> |{" "}
      <Link to="/profile">Perfil</Link> |{" "}
      <Link to="/create-product">Crear producto</Link> |{" "}
      <Link to="/register">Register</Link> |{" "}
      <Link to="/login">Login</Link>
      <button onClick={handleLogout}>Cerrar sesión</button>
    </nav>
  );
}

const handleLogout = () => {
  localStorage.removeItem("userId");
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/login";
};




export default Navbar;
