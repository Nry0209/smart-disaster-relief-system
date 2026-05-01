import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { fetchDisasterReportById } from "../services/disasterReportService";
import { fetchInventoryItems } from "../services/inventoryService";
import { clearAllocationForReport, upsertAllocationForReport } from "../services/allocationService";
import { getResourcePrediction } from "../services/predictionService";
import "./Pages.css";

const MAX_ALLOCATION_NOTE_LENGTH = 400;

function getRequestedItems(report, inventory) {
  if (Array.isArray(report?.requiredItems) && report.requiredItems.length > 0) {
    return report.requiredItems
      .map((item) => ({
        inventoryItemId: String(item.inventoryItemId || ""),
        itemName: String(item.itemName || "").trim(),
        category: String(item.category || "").trim(),
        requiredQuantity: Number(item.requiredQuantity || 0),
      }))
      .filter((item) => item.inventoryItemId && item.itemName);
  }

  const needs = Array.isArray(report?.immediateNeeds) ? report.immediateNeeds : [];
  return needs
    .map((need) => {
      const matched = inventory.find(
        (item) => String(item.name || "").toLowerCase() === String(need || "").toLowerCase()
      );

      if (!matched) {
        return null;
      }

      return {
        inventoryItemId: String(matched.id || matched._id || ""),
        itemName: matched.name,
        category: matched.category,
        requiredQuantity: 0,
      };
    })
    .filter(Boolean);
}

function getPredictionSuggestion(item, prediction, currentQuantity) {
  const normalizedCategory = String(item.category || "").toLowerCase();
  const normalizedName = String(item.itemName || "").toLowerCase();

  if (
    normalizedCategory.includes("drinking water") ||
    normalizedCategory.includes("water") ||
    normalizedName.includes("water") ||
    normalizedName.includes("bottle")
  ) {
    return Number(prediction?.waterNeeded || 0);
  }

  if (
    normalizedCategory.includes("medicine") ||
    normalizedCategory.includes("medical") ||
    normalizedName.includes("medicine") ||
    normalizedName.includes("kit") ||
    normalizedName.includes("bandage")
  ) {
    return Number(prediction?.medicineNeeded || 0);
  }

  if (
    normalizedCategory.includes("food") ||
    normalizedName.includes("rice") ||
    normalizedName.includes("flour") ||
    normalizedName.includes("ration")
  ) {
    return Number(prediction?.foodNeeded || 0);
  }

  return Number(currentQuantity || 0);
}

