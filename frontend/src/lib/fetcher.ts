import { apiRequest } from "./api";

// A global fetcher function for SWR to consume
// It wraps the existing apiRequest but enforces GET method format.
export const fetcher = (url: string) => apiRequest(url, { method: "GET" });
