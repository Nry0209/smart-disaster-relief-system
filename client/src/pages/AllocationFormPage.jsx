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

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCoverageDays(days) {
  const parsedDays = Number(days);
  if (!Number.isInteger(parsedDays) || parsedDays < 1) {
    return "selected coverage window";
  }

  return `${parsedDays} day${parsedDays === 1 ? "" : "s"}`;
}

function getInventoryItemDetails(inventory, itemId, fallbackName = "") {
  const matched = inventory.find(
    (item) => String(item.id || item._id || "") === String(itemId || "")
  );

  if (matched) {
    return {
      unit: String(matched.unit || "units").trim(),
      packageSize: String(matched.packageSize || "").trim(),
    };
  }

  return {
    unit: "units",
    packageSize: String(fallbackName || "").trim(),
  };
}

function findInventoryItem(inventory, itemId, fallbackName = "") {
  const normalizedId = String(itemId || "").trim();
  const normalizedName = String(fallbackName || "").trim().toLowerCase();

  const byId = inventory.find((item) => {
    const candidateIds = [item?.id, item?._id, item?.inventoryItemId, item?.inventoryId].filter(Boolean);
    return candidateIds.some((candidate) => String(candidate) === normalizedId);
  });

  if (byId) {
    return byId;
  }

  if (normalizedName) {
    return inventory.find((item) => String(item?.name || "").trim().toLowerCase() === normalizedName) || null;
  }

  return null;
}

