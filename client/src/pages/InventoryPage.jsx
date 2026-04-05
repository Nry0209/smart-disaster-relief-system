import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Warehouse,
  RefreshCw,
  AlertCircle,
  Download,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import {
  fetchInventory,
  fetchInventorySummary,
  fetchInventoryTransactions,
  fetchResourceRequests,
  createInventoryItem,
  adjustInventoryStock,
  transferInventoryStock,
  deleteInventoryItem,
  downloadInventoryCsv,
} from "../services/reliefApi";
import "./Pages.css";

const WAREHOUSES = ["Warehouse 1", "Warehouse 2", "Warehouse 3", "Warehouse 4", "Warehouse 5"];

const INITIAL_FORM = {
  name: "",
  category: "Water",
  stock: "",
  min: "",
  expiryDate: "",
  warehouseLocation: "Warehouse 1",
};

const INITIAL_ACTION_FORM = {
  itemId: "",
  quantity: "",
  fromWarehouseLocation: "Warehouse 1",
  toWarehouseLocation: "Warehouse 2",
  reason: "",
};

function getStatus(stock, min) {
  const safeStock = Number(stock) || 0;
  const safeMin = Number(min) || 0;

  if (safeMin <= 0) {
    return { label: safeStock > 0 ? "Good" : "Critical", color: "#16a34a", bg: "#dcfce7" };
  }

  const ratio = safeStock / safeMin;
  if (ratio >= 1) return { label: "Good", color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning", color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low", color: "#ea580c", bg: "#ffedd5" };
  return { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function barColor(label) {
  return label === "Good" ? "#22c55e" : label === "Warning" ? "#f59e0b" : label === "Low" ? "#f97316" : "#ef4444";
}

function getSeverityColor(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical": return { color: "#dc2626", bg: "#fee2e2" };
    case "high": return { color: "#ea580c", bg: "#ffedd5" };
    case "medium": return { color: "#d97706", bg: "#fef3c7" };
    case "low": return { color: "#16a34a", bg: "#dcfce7" };
    default: return { color: "#6b7280", bg: "#f3f4f6" };
  }
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({
    totalItems: 0,
    lowStockItems: 0,
    warehouses: 0,
    recentUpdates: 0,
  });
  const [resourceEvents, setResourceEvents] = useState([]);
  const [log, setLog] = useState([]);
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [actionForm, setActionForm] = useState(INITIAL_ACTION_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [inventoryResponse, summaryResponse, eventsResponse, transactionsResponse] = await Promise.all([
        fetchInventory(),
        fetchInventorySummary(),
        fetchResourceRequests(),
        fetchInventoryTransactions(10),
      ]);

      const inventoryItems = inventoryResponse.data || [];
      const summary = summaryResponse.data || {};
      const requests = eventsResponse.data || [];
      const transactions = transactionsResponse.data || [];

      setItems(inventoryItems);
      setInventorySummary({
        totalItems: summary.totalItems ?? inventoryItems.length,
        lowStockItems: summary.lowStockItems ?? inventoryItems.filter((item) => item.stock < item.min).length,
        warehouses: summary.warehouses ?? 0,
        recentUpdates: summary.recentUpdates ?? transactions.length,
      });
      setResourceEvents(
        requests.slice(0, 5).map((request) => {
          const firstItem = request.items?.[0];
          const totalQuantity = request.totalItemsRequested || request.items?.reduce((sum, item) => sum + (Number(item.quantityRequested) || 0), 0) || 0;

          return {
            id: request.requestCode || request.id,
            type: request.disasterType || request.requestType || "Request",
            severity: request.priority || request.urgency || "medium",
            requestedItem: firstItem?.itemName || "Multiple Items",
            quantity: totalQuantity,
          };
        })
      );
      setLog(
        transactions.slice(0, 5).map((transaction) => {
          const reason = transaction.reason ? ` - ${transaction.reason}` : "";
          return `${transaction.transactionType} ${transaction.quantity} ${transaction.itemName} at ${transaction.warehouseLocation}${reason}`;
        })
      );
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);

  const filtered = useMemo(
    () => items.filter((item) => {
      const categoryMatch = activeCat === "All" || item.category === activeCat;
      const searchMatch = item.name.toLowerCase().includes(search.toLowerCase());
      return categoryMatch && searchMatch;
    }),
    [items, activeCat, search]
  );

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(actionForm.itemId)) || null,
    [items, actionForm.itemId]
  );

  const selectedWarehouses = useMemo(() => {
    if (selectedItem?.stockLevels?.length) {
      return selectedItem.stockLevels.map((stockLevel) => stockLevel.warehouseLocation).filter(Boolean);
    }

    return WAREHOUSES;
  }, [selectedItem]);

  useEffect(() => {
    if ((modal === "adjust" || modal === "transfer" || modal === "remove") && items.length && !actionForm.itemId) {
      const firstItem = items[0];
      setActionForm((previous) => ({
        ...previous,
        itemId: String(firstItem.id),
        fromWarehouseLocation: firstItem.warehouseLocation || previous.fromWarehouseLocation,
        toWarehouseLocation: WAREHOUSES.find((warehouse) => warehouse !== firstItem.warehouseLocation) || previous.toWarehouseLocation,
      }));
    }
  }, [modal, items, actionForm.itemId]);

  const openModal = (nextModal) => {
    setNotice("");
    setModal(nextModal);
  };

  const closeModal = () => {
    setModal(null);
    setActionForm(INITIAL_ACTION_FORM);
    setForm(INITIAL_FORM);
  };

  const handleAdd = async () => {
    if (!form.name || !form.stock || !form.min) {
      return;
    }

    try {
      setSaving(true);
      await createInventoryItem({
        name: form.name,
        category: form.category,
        stock: Number(form.stock),
        min: Number(form.min),
        expiryDate: form.expiryDate,
        warehouseLocation: form.warehouseLocation,
      });
      setNotice(`Added ${form.name} successfully.`);
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to add item.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!actionForm.itemId || !actionForm.quantity || !actionForm.fromWarehouseLocation) {
      return;
    }

    try {
      setSaving(true);
      await adjustInventoryStock(actionForm.itemId, {
        warehouseLocation: actionForm.fromWarehouseLocation,
        quantity: Number(actionForm.quantity),
        transactionType: "OUT",
        reason: actionForm.reason || "Damage adjustment",
      });
      setNotice("Stock adjusted successfully.");
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!actionForm.itemId || !actionForm.quantity || !actionForm.fromWarehouseLocation || !actionForm.toWarehouseLocation) {
      return;
    }

    try {
      setSaving(true);
      await transferInventoryStock(actionForm.itemId, {
        fromWarehouseLocation: actionForm.fromWarehouseLocation,
        toWarehouseLocation: actionForm.toWarehouseLocation,
        quantity: Number(actionForm.quantity),
        reason: actionForm.reason || "Warehouse transfer",
      });
      setNotice("Stock transferred successfully.");
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to transfer stock.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!actionForm.itemId) {
      return;
    }

    try {
      setSaving(true);
      await deleteInventoryItem(actionForm.itemId);
      setNotice("Item removed successfully.");
      closeModal();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to remove item.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const csv = await downloadInventoryCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "inventory_report.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to export inventory.");
    }
  };

  return (
    <div className="inventory-page">
      <PageHeader
        role="Inventory Officer / Stock Management"
        title="Inventory Management"
        description="Track and manage your disaster relief supplies"
      />

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {notice && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46" }}>
          {notice}
        </div>
      )}

      <div className="inventory-stats">
        {[
          { icon: <Package size={16} color="#2563eb" />, bg: "#eff6ff", lbl: "Total Items", val: inventorySummary.totalItems },
          { icon: <AlertTriangle size={16} color="#dc2626" />, bg: "#fef2f2", lbl: "Low Stock", val: inventorySummary.lowStockItems },
          { icon: <Warehouse size={16} color="#16a34a" />, bg: "#f0fdf4", lbl: "Warehouses", val: inventorySummary.warehouses },
          { icon: <RefreshCw size={16} color="#7c3aed" />, bg: "#f5f3ff", lbl: "Recent Updates", val: inventorySummary.recentUpdates },
        ].map((stat) => (
          <div className="stat-card" key={stat.lbl}>
            <div className="stat-icon" style={{ background: stat.bg }}>{stat.icon}</div>
            <div className="stat-content">
              <h3>{stat.lbl}</h3>
              <p>{loading ? "..." : stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="disaster-events-section">
        <div className="section-header">
          <div className="section-title">
            <AlertCircle size={18} style={{ color: "#dc2626", marginRight: 8 }} />
            <h2>Recent Resource Requests</h2>
          </div>
          <span className="section-subtitle">Live requests from the backend</span>
        </div>

        <div className="disaster-events-table-container">
          <table className="disaster-events-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Disaster Type</th>
                <th>Priority</th>
                <th>Requested Item</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {resourceEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>
                    No resource requests found.
                  </td>
                </tr>
              ) : (
                resourceEvents.map((event) => {
                  const severityStyle = getSeverityColor(event.severity);

                  return (
                    <tr key={event.id}>
                      <td className="disaster-id">{event.id}</td>
                      <td className="disaster-type">{event.type}</td>
                      <td>
                        <span
                          className="severity-badge"
                          style={{
                            backgroundColor: severityStyle.bg,
                            color: severityStyle.color,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {String(event.severity).charAt(0).toUpperCase() + String(event.severity).slice(1)}
                        </span>
                      </td>
                      <td className="requested-item">{event.requestedItem}</td>
                      <td className="quantity">{Number(event.quantity || 0).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="inventory-actions">
        <div className="filter-controls">
          <div className="search-input">
            <Search size={14} />
            <input
              placeholder="Search inventory items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="category-filters">
          {categories.map((category) => (
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
              <th>Stock Level</th>
              <th>Status</th>
              <th>Expiry Date</th>
              <th>Warehouse Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  Loading inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                  No items found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const status = getStatus(item.stock, item.min);
                const percentage = item.min > 0 ? Math.min(100, Math.round((item.stock / item.min) * 100)) : 100;

                return (
                  <tr key={item.id}>
                    <td><span className="item-name">{item.name}</span></td>
                    <td><span className="category-badge">{item.category}</span></td>
                    <td><span className="stock-quantity">{Number(item.stock || 0).toLocaleString()}</span></td>
                    <td><span className="min-quantity">{Number(item.min || 0).toLocaleString()}</span></td>
                    <td>
                      <div className="progress-bar">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${percentage}%`, background: barColor(status.label) }} />
                        </div>
                        <span className="progress-percentage">{percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${status.label.toLowerCase()}`}>{status.label}</span>
                    </td>
                    <td><span className="expiry-date">{item.expiryDate || "-"}</span></td>
                    <td><span className="warehouse-location">{item.warehouseLocation || "-"}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          {[
            { label: "➕ Add New Item", class: "add", fn: () => openModal("add") },
            { label: "⚠ Update Stock", class: "adjust", fn: () => openModal("adjust") },
            { label: "↔ Transfer Items", class: "transfer", fn: () => openModal("transfer") },
            { label: "🗑 Remove Item", class: "remove", fn: () => openModal("remove") },
            { label: "⬇ Export Report", class: "export", fn: handleExport },
          ].map((action) => (
            <button key={action.label} className={`action-btn ${action.class}`} onClick={action.fn}>
              {action.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 16, textAlign: "center" }}>All actions are saved to the backend.</p>
      </div>

      <div className="activity-log">
        <h2>Recent Activity</h2>
        <div className="log-items">
          {log.length === 0 ? (
            <div className="log-item">No recent transactions available.</div>
          ) : (
            log.map((entry, index) => <div key={index} className="log-item">{entry}</div>)
          )}
        </div>
      </div>

      {modal && (
        <div className="inventory-modal-overlay" onClick={closeModal}>
          <div className="inventory-modal" onClick={(event) => event.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>
                {modal === "add" && "➕ Add New Stock Item"}
                {modal === "adjust" && "⚠️ Adjust Stock"}
                {modal === "transfer" && "↔️ Transfer Stock"}
                {modal === "remove" && "🗑️ Remove Item"}
              </h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="inventory-modal-body">
              {modal === "add" && (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input placeholder="e.g. Bottled Water" value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}>
                      {['Water', 'Food', 'Medical', 'Shelter'].map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" min="0" placeholder="0" value={form.stock} onChange={(event) => setForm((previous) => ({ ...previous, stock: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input type="number" min="0" placeholder="0" value={form.min} onChange={(event) => setForm((previous) => ({ ...previous, min: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input type="date" value={form.expiryDate} onChange={(event) => setForm((previous) => ({ ...previous, expiryDate: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Warehouse Location</label>
                    <select value={form.warehouseLocation} onChange={(event) => setForm((previous) => ({ ...previous, warehouseLocation: event.target.value }))}>
                      {WAREHOUSES.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}
                    </select>
                  </div>
                </>
              )}

              {modal === "adjust" && (
                <>
                  <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>This sends an outbound stock adjustment to the backend.</p>
                  <div className="form-group">
                    <label>Select Item</label>
                    <select value={actionForm.itemId} onChange={(event) => {
                      const nextItem = items.find((item) => String(item.id) === String(event.target.value));
                      setActionForm((previous) => ({
                        ...previous,
                        itemId: event.target.value,
                        fromWarehouseLocation: nextItem?.warehouseLocation || previous.fromWarehouseLocation,
                      }));
                    }}>
                      <option value="">Choose an item...</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Warehouse</label>
                    <select value={actionForm.fromWarehouseLocation} onChange={(event) => setActionForm((previous) => ({ ...previous, fromWarehouseLocation: event.target.value }))}>
                      {selectedWarehouses.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" placeholder="0" value={actionForm.quantity} onChange={(event) => setActionForm((previous) => ({ ...previous, quantity: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Reason</label>
                    <input placeholder="Damage, expiry, audit correction" value={actionForm.reason} onChange={(event) => setActionForm((previous) => ({ ...previous, reason: event.target.value }))} />
                  </div>
                </>
              )}

              {modal === "transfer" && (
                <>
                  <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Move stock between warehouses using the backend inventory API.</p>
                  <div className="form-group">
                    <label>Select Item</label>
                    <select value={actionForm.itemId} onChange={(event) => {
                      const nextItem = items.find((item) => String(item.id) === String(event.target.value));
                      setActionForm((previous) => ({
                        ...previous,
                        itemId: event.target.value,
                        fromWarehouseLocation: nextItem?.warehouseLocation || previous.fromWarehouseLocation,
                      }));
                    }}>
                      <option value="">Choose an item...</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Source Warehouse</label>
                    <select value={actionForm.fromWarehouseLocation} onChange={(event) => setActionForm((previous) => ({ ...previous, fromWarehouseLocation: event.target.value }))}>
                      {selectedWarehouses.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Destination Warehouse</label>
                    <select value={actionForm.toWarehouseLocation} onChange={(event) => setActionForm((previous) => ({ ...previous, toWarehouseLocation: event.target.value }))}>
                      {WAREHOUSES.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" placeholder="0" value={actionForm.quantity} onChange={(event) => setActionForm((previous) => ({ ...previous, quantity: event.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Reason</label>
                    <input placeholder="Warehouse balancing, redistribution" value={actionForm.reason} onChange={(event) => setActionForm((previous) => ({ ...previous, reason: event.target.value }))} />
                  </div>
                </>
              )}

              {modal === "remove" && (
                <>
                  <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 20, fontWeight: 700 }}>Warning: this action cannot be undone.</p>
                  <div className="form-group">
                    <label>Select Item to Remove</label>
                    <select value={actionForm.itemId} onChange={(event) => setActionForm((previous) => ({ ...previous, itemId: event.target.value }))}>
                      <option value="">Choose an item...</option>
                      {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  {selectedItem && (
                    <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, marginBottom: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#991b1b" }}>
                        You are about to remove: <strong>{selectedItem.name}</strong>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="inventory-modal-footer">
              <button className="btn-cancel" onClick={closeModal}>Cancel</button>
              <button
                className="btn-confirm"
                onClick={modal === "add" ? handleAdd : modal === "adjust" ? handleAdjust : modal === "transfer" ? handleTransfer : handleRemove}
                disabled={saving}
              >
                {saving ? "Saving..." : modal === "add" ? "Add Item" : modal === "adjust" ? "Adjust" : modal === "transfer" ? "Transfer" : "Remove Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}