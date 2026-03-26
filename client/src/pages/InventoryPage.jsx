import React, { useState } from "react";
import { Package, AlertTriangle, Warehouse, RefreshCw, Search } from "lucide-react";

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .iv * { box-sizing: border-box; margin:0; padding:0; }
        .iv {
          font-family: 'Inter', sans-serif;
          background: #f1f5f9;
          min-height: 100vh;
          padding: 28px 32px;
          color: #1e293b;
        }

        /* header */
        .iv-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
        }
        .iv-header h1 { font-size: 22px; font-weight: 700; color: #0f172a; }
        .iv-header p  { font-size: 13px; color: #64748b; margin-top: 3px; }
        .live-badge {
          background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
          padding: 5px 13px; border-radius: 20px; font-size: 12px; font-weight: 600;
          display: flex; align-items: center; gap: 6px;
        }
        .live-dot {
          width: 7px; height: 7px; background: #16a34a; border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        /* stat grid */
        .iv-stats {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 14px; margin-bottom: 22px;
        }
        .iv-stat {
          background: #fff; border-radius: 14px; padding: 18px 18px 16px;
          border: 1px solid #e2e8f0; display: flex; gap: 14px; align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
          transition: box-shadow .15s, transform .15s;
        }
        .iv-stat:hover { box-shadow: 0 6px 18px rgba(0,0,0,.09); transform: translateY(-2px); }
        .iv-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .iv-stat-lbl { font-size: 11px; color: #94a3b8; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .4px; }
        .iv-stat-val { font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1; }

        /* layout */
        .iv-body { display: grid; grid-template-columns: 1fr 288px; gap: 18px; }

        /* card */
        .iv-card {
          background: #fff; border-radius: 14px; padding: 22px;
          border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .iv-card-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }

        /* toolbar */
        .iv-toolbar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
        .iv-search { position: relative; flex: 1; min-width: 160px; }
        .iv-search svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .iv-search input {
          width: 100%; padding: 8px 10px 8px 32px;
          border: 1px solid #e2e8f0; border-radius: 8px;
          font-size: 13px; font-family: inherit; color: #1e293b; outline: none;
          transition: border-color .15s;
        }
        .iv-search input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
        .cat-pill {
          padding: 6px 13px; border-radius: 20px; border: 1px solid #e2e8f0;
          background: #f8fafc; font-size: 12px; font-weight: 500; color: #64748b;
          cursor: pointer; font-family: inherit; transition: all .15s; white-space: nowrap;
        }
        .cat-pill:hover { border-color: #93c5fd; color: #2563eb; }
        .cat-pill.on { background: #2563eb; color: #fff; border-color: #2563eb; }

        /* table */
        .iv-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .iv-tbl thead tr { border-bottom: 2px solid #f1f5f9; }
        .iv-tbl th {
          padding: 9px 10px; text-align: left;
          font-size: 10px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: .5px;
        }
        .iv-tbl tbody tr { border-bottom: 1px solid #f8fafc; transition: background .1s; }
        .iv-tbl tbody tr:last-child { border: none; }
        .iv-tbl tbody tr:hover { background: #f8fafc; }
        .iv-tbl td { padding: 11px 10px; vertical-align: middle; }
        .iname { font-weight: 600; color: #0f172a; }
        .cpill {
          display: inline-block; padding: 2px 8px; border-radius: 20px;
          font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569;
        }
        .spill {
          display: inline-block; padding: 3px 9px; border-radius: 20px;
          font-size: 11px; font-weight: 700;
        }
        .bar-row { display: flex; align-items: center; gap: 6px; }
        .bar-bg  { flex: 1; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
        .bar-fg  { height: 100%; border-radius: 3px; transition: width .4s ease; }
        .bar-pct { font-size: 10px; color: #94a3b8; width: 28px; text-align: right; }

        /* right panel */
        .right-col { display: flex; flex-direction: column; gap: 16px; }

        /* action buttons */
        .act-list { display: flex; flex-direction: column; gap: 9px; }
        .act-btn {
          width: 100%; padding: 10px 14px; border-radius: 9px; border: none;
          font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
          color: #fff; text-align: left; transition: opacity .15s, transform .1s;
          display: flex; align-items: center; gap: 8px;
        }
        .act-btn:hover  { opacity: .86; }
        .act-btn:active { transform: scale(.98); }

        /* log */
        .log-list { display: flex; flex-direction: column; gap: 7px; }
        .log-item {
          font-size: 12px; color: #475569; background: #f8fafc;
          border-radius: 8px; padding: 8px 10px; border-left: 3px solid #3b82f6;
          line-height: 1.5;
        }

        /* overlay */
        .iv-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; backdrop-filter: blur(3px);
          animation: fIn .15s ease;
        }
        @keyframes fIn { from{opacity:0} to{opacity:1} }
        .iv-modal {
          background: #fff; border-radius: 16px; padding: 28px;
          width: 400px; max-width: 95vw;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          animation: sUp .2s ease;
        }
        @keyframes sUp {
          from{transform:translateY(16px);opacity:0}
          to  {transform:translateY(0);   opacity:1}
        }
        .iv-modal h2  { font-size: 17px; font-weight: 700; margin-bottom: 18px; }
        .iv-fields    { display: flex; flex-direction: column; gap: 12px; }
        .iv-fields label {
          display: flex; flex-direction: column; gap: 5px;
          font-size: 12px; font-weight: 600; color: #374151;
        }
        .iv-fields input, .iv-fields select {
          padding: 9px 11px; border: 1px solid #e2e8f0; border-radius: 8px;
          font-size: 13px; font-family: inherit; color: #1e293b; outline: none;
          transition: border-color .15s;
        }
        .iv-fields input:focus, .iv-fields select:focus { border-color: #3b82f6; }
        .iv-mfooter {
          display: flex; justify-content: flex-end; gap: 9px; margin-top: 20px;
        }
        .m-cancel {
          padding: 9px 16px; border-radius: 8px; border: 1px solid #e2e8f0;
          background: #fff; font-size: 13px; font-weight: 500; color: #64748b;
          cursor: pointer; font-family: inherit;
        }
        .m-confirm {
          padding: 9px 18px; border-radius: 8px; border: none;
          background: #2563eb; color: #fff; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: background .15s;
        }
        .m-confirm:hover { background: #1d4ed8; }

        @media(max-width:900px) {
          .iv-stats { grid-template-columns: repeat(2,1fr); }
          .iv-body  { grid-template-columns: 1fr; }
          .iv       { padding: 16px; }
        }
      `}</style>

      <div className="iv">

        {/* HEADER */}
        <div className="iv-header">
          <div>
            <h1>Inventory Dashboard</h1>
            <p>Monitor stock, manage updates, and track shortages</p>
          </div>
          <span className="live-badge"><span className="live-dot"/> Live</span>
        </div>

        {/* STATS */}
        <div className="iv-stats">
          {[
            { icon: <Package   size={19} color="#2563eb"/>, bg:"#eff6ff", lbl:"Total Items",   val: totalItems  },
            { icon: <AlertTriangle size={19} color="#dc2626"/>, bg:"#fef2f2", lbl:"Low / Critical", val: lowCount   },
            { icon: <Warehouse size={19} color="#16a34a"/>, bg:"#f0fdf4", lbl:"Warehouses",    val: 5           },
            { icon: <RefreshCw size={19} color="#7c3aed"/>, bg:"#f5f3ff", lbl:"Log Entries",   val: log.length  },
          ].map(s => (
            <div className="iv-stat" key={s.lbl}>
              <div className="iv-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="iv-stat-lbl">{s.lbl}</div>
                <div className="iv-stat-val">{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* BODY */}
        <div className="iv-body">

          {/* TABLE CARD */}
          <div className="iv-card">
            <div className="iv-card-title">Stock Overview</div>

            <div className="iv-toolbar">
              <div className="iv-search">
                <Search size={13}/>
                <input
                  placeholder="Search items…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {CATEGORIES.map(c => (
                <button key={c} className={`cat-pill${activeCat===c?" on":""}`} onClick={() => setActiveCat(c)}>{c}</button>
              ))}
            </div>

            <div style={{ overflowX:"auto" }}>
              <table className="iv-tbl">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Min</th>
                    <th style={{ minWidth:100 }}>Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign:"center", padding:"28px", color:"#94a3b8" }}>No items found.</td></tr>
                    : filtered.map(item => {
                        const s   = getStatus(item.stock, item.min);
                        const pct = Math.min(100, Math.round((item.stock / item.min) * 100));
                        return (
                          <tr key={item.id}>
                            <td><span className="iname">{item.name}</span></td>
                            <td><span className="cpill">{item.category}</span></td>
                            <td style={{ fontWeight:600, color:"#0f172a" }}>{item.stock.toLocaleString()}</td>
                            <td style={{ color:"#94a3b8" }}>{item.min.toLocaleString()}</td>
                            <td>
                              <div className="bar-row">
                                <div className="bar-bg">
                                  <div className="bar-fg" style={{ width:`${pct}%`, background: barColor(s.label) }}/>
                                </div>
                                <span className="bar-pct">{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span className="spill" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-col">

            {/* Quick Actions */}
            <div className="iv-card">
              <div className="iv-card-title">Quick Actions</div>
              <div className="act-list">
                {[
                  { label:"+ Add Stock",       bg:"#2563eb", fn:()=>setModal("add")      },
                  { label:"⚠ Adjust Damage",   bg:"#f59e0b", fn:()=>setModal("adjust")   },
                  { label:"↔ Transfer Stock",  bg:"#16a34a", fn:()=>setModal("transfer")  },
                  { label:"🎁 Apply Donation",  bg:"#7c3aed", fn:()=>setModal("donate")   },
                  { label:"⬇ Export Report",   bg:"#334155", fn: handleExport             },
                ].map(a => (
                  <button key={a.label} className="act-btn" style={{ background: a.bg }} onClick={a.fn}>{a.label}</button>
                ))}
              </div>
              <p style={{ fontSize:11, color:"#94a3b8", marginTop:12 }}>All updates are logged and verified.</p>
            </div>

            {/* Activity Log */}
            <div className="iv-card">
              <div className="iv-card-title">Activity Log</div>
              <div className="log-list">
                {log.slice(0,5).map((e,i) => <div key={i} className="log-item">{e}</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="iv-overlay" onClick={() => setModal(null)}>
          <div className="iv-modal" onClick={e => e.stopPropagation()}>
            <h2>
              {modal==="add"      && "➕ Add New Stock Item"}
              {modal==="adjust"   && "⚠️ Adjust for Damage"}
              {modal==="transfer" && "↔️ Transfer Stock"}
              {modal==="donate"   && "🎁 Apply Donation"}
            </h2>

            {modal === "add" ? (
              <>
                <div className="iv-fields">
                  <label>Item Name
                    <input placeholder="e.g. Bottled Water" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                  </label>
                  <label>Category
                    <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                      {["Water","Food","Medical","Shelter"].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </label>
                  <label>Stock Quantity
                    <input type="number" min="0" placeholder="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/>
                  </label>
                  <label>Minimum Threshold
                    <input type="number" min="0" placeholder="0" value={form.min} onChange={e=>setForm(f=>({...f,min:e.target.value}))}/>
                  </label>
                </div>
                <div className="iv-mfooter">
                  <button className="m-cancel" onClick={()=>setModal(null)}>Cancel</button>
                  <button className="m-confirm" onClick={handleAdd}>Add Item</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>This action will be logged in the activity feed.</p>
                <div className="iv-fields">
                  <label>Select Item
                    <select>{items.map(i=><option key={i.id}>{i.name}</option>)}</select>
                  </label>
                  <label>Quantity
                    <input type="number" min="1" placeholder="0"/>
                  </label>
                  {modal==="transfer" && (
                    <label>Destination Warehouse
                      <select>{[1,2,3,4,5].map(w=><option key={w}>Warehouse {w}</option>)}</select>
                    </label>
                  )}
                </div>
                <div className="iv-mfooter">
                  <button className="m-cancel" onClick={()=>setModal(null)}>Cancel</button>
                  <button className="m-confirm" onClick={()=>logAction(modal)}>Confirm</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
