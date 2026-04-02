import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ClipboardList,
  Activity,
  Truck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

function DmcDashboardPage() {
  const navigate = useNavigate();

  const stats = useMemo(
    () => [
      { label: "Active incidents", value: 4, icon: AlertTriangle, tone: "danger" },
      { label: "Reports filed", value: 32, icon: ClipboardList, tone: "info" },
      { label: "Deliveries pending", value: 12, icon: Truck, tone: "warning" },
      { label: "Resolved this week", value: 18, icon: CheckCircle2, tone: "success" },
    ],
    []
  );

  const recentReports = [
    {
      id: "DIS-014",
      location: "Gampaha / Biyagama",
      type: "Flood",
      severity: "High",
      status: "Active",
      time: "35 mins ago",
    },
    {
      id: "DIS-013",
      location: "Kalutara / Panadura",
      type: "Landslide",
      severity: "Critical",
      status: "Monitoring",
      time: "2 hours ago",
    },
    {
      id: "DIS-012",
      location: "Matara / Weligama",
      type: "Cyclone",
      severity: "Medium",
      status: "Active",
      time: "5 hours ago",
    },
  ];

  const deliveryQueue = [
    {
      title: "Kandy Shelter Zone",
      status: "Awaiting confirmation",
      eta: "ETA 45 mins",
    },
    {
      title: "Colombo Coastal Relief",
      status: "On route",
      eta: "ETA 1h 20m",
    },
  ];

  const predictiveSnapshot = [
    { label: "Water (L)", value: "4,800" },
    { label: "Meal packs", value: "3,400" },
    { label: "Medical kits", value: "620" },
    { label: "Shelter kits", value: "410" },
  ];

  const toneStyles = {
    danger: "bg-rose-50 text-rose-600",
    info: "bg-sky-50 text-sky-600",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_75%_25%,rgba(34,197,94,0.12),transparent_45%)] px-6 py-7 text-slate-900">
      <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_16px_30px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500">
            DMC Officer / Command Center
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Disaster Command Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track disaster reports, confirm deliveries, and monitor predictive
            estimates in real time.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
            onClick={() => navigate("/disaster-report/create")}
          >
            Create disaster report
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5"
            onClick={() => navigate("/distribution-tracking")}
          >
            View delivery tracking
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_20px_rgba(15,23,42,0.05)]"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[item.tone]}`}
              >
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {item.label}
                </p>
                <strong className="text-xl font-semibold text-slate-900">
                  {item.value}
                </strong>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent disaster reports
              </h2>
              <p className="text-xs text-slate-500">
                Newest incidents logged by field officers.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              onClick={() => navigate("/disaster-events")}
            >
              View all
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {report.type} - {report.location}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {report.id} · {report.severity} · {report.time}
                  </span>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Predictive resource snapshot
              </h2>
              <p className="text-xs text-slate-500">
                Auto-generated estimates for the next 24 hours.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <TrendingUp size={14} />
              +6% demand
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {predictiveSnapshot.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="text-xs text-slate-500">{item.label}</span>
                <strong className="mt-2 block text-lg font-semibold text-slate-900">
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Forecast refreshes every 30 minutes based on historical disaster data.
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Delivery confirmations
              </h2>
              <p className="text-xs text-slate-500">
                Dispatches requiring DMC verification.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
              2 pending
            </span>
          </div>
          <div className="space-y-3">
            {deliveryQueue.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500">{item.status}</p>
                </div>
                <span className="ml-auto text-xs text-slate-500">
                  {item.eta}
                </span>
              </div>
            ))}
          </div>
          <button
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5"
            onClick={() => navigate("/distribution-tracking")}
          >
            Open tracking workspace
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_24px_rgba(15,23,42,0.05)]">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Operational signals
            </h2>
            <p className="text-xs text-slate-500">Live status from field command.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Activity size={18} className="text-emerald-600" />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Flood response on track
                </h4>
                <p className="text-xs text-slate-500">Updated 10 mins ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <AlertTriangle size={18} className="text-rose-600" />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Medical supplies below threshold
                </h4>
                <p className="text-xs text-slate-500">
                  Immediate procurement required
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <ClipboardList size={18} className="text-sky-600" />
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  3 reports awaiting review
                </h4>
                <p className="text-xs text-slate-500">Assign verification team</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DmcDashboardPage;
