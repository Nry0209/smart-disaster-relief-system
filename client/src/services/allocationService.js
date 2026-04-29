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



export async function upsertAllocationForReport(reportId, payload) {

  const token = localStorage.getItem("token");

  const hasExisting = Boolean(payload?.hasExistingAllocation);



  const requestPayload = {

    allocatedBy: payload?.allocatedBy || "Allocation Officer",

    message: payload?.message || "",

    allocatedResources: {

      quantities: payload?.quantities || {},

      lineItems: Array.isArray(payload?.lineItems) ? payload.lineItems : [],

    },

  };



  return requestJson(

    `${API_BASE_URL}/api/disaster-reports/${reportId}/allocate`,

    {

      method: hasExisting ? "PUT" : "POST",

      headers: {

        "Content-Type": "application/json",

        ...(token ? { Authorization: `Bearer ${token}` } : {}),

      },

      body: JSON.stringify(requestPayload),

    },

    "Failed to save allocation."

  );

}



export async function clearAllocationForReport(reportId, payload = {}) {

  const token = localStorage.getItem("token");



  return requestJson(

    `${API_BASE_URL}/api/disaster-reports/${reportId}/allocate`,

    {

      method: "DELETE",

      headers: {

        "Content-Type": "application/json",

        ...(token ? { Authorization: `Bearer ${token}` } : {}),

      },

      body: JSON.stringify(payload),

    },

    "Failed to clear allocation."

  );

}

