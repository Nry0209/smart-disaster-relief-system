import React, { useEffect, useMemo, useState } from "react";
import { Search, Package, AlertTriangle, Warehouse, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import {
  fetchInventoryItems,
  fetchInventoryActivity,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryStock,
} from "../services/inventoryService";
import "./Pages.css";

const CATEGORY_OPTIONS = ["Water", "Food", "Medical", "Shelter", "Clothing", "Other"];

const DEFAULT_ITEM_FORM = {
  id: "",
  name: "",
  category: "Water",
  stock: "",
  min: "",
  warehouse: "Warehouse 1",
  unit: "units",
};

const DEFAULT_ACTION_FORM = {
  itemId: "",
  quantity: "",
  destinationWarehouse: "Warehouse 1",
  note: "",
};

const MAX_ITEM_NAME_LENGTH = 80;
const MIN_ITEM_NAME_LENGTH = 2;
const MIN_WAREHOUSE_LENGTH = 2;
const MAX_WAREHOUSE_LENGTH = 60;
const MIN_UNIT_LENGTH = 1;
const MAX_UNIT_LENGTH = 20;
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

function getModalTitle(modal) {
  if (modal === "add") return "Add New Stock Item";
  if (modal === "edit") return "Edit Stock Item";
  if (modal === "adjust") return "Adjust Stock";
  if (modal === "transfer") return "Transfer Stock";
  if (modal === "donate") return "Record Donation";
  return "Inventory Action";
}

function getModalSubmitLabel(modal) {
  if (modal === "add") return "Add Item";
  if (modal === "edit") return "Save Changes";
  if (modal === "adjust") return "Apply Adjustment";
  if (modal === "transfer") return "Record Transfer";
  if (modal === "donate") return "Record Donation";
  return "Confirm";
}

export default function InventoryPage() {
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
  const [notice, setNotice] = useState("");

  async function loadInventoryData(showLoader = true) {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [fetchedItems, fetchedActivity] = await Promise.all([
        fetchInventoryItems(),
        fetchInventoryActivity(25),
      ]);

      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      setActivityLog(Array.isArray(fetchedActivity) ? fetchedActivity : []);
      setError("");
    } catch (fetchError) {
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

    return items.filter((item) => {
      const matchesCategory = activeCat === "All" || item.category === activeCat;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.warehouse.toLowerCase().includes(query);

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
  }

  function openActionModal(type) {
    setModal(type);
    setActionForm({
      ...DEFAULT_ACTION_FORM,
      itemId: items[0]?.id || "",
    });
  }

  function openEditModal(item) {
    setModal("edit");
    setItemForm({
      id: item.id,
      name: item.name,
      category: item.category,
      stock: String(item.stock),
      min: String(item.min),
      warehouse: item.warehouse || "Warehouse 1",
      unit: item.unit || "units",
    });
  }

  async function handleSaveItem() {
    const normalizedName = itemForm.name.trim();
    const stock = Number(itemForm.stock);
    const min = Number(itemForm.min);
    const normalizedWarehouse = itemForm.warehouse.trim();
    const normalizedUnit = itemForm.unit.trim();

    const duplicateName = items.find(
      (item) =>
        item.name.trim().toLowerCase() === normalizedName.toLowerCase() &&
        String(item.id) !== String(itemForm.id || "")
    );

    if (!normalizedName) {
      setError("Item name is required.");
      return;
    }

    if (normalizedName.length < 2) {
      setError("Item name must be at least 2 characters.");
      return;
    }

    if (normalizedName.length > MAX_ITEM_NAME_LENGTH) {
      setError(`Item name cannot exceed ${MAX_ITEM_NAME_LENGTH} characters.`);
      return;
    }

    if (duplicateName) {
      setError("An inventory item with this name already exists.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(min) || min < 0) {
      setError("Stock and minimum values must be whole numbers (0 or greater).");
      return;
    }

    if (!normalizedWarehouse) {
      setError("Warehouse is required.");
      return;
    }

    if (normalizedWarehouse.length < MIN_WAREHOUSE_LENGTH) {
      setError(`Warehouse must be at least ${MIN_WAREHOUSE_LENGTH} characters.`);
      return;
    }

    if (normalizedWarehouse.length > MAX_WAREHOUSE_LENGTH) {
      setError(`Warehouse cannot exceed ${MAX_WAREHOUSE_LENGTH} characters.`);
      return;
    }

    if (!normalizedUnit) {
      setError("Unit is required.");
      return;
    }

    if (normalizedUnit.length < MIN_UNIT_LENGTH) {
      setError(`Unit must be at least ${MIN_UNIT_LENGTH} character.`);
      return;
    }

    if (normalizedUnit.length > MAX_UNIT_LENGTH) {
      setError(`Unit cannot exceed ${MAX_UNIT_LENGTH} characters.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: normalizedName,
        category: itemForm.category,
        stock,
        min,
        warehouse: normalizedWarehouse,
        unit: normalizedUnit,
      };

      if (modal === "edit") {
        await updateInventoryItem(itemForm.id, {
          ...payload,
          note: "Updated from inventory dashboard.",
          performedBy: "Inventory Officer",
        });
        setNotice("Inventory item updated successfully.");
      } else {
        await createInventoryItem({
          ...payload,
          performedBy: "Inventory Officer",
        });
        setNotice("Inventory item created successfully.");
      }

      await loadInventoryData(false);
      closeModal();
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Failed to save inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(item) {
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
    const quantity = Number(actionForm.quantity);
    const selectedItem = items.find((item) => item.id === actionForm.itemId);
    const normalizedNote = actionForm.note.trim();
    const normalizedDestination = actionForm.destinationWarehouse.trim();

    if (!actionForm.itemId) {
      setError("Please select an inventory item.");
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

    if (modal === "transfer" && !normalizedDestination) {
      setError("Destination warehouse is required for transfer.");
      return;
    }

    if (
      modal === "transfer" &&
      normalizedDestination.toLowerCase() === String(selectedItem.warehouse || "").trim().toLowerCase()
    ) {
      setError("Destination warehouse must be different from current warehouse.");
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

      if (modal === "donate") {
        payload.actionType = "donation";
      }

      if (modal === "transfer") {
        payload.actionType = "transfer";
        payload.destinationWarehouse = normalizedDestination;
      }

      await adjustInventoryStock(actionForm.itemId, payload);
      await loadInventoryData(false);
      closeModal();
      setError("");

      if (modal === "adjust") {
        setNotice("Stock adjustment recorded.");
      }

      if (modal === "donate") {
        setNotice("Donation entry recorded.");
      }

      if (modal === "transfer") {
        setNotice("Warehouse transfer recorded.");
      }
    } catch (actionError) {
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
      ["Item", "Category", "Stock", "Minimum", "Warehouse", "Unit", "Status"],
      ...filteredItems.map((item) => {
        const status = getStatus(item.stock, item.min).label;
        return [item.name, item.category, item.stock, item.min, item.warehouse, item.unit, status];
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

  const isActionModal = modal === "adjust" || modal === "transfer" || modal === "donate";

  return (
    <div className="inventory-page">
      <PageHeader
        role="Inventory Officer / Stock Management"
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
          <div className="search-input">
            <Search size={14} />
            <input
              placeholder="Search by item name, category, warehouse"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="category-btn"
            onClick={() => loadInventoryData(false)}
            disabled={isSaving}
          >
            Refresh
          </button>
        </div>

        <div className="category-filters">
          {categoryFilters.map((category) => (
            <button
              key={category}
              className={`category-btn${activeCat === category ? " active" : ""}`}
              onClick={() => setActiveCat(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Minimum Required</th>
              <th>Warehouse</th>
              <th>Stock Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Loading inventory data...
                </td>
              </tr>
            )}

            {!isLoading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
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
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn add" onClick={() => setModal("add")}>Add New Item</button>
          <button className="action-btn adjust" onClick={() => openActionModal("adjust")}>Update Stock</button>
          <button className="action-btn transfer" onClick={() => openActionModal("transfer")}>Transfer Items</button>
          <button className="action-btn donate" onClick={() => openActionModal("donate")}>Record Donation</button>
          <button className="action-btn export" onClick={handleExport}>Export Report</button>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, textAlign: "center" }}>
          Inventory actions are persisted and tracked in activity logs.
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

      {modal && (
        <div className="inventory-modal-overlay" onClick={closeModal}>
          <div className="inventory-modal" onClick={(event) => event.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>{getModalTitle(modal)}</h2>
              <button className="close-btn" onClick={closeModal}>x</button>
            </div>

            <div className="inventory-modal-body">
              {(modal === "add" || modal === "edit") && (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      placeholder="e.g. Bottled Water"
                      value={itemForm.name}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, name: event.target.value }))}
                      minLength={MIN_ITEM_NAME_LENGTH}
                      maxLength={MAX_ITEM_NAME_LENGTH}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={itemForm.category}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Current Stock</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={itemForm.stock}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, stock: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={itemForm.min}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, min: event.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Warehouse</label>
                    <input
                      value={itemForm.warehouse}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, warehouse: event.target.value }))}
                      minLength={MIN_WAREHOUSE_LENGTH}
                      maxLength={MAX_WAREHOUSE_LENGTH}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      value={itemForm.unit}
                      onChange={(event) => setItemForm((prev) => ({ ...prev, unit: event.target.value }))}
                      minLength={MIN_UNIT_LENGTH}
                      maxLength={MAX_UNIT_LENGTH}
                    />
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

                  {items.length > 0 && (
                    <>
                      <div className="form-group">
                        <label>Select Item</label>
                        <select
                          value={actionForm.itemId}
                          onChange={(event) => setActionForm((prev) => ({ ...prev, itemId: event.target.value }))}
                        >
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.stock} units)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={actionForm.quantity}
                          onChange={(event) => setActionForm((prev) => ({ ...prev, quantity: event.target.value }))}
                        />
                      </div>

                      {modal === "transfer" && (
                        <div className="form-group">
                          <label>Destination Warehouse</label>
                          <input
                            value={actionForm.destinationWarehouse}
                            onChange={(event) =>
                              setActionForm((prev) => ({ ...prev, destinationWarehouse: event.target.value }))
                            }
                            minLength={MIN_WAREHOUSE_LENGTH}
                            maxLength={MAX_WAREHOUSE_LENGTH}
                          />
                        </div>
                      )}

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
                          Selected: {selectedActionItem.name} | Stock: {selectedActionItem.stock} | Warehouse: {selectedActionItem.warehouse}
                        </p>
                      )}
                    </>
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
          </div>
        </div>
      )}
    </div>
  );
}
