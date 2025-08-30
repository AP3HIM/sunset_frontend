// src/pages/ErrorPage.jsx
import { Link } from "react-router-dom";
import "../css/ErrorPage.css"

export default function ErrorPage() {
  return (
    <div className="error-page">
      <h1 className="error-page-heading">404</h1>
      <p className="error-page-para">Oops! Page not found.</p>
      <Link to="/" className="error-page-links">
        Go Home
      </Link>
    </div>
  );
}
