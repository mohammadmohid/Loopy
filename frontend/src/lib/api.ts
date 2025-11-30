const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api";

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    headers: {
      "Content-Type": data ? "application/json" : "",
      ...headers,
    },
    credentials: "include", // Critical for HttpOnly Cookies
    body: data ? JSON.stringify(data) : undefined,
    ...customConfig,
  };

  if (options.method === "PUT" && data && !(data instanceof FormData)) {
    // Handle raw binary uploads differently if needed, but for JSON APIs:
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Something went wrong");
  }

  // Handle empty responses (like 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
