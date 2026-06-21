import axios from "axios";

// Create pre-configured Axios instance matching port 3000
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto inject session token from local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("gymflow_token");
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept unauthorized requests to automatically signs out expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Session expired or unauthorized. Logging out...");
      // Unless they are visiting authentication endpoints
      const url = error.config.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/reset")) {
        localStorage.removeItem("gymflow_token");
        localStorage.removeItem("gymflow_user");
        // We can do window.location.reload() or let App state trigger redirect
        window.dispatchEvent(new Event("gymflow-unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
