import React, { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, Warehouse, RefreshCw, Search } from "lucide-react";
import { adjustInventoryItem, createInventoryItem, fetchInventoryItems } from "../services/inventoryService";
import './Pages.css';

function getStatus(stock, min) {
  const safeMin = min > 0 ? min : 1;
  const ratio = stock / safeMin;
  if (ratio >= 1) return { label: "Good", color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning", color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low", color: "#ea580c", bg: "#ffedd5" };
  return { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function barColor(label) {
  return label === "Good" ? "#22c55e" : label === "Warning" ? "#f59e0b" : label === "Low" ? "#f97316" : "#ef4444";
}

const CATEGORIES = ["All", "Water", "Food", "Medical", "Shelter"];
const WAREHOUSES = ["Warehouse 1", "Warehouse 2", "Warehouse 3", "Warehouse 4", "Warehouse 5"];
const ADD_ITEM_CATEGORIES = ["Water", "Food", "Medical", "Shelter", "Other"];
const INITIAL_ADD_FORM = {
  name: "",
  category: "Water",
  customCategory: "",
  stock: "",
  min: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({ ...INITIAL_ADD_FORM });
  const [actionForm, setActionForm] = useState({ itemId: "", quantity: "", destination: WAREHOUSES[0] });
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [log, setLog] = useState([
    "Medicine Kits fell below minimum threshold.",
    "Tents stock updated - 40 units added.",
    "Blankets transferred to Warehouse 3.",
  ]);

  const loadInventory = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchInventoryItems();
      setItems(Array.isArray(response) ? response : []);
    } catch (error) {
      setItems([]);
      setErrorMessage(error.message || "Failed to load inventory items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const totalItems = items.length;
  const lowCount = items.filter((i) => i.stock < i.min).length;
  const hasItems = items.length > 0;

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (activeCat === "All" || i.category === activeCat) &&
          i.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, activeCat, search]
  );

  const addItemDraft = useMemo(() => {
    const name = String(form.name || "").trim();
    const selectedCategory = String(form.category || "").trim();
    const customCategory = String(form.customCategory || "").trim();
    const category = selectedCategory === "Other" ? customCategory : selectedCategory;

    const hasStockInput = String(form.stock || "").trim() !== "";
    const hasMinInput = String(form.min || "").trim() !== "";
    const stockValue = hasStockInput ? Number(form.stock) : Number.NaN;
    const minValue = hasMinInput ? Number(form.min) : Number.NaN;
    const stock = Number.isFinite(stockValue) ? Math.round(stockValue) : Number.NaN;
    const min = Number.isFinite(minValue) ? Math.round(minValue) : Number.NaN;

    let validationError = "";

    if (!name) {
      validationError = "Item name is required.";
    } else if (name.length < 2) {
      validationError = "Item name must be at least 2 characters.";
    } else if (!category) {
      validationError = "Category is required.";
    } else if (!Number.isInteger(stock) || stock < 0) {
      validationError = "Stock quantity must be a whole number greater than or equal to 0.";
    } else if (!Number.isInteger(min) || min < 0) {
      validationError = "Minimum threshold must be a whole number greater than or equal to 0.";
    }

    const duplicateName = items.some(
      (item) => String(item.name || "").trim().toLowerCase() === name.toLowerCase()
    );

    if (!validationError && duplicateName) {
      validationError = "An inventory item with this name already exists.";
    }

    return {
      name,
      category,
      stock,
      min,
      validationError,
      hasThresholdWarning:
        Number.isInteger(stock) && Number.isInteger(min) && min > stock,
      statusPreview:
        Number.isInteger(stock) && Number.isInteger(min) ? getStatus(stock, min) : null,
    };
  }, [form, items]);

  function openModal(type) {
    setErrorMessage("");
    setModal(type);

    if (type === "add") {
      setForm({ ...INITIAL_ADD_FORM });
      return;
    }

    setActionForm({
      itemId: items[0]?.id ? String(items[0].id) : "",
      quantity: "",
      destination: WAREHOUSES[0],
    });
  }

  async function handleAdd() {
    if (addItemDraft.validationError) {
      setErrorMessage(addItemDraft.validationError);
      return;
    }

    setErrorMessage("");
    setIsAddingItem(true);

    try {
      await createInventoryItem({
        name: addItemDraft.name,
        category: addItemDraft.category,
        stock: addItemDraft.stock,
        min: addItemDraft.min,
      });

      setLog((prev) => [`Added "${addItemDraft.name}" - ${addItemDraft.stock.toLocaleString()} units.`, ...prev]);
      setForm({ ...INITIAL_ADD_FORM });
      setModal(null);
      await loadInventory();
    } catch (error) {
      setErrorMessage(error.message || "Failed to add inventory item.");
    } finally {
      setIsAddingItem(false);
    }
  }

  function handleExport() {
    const rows = [
      "Item,Category,Stock,Min,Status",
      ...items.map((i) => `${i.name},${i.category},${i.stock},${i.min},${getStatus(i.stock, i.min).label}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = "inventory_report.csv";
    a.click();
  }

  async function handleStockAction(type) {
    const selected = items.find((entry) => String(entry.id) === String(actionForm.itemId));
    const quantity = Math.round(Number(actionForm.quantity));

    if (!selected) {
      setErrorMessage("Please select an inventory item.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage("Please enter a valid quantity greater than zero.");
      return;
    }

    let delta = 0;
    let reason = "manual_adjustment";
    let logMessage = "Stock updated";

    if (type === "adjust") {
      delta = -quantity;
      reason = "damage_adjustment";
      logMessage = `Damage adjustment for ${selected.name}: ${quantity} units reduced.`;
    }

    if (type === "transfer") {
      delta = -quantity;
      reason = `transfer_to_${String(actionForm.destination || "warehouse").replace(/\s+/g, "_").toLowerCase()}`;
      logMessage = `${selected.name} transferred to ${actionForm.destination}: ${quantity} units.`;
    }

    if (type === "donate") {
      delta = quantity;
      reason = "donation_received";
      logMessage = `Donation received for ${selected.name}: ${quantity} units added.`;
    }

    try {
      await adjustInventoryItem(selected.id, { delta, reason });
      setLog((prev) => [logMessage, ...prev]);
      setModal(null);
      await loadInventory();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update inventory stock.");
    }
  }

  return (
    <div className="inventory-page">

      {/* HEADER */}
      <div className="inventory-header">
        <h1>Inventory Management</h1>
        <p>Track and manage your disaster relief supplies</p>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* STATS */}
      <div className="inventory-stats">
        {[
          { icon: <Package size={16} color="#2563eb" />, bg: "#eff6ff", lbl: "Total Items", val: totalItems },
          { icon: <AlertTriangle size={16} color="#dc2626" />, bg: "#fef2f2", lbl: "Low Stock", val: lowCount },
          { icon: <Warehouse size={16} color="#16a34a" />, bg: "#f0fdf4", lbl: "Warehouses", val: 5 },
          { icon: <RefreshCw size={16} color="#7c3aed" />, bg: "#f5f3ff", lbl: "Recent Updates", val: log.length },
        ].map((s) => (
          <div className="stat-card" key={s.lbl}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-content">
              <h3>{s.lbl}</h3>
              <p>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONS AND FILTERS */}
      <div className="inventory-actions">
        <div className="filter-controls">
          <div className="search-input">
            <Search size={14} />
            <input
              placeholder="Search inventory items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="category-filters">
          {CATEGORIES.map((c) => (
            <button key={c} className={`category-btn${activeCat === c ? " active" : ""}`} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Minimum Required</th>
              <th>Stock Level</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Loading inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  No items found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const s = getStatus(item.stock, item.min);
                const safeMin = item.min > 0 ? item.min : 1;
                const pct = Math.min(100, Math.round((item.stock / safeMin) * 100));
                return (
                  <tr key={item.id}>
                    <td><span className="item-name">{item.name}</span></td>
                    <td><span className="category-badge">{item.category}</span></td>
                    <td><span className="stock-quantity">{item.stock.toLocaleString()}</span></td>
                    <td><span className="min-quantity">{item.min.toLocaleString()}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: barColor(s.label) }} />
                        </div>
                        <span className="progress-percentage">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.label.toLowerCase()}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          {[
            { label: "➕ Add New Item", class: "add", fn: () => openModal("add") },
            { label: "⚠ Update Stock", class: "adjust", fn: () => openModal("adjust") },
            { label: "↔ Transfer Items", class: "transfer", fn: () => openModal("transfer") },
            { label: "🎁 Record Donation", class: "donate", fn: () => openModal("donate") },
            { label: "📊 Export Report", class: "export", fn: handleExport },
            { label: "🔄 Refresh", class: "export", fn: loadInventory },
          ].map((a) => (
            <button key={a.label} className={`action-btn ${a.class}`} onClick={a.fn}>{a.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, textAlign: "center" }}>
          All actions are automatically logged for audit purposes.
        </p>
      </div>

      {/* ACTIVITY LOG */}
      <div className="activity-log">
        <h2>Recent Activity</h2>
        <div className="log-items">
          {log.slice(0, 5).map((entry, index) => <div key={index} className="log-item">{entry}</div>)}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="inventory-modal-overlay" onClick={() => setModal(null)}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>
                {modal === "add" && "➕ Add New Stock Item"}
                {modal === "adjust" && "⚠️ Adjust for Damage"}
                {modal === "transfer" && "↔️ Transfer Stock"}
                {modal === "donate" && "🎁 Apply Donation"}
              </h2>
              <button className="close-btn" onClick={() => setModal(null)}>×</button>
            </div>

            <div className="inventory-modal-body">
              {modal === "add" ? (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      placeholder="e.g. Bottled Water"
                      value={form.name}
                      maxLength={80}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      {ADD_ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {form.category === "Other" && (
                    <div className="form-group">
                      <label>Custom Category</label>
                      <input
                        placeholder="e.g. Hygiene"
                        value={form.customCategory}
                        maxLength={40}
                        onChange={(e) => setForm((prev) => ({ ...prev, customCategory: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={form.min}
                      onChange={(e) => setForm((prev) => ({ ...prev, min: e.target.value }))}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: "8px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      padding: "10px 12px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "#334155", fontWeight: 700 }}>
                      Initial Stock Preview
                    </p>
                    {addItemDraft.statusPreview ? (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: addItemDraft.statusPreview.color }}>
                        Status: {addItemDraft.statusPreview.label}
                      </p>
                    ) : (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                        Enter stock and minimum threshold to preview status.
                      </p>
                    )}
                    {addItemDraft.hasThresholdWarning && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#d97706" }}>
                        Minimum threshold is higher than current stock. This item will appear as low stock immediately.
                      </p>
                    )}
                    {addItemDraft.validationError && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#dc2626" }}>
                        {addItemDraft.validationError}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {!hasItems ? (
                    <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 20 }}>
                      No inventory items available. Add an item first.
                    </p>
                  ) : (
                    <>
                      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>This action will be logged in the activity feed.</p>
                      <div className="form-group">
                        <label>Select Item</label>
                        <select
                          value={actionForm.itemId}
                          onChange={(e) => setActionForm((prev) => ({ ...prev, itemId: e.target.value }))}
                        >
                          {items.map((i) => (
                            <option key={i.id} value={String(i.id)}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={actionForm.quantity}
                          onChange={(e) => setActionForm((prev) => ({ ...prev, quantity: e.target.value }))}
                        />
                      </div>
                      {modal === "transfer" && (
                        <div className="form-group">
                          <label>Destination Warehouse</label>
                          <select
                            value={actionForm.destination}
                            onChange={(e) => setActionForm((prev) => ({ ...prev, destination: e.target.value }))}
                          >
                            {WAREHOUSES.map((name) => <option key={name}>{name}</option>)}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="inventory-modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm"
                onClick={modal === "add" ? handleAdd : () => handleStockAction(modal)}
                disabled={
                  modal === "add"
                    ? Boolean(addItemDraft.validationError) || isAddingItem
                    : !hasItems
                }
              >
                {modal === "add" ? (isAddingItem ? "Adding..." : "Add Item") : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
