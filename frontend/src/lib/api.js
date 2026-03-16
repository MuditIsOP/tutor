import { getStoredAdmin } from "./session";

const API_BASE_URL = "http://127.0.0.1:8002";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { detail: await response.text() };

  if (!response.ok) {
    throw new Error(data.detail || "Request failed.");
  }

  return data;
}

function buildHeaders(path, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const storedAdmin = getStoredAdmin();

  if (path.startsWith("/admin") && storedAdmin?.session_token) {
    headers["X-Admin-Token"] = storedAdmin.session_token;
  }

  return headers;
}

export async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(path),
  });
  return parseResponse(response);
}

export async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(path, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function putJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(path, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function deleteJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(path),
  });

  return parseResponse(response);
}

export { API_BASE_URL };
