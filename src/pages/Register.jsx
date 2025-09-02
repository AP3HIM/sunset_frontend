import "../css/login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { register } from "../services/api";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting registration form..."); // Debug log
    setError("");

    if (formData.password !== formData.confirmPassword) {
      console.warn("Password mismatch");
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    try {
      console.log("Sending data to API:", formData);
      const response = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      console.log("Registration success:", response);
      toast.success("Registration successful! Please check your email.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <div className="login-page">
      <form className="login-glass" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
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
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
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
        <div className="input-group">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.9rem" }}>{error}</p>
        )}
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;
