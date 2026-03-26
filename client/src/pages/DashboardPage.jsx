function DashboardPage() {
  return (
    <div>
      <h1 style={{ margin: "0 0 24px", color: "#1e293b" }}>
        Dashboard Overview
      </h1>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "32px"
      }}>
        <div style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px" }}>
            Active Disasters
          </h3>
          <p style={{ margin: "0", fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
            3
          </p>
        </div>
        
        <div style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px" }}>
            Resources Allocated
          </h3>
          <p style={{ margin: "0", fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
            1,247
          </p>
        </div>
        
        <div style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px" }}>
            People Helped
          </h3>
          <p style={{ margin: "0", fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
            5,892
          </p>
        </div>
        
        <div style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}>
          <h3 style={{ margin: "0 0 8px", color: "#64748b", fontSize: "14px" }}>
            Active Volunteers
          </h3>
          <p style={{ margin: "0", fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
            342
          </p>
        </div>
      </div>

      <div style={{
        background: "white",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0"
      }}>
        <h2 style={{ margin: "0 0 16px", color: "#1e293b" }}>
          Recent Activity
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            borderLeft: "4px solid #2563eb"
          }}>
            <p style={{ margin: "0", fontWeight: "500" }}>
              New resource allocation for Hurricane Relief - Zone A
            </p>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
              2 hours ago
            </p>
          </div>
          
          <div style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            borderLeft: "4px solid #10b981"
          }}>
            <p style={{ margin: "0", fontWeight: "500" }}>
              Distribution completed for Flood Response - Sector 3
            </p>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
              4 hours ago
            </p>
          </div>
          
          <div style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "8px",
            borderLeft: "4px solid #f59e0b"
          }}>
            <p style={{ margin: "0", fontWeight: "500" }}>
              Inventory alert: Medical supplies running low
            </p>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
              6 hours ago
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;