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

export async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return parseResponse(response);
}

export async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export { API_BASE_URL };
