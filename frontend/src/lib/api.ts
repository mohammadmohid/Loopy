const BASE_URL = "/api";


interface FetchOptions extends RequestInit {
  data?: any;
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {


  let finalUrl = "";

  if (endpoint.includes("artifacts") || endpoint.includes("transcribe")) {

    const cleanPath = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    finalUrl = `${BASE_URL}/${cleanPath}`;
  } else {

    const cleanEndpoint = endpoint.startsWith("/api")
      ? endpoint.replace("/api", "")
      : endpoint;
    finalUrl = `${BASE_URL}${cleanEndpoint}`;
  }

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

  // 2. MAKE THE REQUEST
  const response = await fetch(finalUrl, config);

  if (!response.ok) {
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server Error (${response.status})`);
    } else {
      // It's likely HTML or Text (The real error is hidden here!)
      const textError = await response.text();
      console.error("❌ NON-JSON ERROR RESPONSE:", textError); // Check Console for this!
      throw new Error(`API Error ${response.status}: The server returned text instead of JSON. Check the Network Tab.`);
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}