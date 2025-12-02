const BASE_URL = "/api";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/api")
    ? endpoint.replace("/api", "")
    : endpoint;

  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": data ? "application/json" : "",
      ...headers,
    },
    credentials: "same-origin",
    body: data ? JSON.stringify(data) : undefined,
    ...customConfig,
  };

  if (options.method === "PUT" && data && !(data instanceof FormData)) {
    config.body = JSON.stringify(data);
  }

  // Request goes to: https://your-frontend.com/api/auth/login
  // Next.js rewrites to: https://your-backend.com/api/auth/login
  const response = await fetch(`${BASE_URL}${cleanEndpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Something went wrong");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
