const BASE_URL = ""; // Relative url, proxied by Vite

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request(method: string, url: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);

  // If it's a FormData object (like for file uploads), we don't set Content-Type header manually
  const isFormData = options.data instanceof FormData;

  if (options.data && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    method,
    headers,
    credentials: "include", // Ensure cookies are sent
  };

  if (options.data) {
    config.body = isFormData ? options.data : JSON.stringify(options.data);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);

  if (response.status === 401) {
    // Session expired, optionally clear token
    localStorage.removeItem("token");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  // Handle file downloads/blobs if needed
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  }

  return response;
}

export const api = {
  get: (url: string, options?: RequestOptions) => request("GET", url, options),
  post: (url: string, data?: any, options?: RequestOptions) => request("POST", url, { ...options, data }),
  put: (url: string, data?: any, options?: RequestOptions) => request("PUT", url, { ...options, data }),
  delete: (url: string, options?: RequestOptions) => request("DELETE", url, options),
};
