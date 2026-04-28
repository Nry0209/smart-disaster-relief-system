export const ROLES = {
  ADMIN: "admin",
  DMC: "dmc_officer",
  INVENTORY: "inventory_officer",
  ALLOCATION: "allocation_officer",
  TRACKING: "tracking_officer",
  CHARITY: "charity_staff",
};

// Item Categories - New Safe Category Design
export const ITEM_CATEGORIES = {
  // FOOD GROUP (Maps to foodNeeded)
  DRY_FOOD: "Dry Food",
  READY_TO_EAT: "Ready-to-Eat Meals", 
  BABY_FOOD: "Baby Food",
  NUTRITIONAL_SUPPLEMENTS: "Nutritional Supplements",
  
  // WATER GROUP (Maps to waterNeeded)
  DRINKING_WATER: "Drinking Water",
  WATER_PURIFICATION: "Water Purification",
  
  // MEDICAL GROUP (Maps to medicineNeeded)
  BASIC_MEDICINE: "Basic Medicine",
  FIRST_AID_SUPPLIES: "First Aid Supplies",
  EMERGENCY_MEDICAL_KITS: "Emergency Medical Kits",
  
  // SUPPORT GROUP (NOT predicted but IMPORTANT)
  SHELTER_MATERIALS: "Shelter Materials",
  CLOTHING: "Clothing",
  HYGIENE_KITS: "Hygiene Kits"
};

export const ITEM_CATEGORY_LIST = [
  // Food Group
  ITEM_CATEGORIES.DRY_FOOD,
  ITEM_CATEGORIES.READY_TO_EAT,
  ITEM_CATEGORIES.BABY_FOOD,
  ITEM_CATEGORIES.NUTRITIONAL_SUPPLEMENTS,
  
  // Water Group
  ITEM_CATEGORIES.DRINKING_WATER,
  ITEM_CATEGORIES.WATER_PURIFICATION,
  
  // Medical Group
  ITEM_CATEGORIES.BASIC_MEDICINE,
  ITEM_CATEGORIES.FIRST_AID_SUPPLIES,
  ITEM_CATEGORIES.EMERGENCY_MEDICAL_KITS,
  
  // Support Group
  ITEM_CATEGORIES.SHELTER_MATERIALS,
  ITEM_CATEGORIES.CLOTHING,
  ITEM_CATEGORIES.HYGIENE_KITS
];

// Item mappings by category
export const ITEM_MAPPING = {
  [ITEM_CATEGORIES.DRY_FOOD]: ["rice", "flour", "canned food"],
  [ITEM_CATEGORIES.READY_TO_EAT]: ["biscuits", "instant noodles", "ration packs"],
  [ITEM_CATEGORIES.BABY_FOOD]: ["infant formula", "baby cereal"],
  [ITEM_CATEGORIES.NUTRITIONAL_SUPPLEMENTS]: ["protein bars", "energy drinks"],
  
  [ITEM_CATEGORIES.DRINKING_WATER]: ["bottled water", "water cans"],
  [ITEM_CATEGORIES.WATER_PURIFICATION]: ["water filters", "purification tablets"],
  
  [ITEM_CATEGORIES.BASIC_MEDICINE]: ["paracetamol", "antibiotics"],
  [ITEM_CATEGORIES.FIRST_AID_SUPPLIES]: ["bandages", "antiseptic"],
  [ITEM_CATEGORIES.EMERGENCY_MEDICAL_KITS]: ["medical kits", "trauma kits"],
  
  [ITEM_CATEGORIES.SHELTER_MATERIALS]: ["tents", "blankets", "tarpaulin"],
  [ITEM_CATEGORIES.CLOTHING]: ["jackets", "clothes"],
  [ITEM_CATEGORIES.HYGIENE_KITS]: ["soap", "sanitary kits"]
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
//dmc dashboard
    label: "DMC Dashboard",
    path: "/dmc-dashboard",
    roles: [ROLES.DMC],
  },
  {
    label: "Delivery Verification",
    path: "/dmc-delivery-verification",
    roles: [ROLES.DMC],
  },
  {
    label: "Create Disaster Report",
//create disaster report
    path: "/disaster-report/create",
    roles: [ROLES.DMC],
  },
  {
//disaster report view ,edit ,delete
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
    roles: [ROLES.ADMIN, ROLES.TRACKING],
  },
  {
    label: "User Management",
    path: "/users",
    roles: [ROLES.ADMIN, ROLES.INVENTORY],
  },
  {
    label: "Reports",
    path: "/reports-analytics",
    roles: [ROLES.ADMIN, ROLES.INVENTORY, ROLES.DMC, ROLES.ALLOCATION, ROLES.CHARITY],
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    roles: [ROLES.ADMIN],
  },
];
