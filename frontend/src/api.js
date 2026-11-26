const API_BASE = import.meta.env.VITE_API_BASE || "https://nft-bazar-vite-project.onrender.com";

let authFailureHandler = null;

export function setAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export async function apiRequest(path, { method = "GET", body, token, skipAuthRedirect = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: "Received an invalid response from the server." };
  }

  if (!res.ok || data.success === false) {
    if (
      token &&
      !skipAuthRedirect &&
      authFailureHandler &&
      (res.status === 401 || (res.status === 403 && /blocked/i.test(data.message || "")))
    ) {
      authFailureHandler(data.message || "Session expired. Please log in again.");
    }
    throw new Error(data.message || "Something went wrong, please try again.");
  }
  return data;
}
