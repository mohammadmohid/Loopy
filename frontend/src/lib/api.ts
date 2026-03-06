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
  let response;
  try {
    response = await fetch(finalUrl, config);
  } catch (err) {
    if (err instanceof Error && err.message.includes("proxy")) {
      console.warn("Next.js proxy failed, attempting direct gateway connection...");
      // Fallback: Bypass Next.js rewrites and hit the Gateway directly (localhost:8000)
      const directUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
      response = await fetch(directUrl, config);
    } else {
      throw err;
    }
  }

  if (!response || !response.ok) {
    const contentType = response?.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server Error (${response.status})`);
    } else {
      // It's likely HTML or Text (The real error is hidden here!)
      const textError = await response?.text();
      console.error("❌ NON-JSON ERROR RESPONSE:", textError); // Check Console for this!

      // Detect Next.js proxy error
      if (textError && textError.includes("Error occurred while trying to proxy")) {
        console.warn("⚠️ Next.js proxy failed, retrying directly to backend...");
        const directUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
        response = await fetch(directUrl, config);
        if (!response.ok) {
          throw new Error(`API Error ${response.status}: Direct Gateway Connection Failed.`);
        }
        // If direct hit succeeded, continue down!
      } else {
        throw new Error(`API Error ${response?.status}: The server returned text instead of JSON. Check the Network Tab.`);
      }
    }
  }

  // Double check if proxy retry above actually gave us a new valid response
  if (response && response.status === 204) {
    return {} as T;
  }

  return response.json();
}