function getRequestedItems(report, inventory) {
  if (Array.isArray(report?.requiredItems) && report.requiredItems.length > 0) {
    return report.requiredItems
      .map((item) => {
        const matched = findInventoryItem(inventory, item.inventoryItemId, item.itemName);
        return {
          inventoryItemId: String(item.inventoryItemId || matched?.id || matched?._id || ""),
          itemName: String(item.itemName || matched?.name || "").trim(),
          category: String(item.category || matched?.category || "").trim(),
          requiredQuantity: Number(item.requiredQuantity || 0),
          stock: getResolvedInventoryStock(matched),
          min: Number(matched?.min) || 0,
          warehouse: String(matched?.warehouse || matched?.warehouseLocation || "").trim(),
          ...getInventoryItemDetails(inventory, item.inventoryItemId, item.itemName),
        };
      })
      .filter((item) => item.inventoryItemId && item.itemName);
  }

  const needs = Array.isArray(report?.immediateNeeds) ? report.immediateNeeds : [];
  return needs
    .map((need) => {
      const matched = findInventoryItem(inventory, "", need);

      if (!matched) {
        return null;
      }

      return {
        inventoryItemId: String(matched.id || matched._id || ""),
        itemName: matched.name,
        category: matched.category,
        requiredQuantity: 0,
        stock: getResolvedInventoryStock(matched),
        min: Number(matched?.min) || 0,
        warehouse: String(matched?.warehouse || matched?.warehouseLocation || "").trim(),
        ...getInventoryItemDetails(inventory, matched.id || matched._id, matched.packageSize || matched.unit),
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

function getResolvedInventoryStock(item) {
  const stockValue = item?.stock ?? item?.quantityAvailable ?? item?.quantity ?? 0;
  const parsedStock = Number(stockValue);
  return Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
}

function getInventoryStatus(stock, min) {
  const m = Number(min) || 0;
  if (m <= 0) return { label: "Good", tone: "good" };
  const ratio = stock / m;
  if (ratio >= 1) return { label: "Good", tone: "good" };
  if (ratio >= 0.7) return { label: "Warning", tone: "warning" };
  if (ratio >= 0.4) return { label: "Low", tone: "low" };
  return { label: "Critical", tone: "critical" };
}

export default function AllocationFormPage() {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [predictedResources, setPredictedResources] = useState(null);
  const [predictedAllocatedDays, setPredictedAllocatedDays] = useState(null);
  const [existingAllocation, setExistingAllocation] = useState(null);
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocationMessage, setAllocationMessage] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentDateError, setIncidentDateError] = useState("");
  const [allocatedDays, setAllocatedDays] = useState("");
  const [allocatedDaysError, setAllocatedDaysError] = useState("");
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

        // Ensure all items have stock field and normalize min/warehouse
        selectedInventory = selectedInventory.map(item => ({
          ...item,
          stock: getResolvedInventoryStock(item),
          min: Number(item?.min) || 0,
          warehouse: String(item?.warehouse || item?.warehouseLocation || "").trim(),
        }));

        console.log('Allocation form loaded inventory:', { count: selectedInventory.length, sample: selectedInventory.slice(0, 2).map(i => ({ name: i.name, stock: i.stock })) });

        setReport(selectedReport || null);
        setInventory(selectedInventory);

        const allocation = selectedReport?.allocatedResources || null;
        setExistingAllocation(allocation);
        setAllocationQuantities(allocation?.quantities || {});
        setAllocationMessage(allocation?.message || "");
        setIncidentDate(allocation?.incidentDate ? new Date(allocation.incidentDate).toISOString().slice(0,10) : "");
        setAllocatedDays(allocation?.allocatedDays ? String(allocation.allocatedDays) : "");

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
            setPredictionError("");
            // compute predicted allocated days using a simple heuristic
            if (prediction) {
              try {
              const pop = Number(selectedReport.affectedPopulation || 0) || 0;
              const sev = String(selectedReport.severity || selectedReport.priority || "medium").toLowerCase();
              const severityMultiplier = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.75 };
              const multiplier = severityMultiplier[sev] || 1.0;
              // heuristic: base coverage 1 day per 1000 people, scaled by severity
              const basePerThousand = 1;
              const estimated = Math.max(1, Math.ceil((pop / 1000) * basePerThousand * multiplier));
              setPredictedAllocatedDays(estimated);
              // auto-fill allocatedDays only when no existing allocation value is present
              if (!selectedReport?.allocatedResources?.allocatedDays && !allocatedDays) {
                setAllocatedDays(String(estimated));
              }
              } catch (e) {
              // ignore prediction-derived days failures
              setPredictedAllocatedDays(null);
              }
            } else {
              setPredictedAllocatedDays(null);
            }
          } catch (predictionFetchError) {
            setPredictedResources(null);
            setPredictedAllocatedDays(null);
            setPredictionError("");
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
      return 0;
    }
    return getResolvedInventoryStock(item);
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
        stock: getResolvedInventoryStock(item),
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

  const handleAllocatedDaysChange = (value) => {
    if (value === "") {
      setAllocatedDays("");
      setAllocatedDaysError("");
      return;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      setAllocatedDays(value);
      setAllocatedDaysError("Allocated days must be an integer >= 1");
      return;
    }

    setAllocatedDays(String(parsed));
    setAllocatedDaysError("");
  };

  const handleIncidentDateChange = (value) => {
    const today = getTodayDateString();

    if (!existingAllocation && value && value < today) {
      setIncidentDateError("Incident date cannot be in the past.");
      return;
    }

    setIncidentDate(value);
    setIncidentDateError("");
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

    if (!existingAllocation && incidentDate && incidentDate < getTodayDateString()) {
      setIncidentDateError("Incident date cannot be in the past.");
      return;
    }

    const nextQuantityErrors = {};
    requestedItems.forEach((item) => {
      const quantity = Number(allocationQuantities[item.inventoryItemId]);
      if (!Number.isInteger(quantity) || quantity < 1) {
        nextQuantityErrors[item.inventoryItemId] = "Minimum quantity is 1.";
      }
    });

    if (Object.keys(nextQuantityErrors).length > 0) {
      setQuantityErrors(nextQuantityErrors);
      // Show validation inline on each field instead of a top-level error banner
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
        incidentDate: incidentDate || null,
        allocatedDays: allocatedDays ? Number(allocatedDays) : null,
      });

      navigate("/distribution-tracking", { replace: true });
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
              <div className="allocation-meta grid gap-3 mt-4">
                <div className="meta-row">
                  <label className="block text-sm font-medium text-slate-700">Incident Date</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => handleIncidentDateChange(e.target.value)}
                    min={!existingAllocation ? getTodayDateString() : undefined}
                    className="mt-1 block w-full border-slate-200 rounded px-2 py-1"
                  />
                  {incidentDateError ? (
                    <p className="mt-1 text-xs text-red-600">{incidentDateError}</p>
                  ) : null}
                </div>

                <div className="meta-row">
                  <label className="block text-sm font-medium text-slate-700">Allocated Days (prediction window)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={allocatedDays}
                      onChange={(e) => handleAllocatedDaysChange(e.target.value)}
                      className="mt-1 block w-full border-slate-200 rounded px-2 py-1"
                      placeholder="Number of days resources should cover"
                    />
                    {predictedAllocatedDays ? (
                      <button
                        type="button"
                        className="ml-2 rounded bg-sky-600 px-3 py-1 text-xs text-white"
                        onClick={() => setAllocatedDays(String(predictedAllocatedDays))}
                      >
                        Use {predictedAllocatedDays}d
                      </button>
                    ) : null}
                  </div>
                  {allocatedDaysError ? (
                    <p className="mt-1 text-xs text-red-600">{allocatedDaysError}</p>
                  ) : null}
                  {predictedAllocatedDays && (
                    <p className="mt-1 text-xs text-slate-500">System suggestion: {predictedAllocatedDays} day{predictedAllocatedDays === 1 ? '' : 's'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="allocation-prediction-section">
              <h3>Prediction-Based Recommendation</h3>
              {predictionLoading ? (
                <p className="allocation-info-inline">Loading predicted resource recommendation...</p>
              ) : predictionError ? (
                <p className="allocation-info-inline">No prediction available.</p>
              ) : predictedResources ? (
                <>
                  <div className="prediction-grid">
                    <div className="prediction-card">
                      <span className="prediction-label">Food Needed</span>
                      <strong>{Number(predictedResources.foodNeeded || 0).toLocaleString()}</strong>
                      <span className="mt-1 block text-xs text-slate-500">Enough for {formatCoverageDays(allocatedDays)}</span>
                    </div>
                    <div className="prediction-card">
                      <span className="prediction-label">Water Needed</span>
                      <strong>{Number(predictedResources.waterNeeded || 0).toLocaleString()}</strong>
                      <span className="mt-1 block text-xs text-slate-500">Enough for {formatCoverageDays(allocatedDays)}</span>
                    </div>
                    <div className="prediction-card">
                      <span className="prediction-label">Medicine Needed</span>
                      <strong>{Number(predictedResources.medicineNeeded || 0).toLocaleString()}</strong>
                      <span className="mt-1 block text-xs text-slate-500">Enough for {formatCoverageDays(allocatedDays)}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    These recommendations are sized for {formatCoverageDays(allocatedDays)}.
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
              <h3>Requested Items</h3>

              {requestedItems.length > 0 && (
                <div className="requested-items-table mb-4 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="pb-2">Category</th>
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2">Size</th>
                        <th className="pb-2">Inventory Stock</th>
                        <th className="pb-2">Allocate</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestedItems.map((ref) => {
                        const stock = Number(ref.stock ?? 0);
                        const min = Number(ref.min ?? 0);
                        const status = getInventoryStatus(stock, min);
                        const toneClass =
                          status.tone === "good"
                            ? "bg-emerald-50 text-emerald-700"
                            : status.tone === "warning"
                              ? "bg-amber-50 text-amber-700"
                              : status.tone === "low"
                                ? "bg-orange-50 text-orange-700"
                                : "bg-rose-50 text-rose-700";

                        return (
                          <tr key={ref.inventoryItemId} className="border-t">
                            <td className="py-2 text-slate-700">{ref.category || "-"}</td>
                            <td className="py-2 font-medium text-slate-900">{ref.itemName}</td>
                            <td className="py-2 text-slate-700">{ref.packageSize || ref.unit || "units"}</td>
                            <td className="py-2 text-slate-700">{stock.toLocaleString()}</td>
                            <td className="py-2">
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={allocationQuantities[ref.inventoryItemId] || ""}
                                  onChange={(event) => handleQuantityChange(ref.inventoryItemId, event.target.value)}
                                  className={`${quantityErrors[ref.inventoryItemId] || (allocationQuantities[ref.inventoryItemId] !== "" && Number(allocationQuantities[ref.inventoryItemId] || 0) > stock)
                                    ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                                    : "border-slate-200"
                                  } w-full rounded border px-3 py-2`}
                                  placeholder="Allocated quantity"
                                />
                                {quantityErrors[ref.inventoryItemId] ? (
                                  <p className="text-xs font-medium text-rose-600">{quantityErrors[ref.inventoryItemId]}</p>
                                ) : null}
                                {allocationQuantities[ref.inventoryItemId] !== "" && Number(allocationQuantities[ref.inventoryItemId] || 0) > stock ? (
                                  <p className="text-xs font-medium text-rose-600">
                                    Quantity cannot exceed available stock ({stock}).
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${toneClass}`}>
                                {status.label} ({min > 0 ? `${stock}/${min}` : `${stock}`})
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {requestedItems.length === 0 && (
                <p className="allocation-info-inline">No specific items were requested for this report.</p>
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
