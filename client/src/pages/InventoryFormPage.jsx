import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { createInventoryItem, fetchInventoryItems, updateInventoryItem, adjustInventoryStock } from "../services/inventoryService";
import { ITEM_CATEGORIES, ITEM_MAPPING } from "../utils/constants";
import "./Pages.css";

const WAREHOUSE_OPTIONS = ["Colombo Central Warehouse", "Kandy Regional Warehouse"];

const DEFAULT_FORM = {
  category: ITEM_CATEGORIES.DRINKING_WATER,
  itemName: "",
  packageSize: "",
  stock: "",
  min: "",
  warehouse: WAREHOUSE_OPTIONS[1],
  quantity: "",
  note: "",
};

function getTitle(mode) {
  if (mode === "edit") return "Edit Stock Item";
  if (mode === "adjust") return "Adjust Stock";
  return "Add New Stock Item";
}

function getDescription(mode) {
  if (mode === "edit") return "Update the inventory record on its own page.";
  if (mode === "adjust") return "Record a stock change without using a popup.";
  return "Create a new inventory item on its own page.";
}

export default function InventoryFormPage({ mode = "create" }) {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const isEdit = mode === "edit";
  const isAdjust = mode === "adjust";

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const inlineInputClass = (hasError) =>
    hasError
      ? "border border-rose-300 bg-rose-50/60"
      : "border border-slate-200";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const fetchedItems = await fetchInventoryItems();
        const normalizedItems = Array.isArray(fetchedItems) ? fetchedItems : [];
        setItems(normalizedItems);

        if (isEdit) {
          const target = normalizedItems.find((entry) => String(entry.id || entry._id) === String(itemId));
          if (!target) {
            throw new Error("Inventory item not found.");
          }

          setForm({
            category: target.category || ITEM_CATEGORIES.DRINKING_WATER,
            itemName: target.name || "",
            packageSize: target.packageSize || target.unit || "",
            stock: String(target.stock ?? ""),
            min: String(target.min ?? ""),
            warehouse: target.warehouse || WAREHOUSE_OPTIONS[1],
            quantity: "",
            note: "",
          });
        } else {
          setForm(DEFAULT_FORM);
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load inventory data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isEdit, itemId, mode]);

  const itemOptions = useMemo(() => {
    const base = [...(ITEM_MAPPING[form.category] || [])];
    if (form.itemName && !base.includes(form.itemName)) {
      base.unshift(form.itemName);
    }
    return base;
  }, [form.category, form.itemName]);

  const selectedItems = useMemo(
    () => items.filter((entry) => !form.category || entry.category === form.category),
    [items, form.category]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    const normalizedName = String(form.itemName || "").trim();
    const normalizedPackageSize = String(form.packageSize || "").trim();
    const normalizedCategory = String(form.category || "").trim();
    const normalizedWarehouse = String(form.warehouse || "").trim();
    const nextFieldErrors = {};

    if (isAdjust) {
      const quantity = Number(form.quantity);
      const selectedItem = items.find(
        (entry) => String(entry.name || "").trim().toLowerCase() === normalizedName.toLowerCase() && entry.category === normalizedCategory
      );

      if (!normalizedCategory || !normalizedName) {
        if (!normalizedCategory) nextFieldErrors.category = "Category is required.";
        if (!normalizedName) nextFieldErrors.itemName = "Item is required.";
        setFieldErrors(nextFieldErrors);
        setError("Please fix highlighted fields.");
        return;
      }

      if (!selectedItem) {
        setError("Selected inventory item is no longer available.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        nextFieldErrors.quantity = "Quantity must be at least 1.";
        setFieldErrors(nextFieldErrors);
        setError("Please fix highlighted fields.");
        return;
      }

      if (quantity > Number(selectedItem.stock || 0)) {
        setError(`Cannot remove ${quantity}. Available stock for ${selectedItem.name} is ${selectedItem.stock}.`);
        return;
      }

      setSaving(true);
      try {
        await adjustInventoryStock(selectedItem.id || selectedItem._id, {
          quantity,
          note: String(form.note || "").trim() || undefined,
          actionType: "adjust",
          performedBy: "Inventory Officer",
        });
        navigate("/inventory", { replace: true });
      } catch (saveError) {
        setError(saveError.message || "Failed to record stock adjustment.");
      } finally {
        setSaving(false);
      }

      return;
    }

    const stock = Number(form.stock);
    const min = Number(form.min);

    if (!normalizedCategory) {
      nextFieldErrors.category = "Category is required.";
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    if (!normalizedName) {
      nextFieldErrors.itemName = "Item name is required.";
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    if (!normalizedPackageSize) {
      nextFieldErrors.packageSize = "Measure is required.";
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 1) {
      nextFieldErrors.stock = "Amount must be at least 1.";
    }

    if (!Number.isInteger(min) || min < 1) {
      nextFieldErrors.min = "Minimum threshold must be at least 1.";
    }

    if (!normalizedWarehouse) {
      nextFieldErrors.warehouse = "Warehouse is required.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateInventoryItem(itemId, {
          name: normalizedName,
          category: normalizedCategory,
          packageSize: normalizedPackageSize,
          stock,
          min,
          warehouse: normalizedWarehouse,
          note: "Updated from inventory form page.",
          performedBy: "Inventory Officer",
        });
      } else {
        const duplicate = items.find(
          (entry) =>
            String(entry.name || "").trim().toLowerCase() === normalizedName.toLowerCase() &&
            entry.category === normalizedCategory &&
            String(entry.packageSize || "").trim().toLowerCase() === normalizedPackageSize.toLowerCase()
        );

        if (duplicate) {
          await updateInventoryItem(duplicate.id || duplicate._id, {
            stock: Number(duplicate.stock || 0) + stock,
            note: `Stock increased by ${stock} units from the separate inventory page.`,
            performedBy: "Inventory Officer",
          });
        } else {
          await createInventoryItem({
            name: normalizedName,
            category: normalizedCategory,
            packageSize: normalizedPackageSize,
            stock,
            min,
            warehouse: normalizedWarehouse,
            performedBy: "Inventory Officer",
          });
        }
      }

      navigate("/inventory", { replace: true });
    } catch (saveError) {
      setError(saveError.message || "Failed to save inventory item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-page">
      <PageHeader
        role="Inventory Management"
        title={getTitle(mode)}
        description={getDescription(mode)}
      />

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        {loading ? (
          <p className="text-sm text-slate-500">Loading inventory form...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="inventory-inline-alert error">{error}</div>}

            {!isAdjust ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className={inlineInputClass(fieldErrors.category)}
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value, itemName: "" }))}
                    >
                      {Object.values(ITEM_CATEGORIES).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {fieldErrors.category && <p className="mt-1 text-xs text-rose-600">{fieldErrors.category}</p>}
                  </div>

                  <div className="form-group">
                    <label>Item Name</label>
                    <select
                      className={inlineInputClass(fieldErrors.itemName)}
                      value={form.itemName}
                      onChange={(event) => setForm((prev) => ({ ...prev, itemName: event.target.value }))}
                    >
                      <option value="">Select item</option>
                      {itemOptions.map((itemName) => (
                        <option key={itemName} value={itemName}>{itemName}</option>
                      ))}
                    </select>
                    {fieldErrors.itemName && <p className="mt-1 text-xs text-rose-600">{fieldErrors.itemName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label>Measure</label>
                    <input
                      className={inlineInputClass(fieldErrors.packageSize)}
                      type="text"
                      value={form.packageSize}
                      onChange={(event) => setForm((prev) => ({ ...prev, packageSize: event.target.value }))}
                      placeholder="e.g. 5 kg bottle, 1 L, 10 tablets"
                    />
                    {fieldErrors.packageSize && <p className="mt-1 text-xs text-rose-600">{fieldErrors.packageSize}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      className={inlineInputClass(fieldErrors.stock)}
                      type="number"
                      min="1"
                      step="1"
                      value={form.stock}
                      onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                    />
                    {fieldErrors.stock && <p className="mt-1 text-xs text-rose-600">{fieldErrors.stock}</p>}
                  </div>

                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input
                      className={inlineInputClass(fieldErrors.min)}
                      type="number"
                      min="1"
                      step="1"
                      value={form.min}
                      onChange={(event) => setForm((prev) => ({ ...prev, min: event.target.value }))}
                    />
                    {fieldErrors.min && <p className="mt-1 text-xs text-rose-600">{fieldErrors.min}</p>}
                  </div>

                  <div className="form-group">
                    <label>Warehouse</label>
                    <select
                      className={inlineInputClass(fieldErrors.warehouse)}
                      value={form.warehouse}
                      onChange={(event) => setForm((prev) => ({ ...prev, warehouse: event.target.value }))}
                    >
                      {WAREHOUSE_OPTIONS.map((warehouse) => (
                        <option key={warehouse} value={warehouse}>{warehouse}</option>
                      ))}
                    </select>
                    {fieldErrors.warehouse && <p className="mt-1 text-xs text-rose-600">{fieldErrors.warehouse}</p>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className={inlineInputClass(fieldErrors.category)}
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value, itemName: "" }))}
                    >
                      <option value="">Select category</option>
                      {Object.values(ITEM_CATEGORIES).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {fieldErrors.category && <p className="mt-1 text-xs text-rose-600">{fieldErrors.category}</p>}
                  </div>

                  <div className="form-group">
                    <label>Inventory Item</label>
                    <select
                      className={inlineInputClass(fieldErrors.itemName)}
                      value={form.itemName}
                      onChange={(event) => setForm((prev) => ({ ...prev, itemName: event.target.value }))}
                      disabled={!form.category}
                    >
                      <option value="">Select item</option>
                      {selectedItems.map((item) => (
                        <option key={item.id || item._id} value={item.name}>{item.name} ({item.stock} in stock)</option>
                      ))}
                    </select>
                    {fieldErrors.itemName && <p className="mt-1 text-xs text-rose-600">{fieldErrors.itemName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      className={inlineInputClass(fieldErrors.quantity)}
                      type="number"
                      min="1"
                      step="1"
                      value={form.quantity}
                      onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                    />
                    {fieldErrors.quantity && <p className="mt-1 text-xs text-rose-600">{fieldErrors.quantity}</p>}
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <input
                      value={form.note}
                      onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                      placeholder="Optional notes for audit trail"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" className="action-btn export" onClick={() => navigate("/inventory", { replace: true })} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="action-btn add" disabled={saving}>
                {saving ? "Saving..." : getTitle(mode)}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