export default function AllocationFormPage() {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [predictedResources, setPredictedResources] = useState(null);
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [quantityErrors, setQuantityErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      setPredictionError("");

      try {
        const [reportResult, inventoryResult] = await Promise.all([
          fetchDisasterReportById(reportId),
          fetchInventoryItems(),
        ]);

        const selectedReport = reportResult?.data?.report || reportResult?.report || reportResult;
        
        // Parse inventory response - backend returns array directly
        let selectedInventory = [];
        if (Array.isArray(inventoryResult)) {
          selectedInventory = inventoryResult;
        } else if (Array.isArray(inventoryResult?.data?.inventory)) {
          selectedInventory = inventoryResult.data.inventory;
        } else if (Array.isArray(inventoryResult?.inventory)) {
          selectedInventory = inventoryResult.inventory;
        } else if (inventoryResult?.data && Array.isArray(inventoryResult.data)) {
          selectedInventory = inventoryResult.data;
        }

        // Ensure all items have stock field
        selectedInventory = selectedInventory.map(item => ({
          ...item,
          stock: item.stock ?? item.quantityAvailable ?? item.quantity ?? 0
        }));

        console.log('Allocation form loaded inventory:', { count: selectedInventory.length, sample: selectedInventory.slice(0, 2).map(i => ({ name: i.name, stock: i.stock })) });

        setReport(selectedReport || null);
        setInventory(selectedInventory);

        const allocation = selectedReport?.allocatedResources || null;
        setExistingAllocation(allocation);
        setAllocationQuantities(allocation?.quantities || {});
        setAllocationMessage(allocation?.message || "");

        if (selectedReport) {
          setPredictionLoading(true);
          try {
            const prediction = await getResourcePrediction({
              disasterType: selectedReport.disasterType,
              severity: String(selectedReport.severity || selectedReport.priority || "medium").toLowerCase(),
              affectedPopulation: Number(selectedReport.affectedPopulation || 0),
              disasterId: selectedReport.id || selectedReport._id,
              location: selectedReport.location,
            });
            setPredictedResources(prediction || null);
          } catch (predictionFetchError) {
            setPredictionError(predictionFetchError.message || "Failed to load prediction.");
          } finally {
            setPredictionLoading(false);
          }
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load allocation data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reportId]);

  const requestedItems = useMemo(() => getRequestedItems(report, inventory), [report, inventory]);

  const availableStock = (itemId) => {
    const item = inventory.find((entry) => String(entry.id || entry._id) === String(itemId));
    if (!item) {
      console.warn(`Item not found in inventory: ${itemId}`);
      return 0;
    }
    // MongoDB stores count in 'stock' field
    const stock = Number(item.stock || 0);
    return stock;
  };

  const handleHardRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear local storage and session storage of inventory cache
      localStorage.removeItem('inventoryCache');
      sessionStorage.removeItem('inventoryCache');
      
      // Reload inventory items from backend
      const inventoryResult = await fetchInventoryItems();
      
      // Parse response - backend returns array directly
      let selectedInventory = [];
      if (Array.isArray(inventoryResult)) {
        selectedInventory = inventoryResult;
      } else if (Array.isArray(inventoryResult?.data?.inventory)) {
        selectedInventory = inventoryResult.data.inventory;
      } else if (Array.isArray(inventoryResult?.inventory)) {
        selectedInventory = inventoryResult.inventory;
      } else if (inventoryResult?.data && Array.isArray(inventoryResult.data)) {
        selectedInventory = inventoryResult.data;
      }
      
      // Ensure all items have stock field
      selectedInventory = selectedInventory.map(item => ({
        ...item,
        stock: item.stock ?? item.quantityAvailable ?? item.quantity ?? 0
      }));

      console.log('Hard refresh loaded inventory:', { count: selectedInventory.length, sample: selectedInventory.slice(0, 2).map(i => ({ name: i.name, stock: i.stock })) });
      
      setInventory(selectedInventory);
      setError('');
    } catch (refreshError) {
      setError('Failed to refresh inventory: ' + (refreshError.message || 'Unknown error'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuantityChange = (itemId, value) => {
    if (value === "") {
      setAllocationQuantities((prev) => ({ ...prev, [itemId]: "" }));
      setQuantityErrors((prev) => ({ ...prev, [itemId]: "Quantity is required." }));
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Math.floor(parsed) < 1) {
      setAllocationQuantities((prev) => ({ ...prev, [itemId]: value }));
      setQuantityErrors((prev) => ({ ...prev, [itemId]: "Minimum quantity is 1." }));
      return;
    }

    const quantity = Math.floor(parsed);
    setAllocationQuantities((prev) => ({ ...prev, [itemId]: quantity }));
    setQuantityErrors((prev) => ({ ...prev, [itemId]: "" }));
  };

  const applyPredictionAsSuggestion = () => {
    if (!predictedResources) return;

    const suggested = {};
    requestedItems.forEach((item) => {
      suggested[item.inventoryItemId] = getPredictionSuggestion(
        item,
        predictedResources,
        allocationQuantities[item.inventoryItemId] || 0
      );
    });

    setAllocationQuantities((prev) => ({ ...prev, ...suggested }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!report) return;

    const nextQuantityErrors = {};
    requestedItems.forEach((item) => {
      const quantity = Number(allocationQuantities[item.inventoryItemId]);
      if (!Number.isInteger(quantity) || quantity < 1) {
        nextQuantityErrors[item.inventoryItemId] = "Minimum quantity is 1.";
      }
    });

    if (Object.keys(nextQuantityErrors).length > 0) {
      setQuantityErrors(nextQuantityErrors);
      setError("Please fix highlighted quantity fields.");
      return;
    }

    const lineItems = requestedItems
      .map((item) => ({
        itemId: item.inventoryItemId,
        itemName: item.itemName,
        category: item.category,
        quantity: Number(allocationQuantities[item.inventoryItemId] || 0),
      }))
      .filter((item) => item.quantity > 0);

    setSaving(true);
    setError("");

    try {
      await upsertAllocationForReport(report.id || report._id, {
        hasExistingAllocation: Boolean(existingAllocation),
        quantities: allocationQuantities,
        lineItems,
        message: allocationMessage,
        allocatedBy: "Allocation Officer",
      });

      navigate("/allocations", { replace: true });
    } catch (saveError) {
      setError(saveError.message || "Failed to save allocation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!report || !existingAllocation) return;

    setSaving(true);
    setError("");

    try {
      await clearAllocationForReport(report.id || report._id, { allocatedBy: "Allocation Officer" });
      navigate("/allocations", { replace: true });
    } catch (deleteError) {
      setError(deleteError.message || "Failed to clear allocation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-page">
      <PageHeader
        role="Allocation Workflow"
        title={existingAllocation ? "Manage Allocation" : "Allocate Resources"}
        description="Work on allocations in a dedicated page instead of a popup panel."
      />

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        {loading ? (
          <p className="text-sm text-slate-500">Loading allocation page...</p>
        ) : error ? (
          <div className="inventory-inline-alert error">{error}</div>
        ) : report ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="request-summary">
              <h3>Disaster Event Details</h3>
              <div className="summary-grid">
                <div className="summary-item"><span>Event ID:</span><strong>{report.id || report._id}</strong></div>
                <div className="summary-item"><span>Disaster:</span><strong>{report.disasterType || "-"}</strong></div>
                <div className="summary-item"><span>Location:</span><strong>{report.location || "-"}</strong></div>
                <div className="summary-item"><span>Priority:</span><strong>{String(report.priority || report.severity || "unknown").toUpperCase()}</strong></div>
                <div className="summary-item"><span>Affected Population:</span><strong>{Number(report.affectedPopulation || 0).toLocaleString()}</strong></div>
                <div className="summary-item"><span>Reported By:</span><strong>{report.reportedBy || "-"}</strong></div>
              </div>
            </div>

            <div className="allocation-prediction-section">
              <h3>Prediction-Based Recommendation</h3>
              {predictionLoading ? (
                <p className="allocation-info-inline">Loading predicted resource recommendation...</p>
              ) : predictionError ? (
                <p className="allocation-error-inline">{predictionError}</p>
              ) : predictedResources ? (
                <>
                  <div className="prediction-grid">
                    <div className="prediction-card"><span className="prediction-label">Food Needed</span><strong>{Number(predictedResources.foodNeeded || 0).toLocaleString()}</strong></div>
                    <div className="prediction-card"><span className="prediction-label">Water Needed</span><strong>{Number(predictedResources.waterNeeded || 0).toLocaleString()}</strong></div>
                    <div className="prediction-card"><span className="prediction-label">Medicine Needed</span><strong>{Number(predictedResources.medicineNeeded || 0).toLocaleString()}</strong></div>
                  </div>
                  <div className="prediction-actions">
                    <button type="button" className="prediction-apply-btn" onClick={applyPredictionAsSuggestion} disabled={saving}>
                      Use Prediction as Suggested Allocation
                    </button>
                  </div>
                </>
              ) : (
                <p className="allocation-info-inline">No prediction available.</p>
              )}
            </div>

            <div className="allocation-details">
              <h3>Resource Allocation</h3>
              {requestedItems.length === 0 ? (
                <p className="allocation-info-inline">No specific needs listed by DMC.</p>
              ) : (
                requestedItems.map((need) => {
                  const rawQty = allocationQuantities[need.inventoryItemId];
                  const currentQty = rawQty === "" || rawQty === undefined ? "" : Number(rawQty);
                  const available = availableStock(need.inventoryItemId);
                  const sufficient = Number(currentQty || 0) <= available;
                  const hasError = Boolean(quantityErrors[need.inventoryItemId]);
                  const hasEmptyError = rawQty === "";

                  return (
                    <div key={need.inventoryItemId} className={`allocation-item ${hasError || hasEmptyError || !sufficient ? 'border-rose-300 bg-rose-50' : ''}`}>
                      <div className="item-info">
                        <span className="item-name">{need.itemName}</span>
                        <span className="item-quantity">Available: {available.toLocaleString()}</span>
                      </div>
                      <div className="quantity-input">
                        <input
                          type="number"
                          min="1"
                          value={currentQty}
                          onChange={(event) => handleQuantityChange(need.inventoryItemId, event.target.value)}
                          className={`${hasError || hasEmptyError || !sufficient ? 'border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100' : 'border-slate-200'} w-full px-2 py-1 border rounded`}
                          placeholder="Enter quantity"
                        />
                      </div>
                      <div className="error-messages">
                        {hasEmptyError && <p className="text-xs text-rose-600 font-medium">Quantity is required.</p>}
                        {hasError && <p className="text-xs text-rose-600 font-medium">{quantityErrors[need.inventoryItemId]}</p>}
                        {!hasError && !sufficient && <p className="text-xs text-rose-600 font-medium">Quantity cannot exceed available stock ({available}).</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="message-section">
              <h3>Allocation Notes</h3>
              <textarea
                value={allocationMessage}
                onChange={(event) => setAllocationMessage(event.target.value)}
                placeholder="Add handover instructions, route notes, or local context..."
                className="message-textarea"
                rows="4"
                maxLength={MAX_ALLOCATION_NOTE_LENGTH}
              />
            </div>

            {existingAllocation && (
              <div className="allocation-info">
                <h4>Current Allocation Details</h4>
                <div className="info-grid">
                  <div className="info-item"><span>Allocated Date:</span><strong>{existingAllocation.allocatedDate ? new Date(existingAllocation.allocatedDate).toLocaleDateString("en-IN") : "-"}</strong></div>
                  <div className="info-item"><span>Allocated By:</span><strong>{existingAllocation.allocatedBy || "Allocation Officer"}</strong></div>
                </div>
              </div>
            )}

            <div className="warning-message">
              <AlertTriangle size={16} color="#d97706" />
              <span>Saving this allocation updates inventory and report status from a dedicated page.</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={handleHardRefresh} disabled={saving || refreshing}>
                {refreshing ? "Refreshing..." : "Hard Refresh Inventory"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => navigate("/allocations", { replace: true })} disabled={saving}>
                Cancel
              </button>
              {existingAllocation ? (
                <>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Update Allocation"}
                  </button>
                  <button type="button" className="btn-danger" onClick={handleDelete} disabled={saving}>
                    Delete Allocation
                  </button>
                </>
              ) : (
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Confirm Allocation"}
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Allocation data could not be loaded.</p>
        )}
      </section>
    </div>
  );
}
