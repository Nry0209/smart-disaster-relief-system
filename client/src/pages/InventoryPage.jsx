import React, { useState } from "react";
import { Package, AlertTriangle, Warehouse, RefreshCw, Search } from "lucide-react";
import './Pages.css';

const initialItems = [
  { id: 1, name: "Bottled Water",  category: "Water",   stock: 4500, min: 6000 },
  { id: 2, name: "Dry Ration",     category: "Food",    stock: 3900, min: 3500 },
  { id: 3, name: "Blankets",       category: "Shelter", stock: 2600, min: 2000 },
  { id: 4, name: "Tents",          category: "Shelter", stock: 240,  min: 400  },
  { id: 5, name: "Medicine Kits",  category: "Medical", stock: 310,  min: 500  },
];

function getStatus(stock, min) {
  const ratio = stock / min;
  if (ratio >= 1)   return { label: "Good",     color: "#16a34a", bg: "#dcfce7" };
  if (ratio >= 0.7) return { label: "Warning",  color: "#d97706", bg: "#fef3c7" };
  if (ratio >= 0.4) return { label: "Low",      color: "#ea580c", bg: "#ffedd5" };
  return               { label: "Critical", color: "#dc2626", bg: "#fee2e2" };
}

function barColor(label) {
  return label === "Good" ? "#22c55e" : label === "Warning" ? "#f59e0b" : label === "Low" ? "#f97316" : "#ef4444";
}

const CATEGORIES = ["All", "Water", "Food", "Medical", "Shelter"];

export default function InventoryPage() {
  const [items, setItems]             = useState(initialItems);
  const [activeCat, setActiveCat]     = useState("All");
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({ name: "", category: "Water", stock: "", min: "" });
  const [log, setLog]                 = useState([
    "Medicine Kits fell below minimum threshold.",
    "Tents stock updated — 40 units added.",
    "Blankets transferred to Warehouse 3.",
  ]);

  const totalItems = items.length;
  const lowCount   = items.filter(i => i.stock < i.min).length;

  const filtered = items.filter(i =>
    (activeCat === "All" || i.category === activeCat) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleAdd() {
    if (!form.name || !form.stock || !form.min) return;
    setItems(p => [...p, { id: Date.now(), name: form.name, category: form.category, stock: +form.stock, min: +form.min }]);
    setLog(p => [`Added "${form.name}" — ${(+form.stock).toLocaleString()} units.`, ...p]);
    setForm({ name: "", category: "Water", stock: "", min: "" });
    setModal(null);
  }

  function handleExport() {
    const rows = ["Item,Category,Stock,Min,Status",
      ...items.map(i => `${i.name},${i.category},${i.stock},${i.min},${getStatus(i.stock, i.min).label}`)
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = "inventory_report.csv";
    a.click();
  }

  function logAction(type) {
    setLog(p => [`${type} action performed.`, ...p]);
    setModal(null);
  }

  return (
    <div className="inventory-page">

      {/* HEADER */}
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            Inventory Officer / Stock Management
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Inventory Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track and manage your disaster relief supplies
          </p>
        </div>
      </section>

      {/* STATS */}
      <div className="inventory-stats">
        {[
          { icon: <Package   size={16} color="#2563eb"/>, bg:"#eff6ff", lbl:"Total Items",   val: totalItems  },
          { icon: <AlertTriangle size={16} color="#dc2626"/>, bg:"#fef2f2", lbl:"Low Stock",     val: lowCount   },
          { icon: <Warehouse size={16} color="#16a34a"/>, bg:"#f0fdf4", lbl:"Warehouses",    val: 5           },
          { icon: <RefreshCw size={16} color="#7c3aed"/>, bg:"#f5f3ff", lbl:"Recent Updates",val: log.length  },
        ].map(s => (
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
            <Search size={14}/>
            <input
              placeholder="Search inventory items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="category-filters">
          {CATEGORIES.map(c => (
            <button key={c} className={`category-btn${activeCat===c?" active":""}`} onClick={() => setActiveCat(c)}>{c}</button>
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
            {filtered.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>No items found matching your criteria.</td></tr>
              : filtered.map(item => {
                  const s   = getStatus(item.stock, item.min);
                  const pct = Math.min(100, Math.round((item.stock / item.min) * 100));
                  return (
                    <tr key={item.id}>
                      <td><span className="item-name">{item.name}</span></td>
                      <td><span className="category-badge">{item.category}</span></td>
                      <td><span className="stock-quantity">{item.stock.toLocaleString()}</span></td>
                      <td><span className="min-quantity">{item.min.toLocaleString()}</span></td>
                      <td>
                        <div className="progress-bar">
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width:`${pct}%`, background: barColor(s.label) }}/>
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
            }
          </tbody>
        </table>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          {[
            { label:"➕ Add New Item",    class:"add",     fn:()=>setModal("add")      },
            { label:"⚠ Update Stock",     class:"adjust",   fn:()=>setModal("adjust")   },
            { label:"↔ Transfer Items",   class:"transfer", fn:()=>setModal("transfer")  },
            { label:"🎁 Record Donation",  class:"donate",   fn:()=>setModal("donate")   },
            { label:"📊 Export Report",   class:"export",   fn: handleExport             },
          ].map(a => (
            <button key={a.label} className={`action-btn ${a.class}`} onClick={a.fn}>{a.label}</button>
          ))}
        </div>
        <p style={{ fontSize:13, color:"#64748b", marginTop:16, textAlign:"center" }}>All actions are automatically logged for audit purposes.</p>
      </div>

      {/* ACTIVITY LOG */}
      <div className="activity-log">
        <h2>Recent Activity</h2>
        <div className="log-items">
          {log.slice(0,5).map((e,i) => <div key={i} className="log-item">{e}</div>)}
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="inventory-modal-overlay" onClick={() => setModal(null)}>
          <div className="inventory-modal" onClick={e => e.stopPropagation()}>
            <div className="inventory-modal-header">
              <h2>
                {modal==="add"      && "➕ Add New Stock Item"}
                {modal==="adjust"   && "⚠️ Adjust for Damage"}
                {modal==="transfer" && "↔️ Transfer Stock"}
                {modal==="donate"   && "🎁 Apply Donation"}
              </h2>
              <button className="close-btn" onClick={() => setModal(null)}>×</button>
            </div>

            <div className="inventory-modal-body">
              {modal === "add" ? (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input placeholder="e.g. Bottled Water" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                      {["Water","Food","Medical","Shelter"].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input type="number" min="0" placeholder="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label>Minimum Threshold</label>
                    <input type="number" min="0" placeholder="0" value={form.min} onChange={e=>setForm(f=>({...f,min:e.target.value}))}/>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize:14, color:"#64748b", marginBottom:20 }}>This action will be logged in the activity feed.</p>
                  <div className="form-group">
                    <label>Select Item</label>
                    <select>{items.map(i=><option key={i.id}>{i.name}</option>)}</select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" placeholder="0"/>
                  </div>
                  {modal==="transfer" && (
                    <div className="form-group">
                      <label>Destination Warehouse</label>
                      <select>{[1,2,3,4,5].map(w=><option key={w}>Warehouse {w}</option>)}</select>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="inventory-modal-footer">
              <button className="btn-cancel" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn-confirm" onClick={modal==="add" ? handleAdd : () => logAction(modal)}>
                {modal==="add" ? "Add Item" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
