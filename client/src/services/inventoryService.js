const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function requestJson(url, options = {}, fallbackMessage = "Request failed.") {
  try {
    const response = await fetch(url, options);
    const rawText = await response.text();

    let data = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }
    }

    if (!response.ok) {
      throw new Error(data.message || fallbackMessage);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to API server. Start backend server on http://localhost:5000 and try again."
      );
    }
    throw error;
  }
}

export async function fetchInventoryItems(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const query = searchParams.toString();
  const endpoint = query
    ? `${API_BASE_URL}/api/inventory?${query}`
    : `${API_BASE_URL}/api/inventory`;

  return requestJson(endpoint, {}, "Failed to fetch inventory items.");
}

export async function createInventoryItem(payload) {
  return requestJson(
    `${API_BASE_URL}/api/inventory`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to create inventory item."
  );
}

export async function updateInventoryItem(id, payload) {
  return requestJson(
    `${API_BASE_URL}/api/inventory/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to update inventory item."
  );
}

export async function adjustInventoryItem(id, payload) {
  return requestJson(
    `${API_BASE_URL}/api/inventory/${id}/adjust`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Failed to adjust inventory item."
  );
}

export async function deleteInventoryItem(id) {
  return requestJson(
    `${API_BASE_URL}/api/inventory/${id}`,
    {
      method: "DELETE",
    },
    "Failed to delete inventory item."
  );
}