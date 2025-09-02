// src/api.js
const API_BASE = import.meta.env.VITE_BACKEND_BASE_URL || "https://api.sunsetuploader.com";

export async function register({ username, email, password }) {
  const res = await fetch(`${API_BASE}/accounts/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server returned invalid response");
  }

  if (!res.ok) {
    const message = data.detail || data.error || JSON.stringify(data) || "Registration failed";
    throw new Error(message);
  }

  return data;
}

export async function resendConfirm(email) {
  const res = await fetch(`${API_BASE}/accounts/resend-confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function login({ username, password }) {
  // username or email works because allauth auth method is username_email
  const res = await fetch(`${API_BASE}/accounts/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  // data.access is your long-lived access token
  return data;
}

export async function getUploadUrl(fileName) {
  const token = localStorage.getItem("authToken");
  const res = await fetch(`${API_BASE}/r2/upload-url/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ file_name: fileName })
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json(); // returns { upload_url }
}

export async function uploadFileToR2(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file
  });
  if (!res.ok) throw new Error("Upload to R2 failed");
  return true;
}
