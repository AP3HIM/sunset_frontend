// src/App.jsx
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/Home";
import PricingPage from "./pages/Pricing";
import LoginPage from "./pages/Login";
import Register from "./pages/Register";
import Upload from "./pages/Upload";
import ErrorPage from "./pages/ErrorPage";

// Legal pages
import About from "./pages/legal/About";
import Contact from "./pages/legal/Contact";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import HelpCenter from "./pages/legal/HelpCenter";
import ReportIssue from "./pages/legal/ReportIssue";
import EnterpriseInquiry from "./pages/legal/EnterpriseInquiry";
import Blog from "./pages/legal/Blog";
import Socials from "./pages/legal/Socials";
import News from "./pages/legal/News";

import "./css/app.css";
import { Toaster } from 'react-hot-toast';

// Detect Electron (process.versions.electron works in preload)
const isElectron = !!(typeof navigator === "object" && navigator.userAgent.toLowerCase().includes("electron"));

function App() {
  const RouterComponent = isElectron ? HashRouter : BrowserRouter;

  return (
    <RouterComponent>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/enterprise" element={<EnterpriseInquiry />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/socials" element={<Socials />} />
          <Route path="/news" element={<News />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </RouterComponent>
  );
}

export default App;
