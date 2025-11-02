import "../css/login.css";
import "../css/hero.css"; // popup styles live here
import { useState, useEffect } from "react";
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
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // show popup on mount
    setShowPopup(true);
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    try {
      const response = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      toast.success("Registration successful! Please check your email.");
      navigate("/login");
    } catch (err) {
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

      {/* Popup overlay */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Before You Register</h2>
            <p>
              Please follow these rules when creating your account:
            </p>
            <ul style={{ textAlign: "left", marginBottom: "1rem", color: "#333" }}>
              <li> Usernames may contain <b>letters</b>, <b>numbers</b>, <b>underscores</b>, and <b>hashtags</b>.</li>
              <li> Passwords must include:</li>
              <ul style={{ marginLeft: "1rem" }}>
                <li>• At least one <b>uppercase letter</b></li>
                <li>• At least one <b>digit</b></li>
                <li>• At least one <b>special character</b> (e.g. ! @ # $ % ^ & *)</li>
              </ul>
            </ul>
            <div className="popup-actions">
              <button
                className="popup-btn"
                onClick={() => setShowPopup(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
