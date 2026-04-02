export const ROLES = {
  ADMIN: "admin",
  DMC: "dmc_officer",
  INVENTORY: "inventory_officer",
  ALLOCATION: "allocation_officer",
  TRACKING: "tracking_officer",
  CHARITY: "charity_staff",
};

export const SIDEBAR_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: [
      ROLES.ADMIN,
      ROLES.INVENTORY,
      ROLES.ALLOCATION,
      ROLES.TRACKING,
      ROLES.CHARITY,
    ],
  },
  {
    label: "DMC Dashboard",
    path: "/dmc-dashboard",
    roles: [ROLES.DMC],
  },
  {
    label: "Create Disaster Report",
    path: "/disaster-report/create",
    roles: [ROLES.DMC],
  },
  {
    label: "Disaster Reports",
    path: "/disaster-events",
    roles: [ROLES.ADMIN, ROLES.DMC],
  },
  {
    label: "Inventory",
    path: "/inventory",
    roles: [ROLES.ADMIN, ROLES.INVENTORY],
  },
  {
    label: "Resource Requests",
    path: "/resource-requests",
    roles: [ROLES.ADMIN, ROLES.INVENTORY],
  },
  {
    label: "Donation Verification",
    path: "/donations/verify",
    roles: [ROLES.ADMIN, ROLES.INVENTORY],
  },
  {
    label: "Allocation Plans",
    path: "/allocations",
    roles: [ROLES.ADMIN, ROLES.ALLOCATION],
  },
  {
    label: "Distribution Tracking",
    path: "/distribution-tracking",
    roles: [ROLES.ADMIN, ROLES.TRACKING, ROLES.DMC],
  },
  {
    label: "User Management",
    path: "/users",
    roles: [ROLES.ADMIN, ROLES.INVENTORY],
  },
  {
    label: "Predictive Estimation",
    path: "/prediction",
    roles: [ROLES.ADMIN, ROLES.DMC, ROLES.INVENTORY, ROLES.ALLOCATION],
  },
  {
    label: "Reports",
    path: "/reports-analytics",
    roles: [ROLES.ADMIN, ROLES.DMC, ROLES.ALLOCATION, ROLES.CHARITY],
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    roles: [ROLES.ADMIN],
  },
];