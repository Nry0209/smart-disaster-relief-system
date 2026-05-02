import React, { useEffect, useMemo, useState } from "react";
import { Search, Package, AlertTriangle, Warehouse, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import {
  fetchInventoryItems,
  fetchInventoryActivity,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
} from "../services/inventoryService";
import { ITEM_CATEGORY_LIST, ITEM_CATEGORIES, ITEM_MAPPING } from "../utils/constants";
import "./Pages.css";

const CATEGORY_OPTIONS = [...ITEM_CATEGORY_LIST, "Other"];

// Warehouse options
const WAREHOUSE_OPTIONS = [
  "Colombo Central Warehouse",
  "Kandy Regional Warehouse"
];

  const DEFAULT_ITEM_FORM = {
  id: "",
  name: "",
  category: ITEM_CATEGORIES.DRINKING_WATER,
    packageSize: "",
  stock: "",
  min: "",
  warehouse: "Kandy Regional Warehouse",
};

const DEFAULT_ACTION_FORM = {
  itemId: "",
  quantity: "",
  destinationWarehouse: "Colombo Central Warehouse",
  note: "",
};

const MAX_ITEM_NAME_LENGTH = 80;
const MIN_ITEM_NAME_LENGTH = 2;
const MIN_WAREHOUSE_LENGTH = 2;
const MAX_WAREHOUSE_LENGTH = 60;
const MAX_ACTION_NOTE_LENGTH = 300;

function getStatus(stock, min) {
  if (min <= 0) {
    return { label: "Good", color: "#16a34a", bg: "#dcfce7" };
  }

  const ratio = stock / min;
  if (ratio >= 1) return { label: "Good", color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning", color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low", color: "#ea580c", bg: "#ffedd5" };
  return { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function barColor(label) {
  return label === "Good"
    ? "#22c55e"
    : label === "Warning"
      ? "#f59e0b"
      : label === "Low"
        ? "#f97316"
        : "#ef4444";
}

function formatActivityEntry(activity) {
  const ACTION_LABELS = {
    create: "Created",
    update: "Updated",
    adjust: "Adjusted",
    donation: "Donation",
    transfer: "Transferred",
    consume: "Consumed",
    restock: "Restocked",
    delete: "Deleted",
  };

  const actionLabel = ACTION_LABELS[activity.action] || "Updated";
  const quantity = Number(activity.quantity) || 0;
  const quantityLabel = quantity > 0 ? `+${quantity}` : `${quantity}`;
  const when = activity.createdAt
    ? new Date(activity.createdAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "just now";

  return `${actionLabel} ${activity.itemName} (${quantityLabel} units) - ${when}`;
}

function formatInventoryLabel(item) {
  const packageSize = String(item?.packageSize || "").trim();
  const unit = String(item?.unit || "").trim();
  const labelParts = [packageSize, unit].filter(Boolean);
  return labelParts.length ? `${item.name} (${labelParts.join(" ")})` : item.name;
}

function getModalTitle(modal) {
  if (modal === "add") return "Add New Stock Item";
  if (modal === "edit") return "Edit Stock Item";
  if (modal === "adjust") return "Update Stock";
  return "Inventory Action";
}

function getModalSubmitLabel(modal) {
  if (modal === "add") return "Add Item";
  if (modal === "edit") return "Save Changes";
  if (modal === "adjust") return "Apply Adjustment";
  return "Confirm";
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [itemForm, setItemForm] = useState(DEFAULT_ITEM_FORM);
  const [actionForm, setActionForm] = useState(DEFAULT_ACTION_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");
  const canManageInventory = user?.role === "admin" || user?.role === "inventory_officer";
  const pageRoleLabel = canManageInventory
    ? "Inventory Officer / Stock Management"
    : user?.role === "ngo_partner"
      ? "NGO Partner / Inventory Access"
      : "Staff / Inventory Access";

  async function loadInventoryData(showLoader = true) {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [fetchedItems, fetchedActivity] = await Promise.all([
        fetchInventoryItems(),
        fetchInventoryActivity(25),
      ]);

      console.log('Fetched items:', fetchedItems);
      console.log('Fetched activity:', fetchedActivity);
      
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      setActivityLog(Array.isArray(fetchedActivity) ? fetchedActivity : []);
      setError("");
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      setError(fetchError.message || "Failed to load inventory data.");
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadInventoryData(true);
  }, []);

  const categoryFilters = useMemo(() => {
    const existing = items.map((item) => item.category).filter(Boolean);
    return ["All", ...new Set([...CATEGORY_OPTIONS, ...existing])];
  }, [items]);

  useEffect(() => {
    if (!categoryFilters.includes(activeCat)) {
      setActiveCat("All");
    }
  }, [activeCat, categoryFilters]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeCategory = String(activeCat || "").trim().toLowerCase();

    return items.filter((item) => {
      const itemCategory = String(item.category || "").trim();
      const itemName = String(item.name || "");
      const itemWarehouse = String(item.warehouse || "");
      const matchesCategory = activeCategory === "all" || itemCategory.toLowerCase() === activeCategory;
      const matchesSearch =
        !query ||
        itemName.toLowerCase().includes(query) ||
        itemCategory.toLowerCase().includes(query) ||
        itemWarehouse.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, activeCat, search]);

  const selectedActionItem = useMemo(
    () => items.find((item) => item.id === actionForm.itemId) || null,
    [items, actionForm.itemId]
  );

  const totalItems = items.length;
  const lowCount = items.filter((item) => item.stock < item.min).length;
  const warehouseCount = new Set(items.map((item) => item.warehouse)).size;

  function closeModal() {
    setModal(null);
    setItemForm(DEFAULT_ITEM_FORM);
    setActionForm(DEFAULT_ACTION_FORM);
    setFieldErrors({});
  }

  function openActionModal(type) {
    if (type === "adjust") {
      navigate("/inventory/adjust");
    }
  }

  function openEditModal(item) {
    navigate(`/inventory/${item.id}/edit`);
  }

  // Auto-fill minimum threshold based on existing data
  const getAutoFillMinThreshold = (category, itemName) => {
    const existingItem = items.find(
      (item) => item.category === category && item.name === itemName
    );
    return existingItem ? String(existingItem.min) : "";
  };

  async function handleSaveItem() {
    if (!canManageInventory) {
      setError("You can only view inventory items.");
      return;
    }

    setFieldErrors({});

    const normalizedName = itemForm.name.trim();
    const normalizedPackageSize = String(itemForm.packageSize || "").trim();
    const stock = Number(itemForm.stock);
    const min = Number(itemForm.min);
    const normalizedWarehouse = itemForm.warehouse.trim();
    const nextFieldErrors = {};

    if (!normalizedName) {
      nextFieldErrors.name = "Item name is required.";
    }

    if (!itemForm.category) {
      nextFieldErrors.category = "Category is required.";
    }

    if (normalizedName.length < 2) {
      nextFieldErrors.name = "Item name must be at least 2 characters.";
    }

    if (normalizedName.length > MAX_ITEM_NAME_LENGTH) {
      nextFieldErrors.name = `Item name cannot exceed ${MAX_ITEM_NAME_LENGTH} characters.`;
    }

    if (!normalizedPackageSize) {
      nextFieldErrors.packageSize = "Measure is required.";
    }

    // Find existing item with same name, package size, unit, and category
    const existingItem = items.find(
      (item) =>
        item.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
        item.category === itemForm.category &&
        String(item.packageSize || "").trim().toLowerCase() === normalizedPackageSize.toLowerCase()
    );

    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(min) || min < 0) {
      nextFieldErrors.stock = "Stock must be a whole number (0 or greater).";
      nextFieldErrors.min = "Minimum must be a whole number (0 or greater).";
    }

    if (!Number.isInteger(stock) || stock < 0) {
      nextFieldErrors.stock = "Stock must be a whole number (0 or greater).";
    }

    if (!Number.isInteger(min) || min < 0) {
      nextFieldErrors.min = "Minimum must be a whole number (0 or greater).";
    }

    if (normalizedWarehouse.length < MIN_WAREHOUSE_LENGTH) {
      nextFieldErrors.warehouse = `Warehouse must be at least ${MIN_WAREHOUSE_LENGTH} characters.`;
    }

    if (normalizedWarehouse.length > MAX_WAREHOUSE_LENGTH) {
      nextFieldErrors.warehouse = `Warehouse cannot exceed ${MAX_WAREHOUSE_LENGTH} characters.`;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    setIsSaving(true);

    try {
      if (existingItem && modal === "add") {
        // Update existing item stock instead of creating duplicate
        const newStock = existingItem.stock + stock;
        await updateInventoryItem(existingItem.id, {
          stock: newStock,
          note: `Stock increased by ${stock} units from manual inventory addition.`,
          performedBy: "Inventory Officer",
        });
        setNotice(`${normalizedName} stock updated successfully. Added ${stock} units.`);
      } else if (modal === "edit") {
        const payload = {
          name: normalizedName,
          category: itemForm.category,
          packageSize: normalizedPackageSize,
          stock,
          min,
          warehouse: normalizedWarehouse,
        };
        await updateInventoryItem(itemForm.id, {
          ...payload,
          note: "Updated from inventory dashboard.",
          performedBy: "Inventory Officer",
        });
        setNotice("Inventory item updated successfully.");
      } else {
        // Create new item
        await createInventoryItem({
          name: normalizedName,
          category: itemForm.category,
          packageSize: normalizedPackageSize,
          stock,
          min,
          warehouse: normalizedWarehouse,
          performedBy: "Inventory Officer",
        });
        setNotice("Inventory item created successfully.");
      }

      console.log('About to reload inventory data after save...');
      await loadInventoryData(false);
      console.log('Inventory data reloaded, closing modal...');
      closeModal();
      setError("");
    } catch (saveError) {
      console.error('Save error:', saveError);
      setError(saveError.message || "Failed to save inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(item) {
    if (!canManageInventory) {
      setError("You can only view inventory items.");
      return;
    }

    const shouldDelete = window.confirm(`Delete ${item.name} from inventory?`);
    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    try {
      await deleteInventoryItem(item.id);
      setNotice(`${item.name} deleted from inventory.`);
      setError("");
      await loadInventoryData(false);
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApplyAction() {
    if (!canManageInventory) {
      setError("You can only view inventory items.");
      return;
    }

    const quantity = Number(actionForm.quantity);
    const selectedItem = items.find((item) => item.name === actionForm.itemId && item.category === actionForm.category);
    const normalizedNote = actionForm.note.trim();

    if (!actionForm.itemId || !actionForm.category) {
      setError("Please select a category and item.");
      return;
    }

    if (!selectedItem) {
      setError("Selected inventory item is no longer available. Refresh and try again.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Invalid count. Quantity cannot be negative.");
      return;
    }

    if (quantity === 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (normalizedNote.length > MAX_ACTION_NOTE_LENGTH) {
      setError(`Notes cannot exceed ${MAX_ACTION_NOTE_LENGTH} characters.`);
      return;
    }

    if (modal === "adjust" && quantity > Number(selectedItem.stock || 0)) {
      setError(`Cannot adjust ${quantity}. Available stock for ${selectedItem.name} is ${selectedItem.stock}.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        quantity,
        note: normalizedNote || undefined,
        performedBy: "Inventory Officer",
      };

      if (modal === "adjust") {
        payload.actionType = "adjust";
      }

      console.log('About to adjust stock for item:', selectedItem.id);
      await adjustInventoryStock(selectedItem.id, payload);
      console.log('Stock adjusted, about to reload inventory data...');
      await loadInventoryData(false);
      console.log('Inventory data reloaded after stock adjustment, closing modal...');
      closeModal();
      setError("");

      if (modal === "adjust") {
        setNotice("Stock adjustment recorded.");
      }
    } catch (actionError) {
      console.error('Action error:', actionError);
      setError(actionError.message || "Failed to apply inventory action.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleExport() {
    if (!filteredItems.length) {
      setError("No inventory rows available to export.");
      return;
    }

    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ["Item", "Category", "Stock", "Minimum", "Warehouse", "Status"],
      ...filteredItems.map((item) => {
        const status = getStatus(item.stock, item.min).label;
        return [item.name, item.category, item.stock, item.min, item.warehouse, status];
      }),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_report.csv";
    link.click();

    URL.revokeObjectURL(url);
    setError("");
  }

  const isActionModal = modal === "adjust";

  return (
    <div className="inventory-page">
      <PageHeader
        role={pageRoleLabel}
        title="Inventory Management"
        description="Track stock, apply operational updates, and keep the allocation pipeline supplied"
      />

      {error && <div className="inventory-inline-alert error">{error}</div>}
      {notice && <div className="inventory-inline-alert success">{notice}</div>}

      <div className="inventory-stats">
        {[
          { icon: <Package size={16} color="#2563eb" />, bg: "#eff6ff", lbl: "Total Items", val: totalItems },
          { icon: <AlertTriangle size={16} color="#dc2626" />, bg: "#fef2f2", lbl: "Low Stock", val: lowCount },
          { icon: <Warehouse size={16} color="#16a34a" />, bg: "#f0fdf4", lbl: "Warehouses", val: warehouseCount },
          { icon: <RefreshCw size={16} color="#7c3aed" />, bg: "#f5f3ff", lbl: "Recent Updates", val: activityLog.length },
        ].map((stat) => (
          <div className="stat-card" key={stat.lbl}>
            <div className="stat-icon" style={{ background: stat.bg }}>{stat.icon}</div>
            <div className="stat-content">
              <h3>{stat.lbl}</h3>
              <p>{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="inventory-actions">
        <div className="filter-controls">
          <div className="filter-dropdown">
            <label>Filter by Category:</label>
            <select
              value={activeCat}
              onChange={(event) => setActiveCat(event.target.value)}
              className="category-dropdown"
            >
              {categoryFilters.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Measure</th>
              <th>Stock</th>
              <th>Minimum</th>
              <th>Warehouse</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Loading inventory data...
                </td>
              </tr>
            )}

            {!isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No inventory items found for the selected filters.
                </td>
              </tr>
            )}

            {!isLoading &&
              filteredItems.map((item) => {
                const status = getStatus(item.stock, item.min);
                const percentage = item.min <= 0 ? 100 : Math.min(100, Math.round((item.stock / item.min) * 100));

                return (
                  <tr key={item.id}>
                    <td><span className="item-name">{item.name}</span></td>
                    <td><span className="category-badge">{item.category}</span></td>
                    <td><span className="min-quantity">{[item.packageSize, item.unit].filter(Boolean).join(" ") || "-"}</span></td>
                    <td><span className="stock-quantity">{item.stock.toLocaleString()}</span></td>
                    <td><span className="min-quantity">{item.min.toLocaleString()}</span></td>
                    <td><span className="min-quantity">{item.warehouse}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${percentage}%`, background: barColor(status.label) }}
                          />
                        </div>
                        <span className="progress-percentage">{percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${status.label.toLowerCase()}`}>{status.label}</span>
                    </td>
                    <td>
                      {canManageInventory ? (
                        <div className="inventory-row-actions">
                          <button
                            type="button"
                            className="inventory-row-btn edit"
                            onClick={() => openEditModal(item)}
                            disabled={isSaving}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inventory-row-btn delete"
                            onClick={() => handleDeleteItem(item)}
                            disabled={isSaving}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="quick-actions">
        <h2>{canManageInventory ? "Quick Actions" : "Inventory View"}</h2>
        <div className="action-buttons">
          {canManageInventory && <button className="action-btn add" onClick={() => navigate("/inventory/new")}>Add New Item</button>}
          {canManageInventory && <button className="action-btn adjust" onClick={() => openActionModal("adjust")}>Remove</button>}
          <button className="action-btn export" onClick={handleExport}>Export Report</button>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, textAlign: "center" }}>
          {canManageInventory
            ? "Inventory actions are persisted and tracked in activity logs."
            : "Read-only access for registered staff and NGO accounts."}
        </p>
      </div>

      <div className="activity-log">
        <h2>Recent Activity</h2>
        <div className="log-items">
          {activityLog.length === 0 && <div className="log-item">No activity yet.</div>}
          {activityLog.slice(0, 8).map((entry) => (
            <div key={entry.id} className="log-item">{formatActivityEntry(entry)}</div>
          ))}
        </div>
      </div>

      {canManageInventory && modal && (
        <section
          className="inventory-modal mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
          style={{ width: "100%", maxWidth: "none", maxHeight: "none" }}
        >
          <div className="inventory-modal-header">
              <h2>{getModalTitle(modal)}</h2>
              <button className="close-btn" onClick={closeModal}>x</button>
            </div>

            <div className="inventory-modal-body">
              {error && <div className="inventory-inline-alert error">{error}</div>}
              {(modal === "add" || modal === "edit") && (
                <>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={itemForm.category}
                      onChange={(event) => {
                        const newCategory = event.target.value;
                        setFieldErrors((prev) => ({ ...prev, category: "" }));
                        setItemForm((prev) => ({
                          ...prev,
                          category: newCategory,
                          name: ""
                        }));
                      }}
                      className={fieldErrors.category ? "border border-rose-300 bg-rose-50/60" : ""}
                    >
                      <option value="">Select category</option>
                      {Object.values(ITEM_CATEGORIES).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {fieldErrors.category && <p className="mt-1 text-xs text-rose-600">{fieldErrors.category}</p>}
                  </div>
                  <div className="form-group">
                    <label>Item Name</label>
                    <select
                      value={itemForm.name}
                      onChange={(event) => {
                        const itemName = event.target.value;
                        const autoFillMin = getAutoFillMinThreshold(itemForm.category, itemName);
                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                        setItemForm((prev) => ({ 
                          ...prev, 
                          name: itemName,
                          min: autoFillMin
                        }));
                      }}
                      disabled={!itemForm.category}
                      className={fieldErrors.name ? "border border-rose-300 bg-rose-50/60" : ""}
                    >
                      <option value="">Select item</option>
                      {itemForm.category && ITEM_MAPPING[itemForm.category]?.map((itemName) => (
                        <option key={itemName} value={itemName}>{itemName}</option>
                      ))}
                    </select>
                    {fieldErrors.name && <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>}
                  </div>
                  <div className="form-group">
                    <label>Measure</label>
                    <input
                      type="text"
                      value={itemForm.packageSize || ""}
                      onChange={(event) => {
                        setFieldErrors((prev) => ({ ...prev, packageSize: "" }));
                        setItemForm((prev) => ({ ...prev, packageSize: event.target.value }));
                      }}
                      placeholder="e.g. 5 kg bottle, 1 L, 10 tablets"
                      className={fieldErrors.packageSize ? "border border-rose-300 bg-rose-50/60" : ""}
                    />
                    {fieldErrors.packageSize && <p className="mt-1 text-xs text-rose-600">{fieldErrors.packageSize}</p>}
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={itemForm.stock}
                      onChange={(event) => {
                        setFieldErrors((prev) => ({ ...prev, stock: "" }));
                        setItemForm((prev) => ({ ...prev, stock: event.target.value }));
                      }}
                      className={fieldErrors.stock ? "border border-rose-300 bg-rose-50/60" : ""}
                    />
                    {fieldErrors.stock && <p className="mt-1 text-xs text-rose-600">{fieldErrors.stock}</p>}
                  </div>
                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={itemForm.min}
                      onChange={(event) => {
                        setFieldErrors((prev) => ({ ...prev, min: "" }));
                        setItemForm((prev) => ({ ...prev, min: event.target.value }));
                      }}
                      className={fieldErrors.min ? "border border-rose-300 bg-rose-50/60" : ""}
                    />
                    {fieldErrors.min && <p className="mt-1 text-xs text-rose-600">{fieldErrors.min}</p>}
                  </div>
                  <div className="form-group">
                    <label>Warehouse</label>
                    <select
                      value={itemForm.warehouse}
                      onChange={(event) => {
                        setFieldErrors((prev) => ({ ...prev, warehouse: "" }));
                        setItemForm((prev) => ({ ...prev, warehouse: event.target.value }));
                      }}
                      className={fieldErrors.warehouse ? "border border-rose-300 bg-rose-50/60" : ""}
                    >
                      {WAREHOUSE_OPTIONS.map((warehouse) => (
                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                      ))}
                    </select>
                    {fieldErrors.warehouse && <p className="mt-1 text-xs text-rose-600">{fieldErrors.warehouse}</p>}
                  </div>
                </>
              )}

              {isActionModal && (
                <>
                  {!items.length && (
                    <p style={{ fontSize: 14, color: "#64748b" }}>
                      Add at least one inventory item before applying this action.
                    </p>
                  )}

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={actionForm.category || ""}
                      onChange={(event) => {
                        const newCategory = event.target.value;
                        setActionForm(prev => ({ 
                          ...prev, 
                          category: newCategory,
                          itemId: "" // Reset item selection when category changes
                        }));
                      }}
                    >
                      <option value="">Select category</option>
                      {Object.values(ITEM_CATEGORIES).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Select Item</label>
                    <select
                      value={actionForm.itemId}
                      onChange={(event) => setActionForm((prev) => ({ ...prev, itemId: event.target.value }))}
                      disabled={!actionForm.category}
                    >
                      <option value="">Select item</option>
                      {actionForm.category && ITEM_MAPPING[actionForm.category]?.map(itemName => (
                        <option key={itemName} value={itemName}>{itemName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={actionForm.quantity}
                      onChange={(event) => setActionForm((prev) => ({ ...prev, quantity: event.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      placeholder="Optional notes for audit trail"
                      value={actionForm.note}
                      onChange={(event) => setActionForm((prev) => ({ ...prev, note: event.target.value }))}
                      maxLength={MAX_ACTION_NOTE_LENGTH}
                    />
                  </div>

                  {selectedActionItem && (
                    <p style={{ fontSize: 13, color: "#64748b" }}>
                      Selected: {formatInventoryLabel(selectedActionItem)} | Stock: {selectedActionItem.stock} | Warehouse: {selectedActionItem.warehouse}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="inventory-modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>

              {(modal === "add" || modal === "edit") && (
                <button className="btn-confirm" onClick={handleSaveItem} disabled={isSaving}>
                  {isSaving ? "Saving..." : getModalSubmitLabel(modal)}
                </button>
              )}

              {isActionModal && (
                <button
                  className="btn-confirm"
                  onClick={handleApplyAction}
                  disabled={isSaving || !items.length}
                >
                  {isSaving ? "Processing..." : getModalSubmitLabel(modal)}
                </button>
              )}
            </div>
        </section>
      )}
    </div>
  );
}
