// ─── Configuration ────────────────────────────────────────────────────────────
// Change this to your backend IP when running on a physical Android device
// e.g., 'http://192.168.1.100:5000' (find your PC IP with `ipconfig` or `ifconfig`)
export const BASE_URL =
  "https://inventory-backend-production-b886.up.railway.app";
// Physical device via Expo Go

// For physical device, replace with your machine's local IP:
// export const BASE_URL = 'http://192.168.x.x:5000';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
export async function apiFetch(endpoint, options = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { headers, ...options };
  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  // Add 30 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log(`[API] ${options.method || "GET"} ${BASE_URL}${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`[API] Response:`, data);

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[API Error] ${endpoint}: ${err.message}`);

    if (err.name === "AbortError") {
      throw new Error("Request timeout. Check your connection to the server.");
    }
    if (err.message === "Network request failed") {
      throw new Error(
        `Cannot connect to server at ${BASE_URL}. Check your network and server address.`,
      );
    }
    throw err;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const AuthAPI = {
  signup: (body) => apiFetch("/api/auth/signup", { method: "POST", body }),
  signin: (body) => apiFetch("/api/auth/signin", { method: "POST", body }),
  forgotPassword: (body) =>
    apiFetch("/api/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body) =>
    apiFetch("/api/auth/reset-password", { method: "POST", body }),
  getMe: (token) => apiFetch("/api/auth/me", {}, token),
};

// ─── Products API ─────────────────────────────────────────────────────────────
export const ProductsAPI = {
  getAll: (token, search = "") =>
    apiFetch(
      `/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      {},
      token,
    ),
  getLowStock: (token) => apiFetch("/api/products/low-stock", {}, token),
  getById: (token, id) => apiFetch(`/api/products/${id}`, {}, token),
  create: (token, body) =>
    apiFetch("/api/products", { method: "POST", body }, token),
  update: (token, id, body) =>
    apiFetch(`/api/products/${id}`, { method: "PUT", body }, token),
  delete: (token, id) =>
    apiFetch(`/api/products/${id}`, { method: "DELETE" }, token),
};

// ─── Sales API ────────────────────────────────────────────────────────────────
export const SalesAPI = {
  create: (token, body) =>
    apiFetch("/api/sales", { method: "POST", body }, token),
  getAll: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/api/sales${qs ? `?${qs}` : ""}`, {}, token);
  },
};

// ─── Reports API ──────────────────────────────────────────────────────────────
export const ReportsAPI = {
  daily: (token, date) =>
    apiFetch(`/api/reports/daily${date ? `?date=${date}` : ""}`, {}, token),
  weekly: (token) => apiFetch("/api/reports/weekly", {}, token),
  summary: (token) => apiFetch("/api/reports/summary", {}, token),
};

// ─── Alerts API ───────────────────────────────────────────────────────────────
export const AlertsAPI = {
  getLowStock: (token) => apiFetch("/api/alerts/low-stock", {}, token),
};
