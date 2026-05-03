import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getResourcePrediction = async ({ disasterType, severity, affectedPopulation, disasterId, location }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/predictions`, {
      disasterType,
      severity,
      affectedPopulation,
      disasterId,
      location,
    }, {
      headers: getAuthHeaders(),
    });

    return response.data;
  } catch {
    return null;
  }
};

export const getPredictionLogs = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/api/predictions/logs`, {
    params,
    headers: getAuthHeaders(),
  });

  return response.data;
};

export const deletePredictionLogById = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/api/predictions/logs/${id}`, {
    headers: getAuthHeaders(),
  });

  return response.data;
};
