import "../css/login.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { login } from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login(formData);

      // store token in localStorage
      localStorage.setItem("authToken", data.access);
      window.dispatchEvent(new Event("storage")); 

      toast.success("Login successful!");
      navigate("/"); 
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };


  return (
    <div className="login-page">
      <div className="login-glass">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <p style={{ color: "#ff6b6b", fontSize: "0.9rem" }}>{error}</p>
          )}
          <button type="submit">Login</button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          <Link to="/register">Don’t have an account? Sign up here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
