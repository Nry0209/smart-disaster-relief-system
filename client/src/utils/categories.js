export const ITEM_CATEGORIES = {
  WATER: "Water",
  FOOD: "Food", 
  MEDICAL: "Medical",
  SHELTER: "Shelter",
  CLOTHING: "Clothing"
};

export const ITEM_CATEGORY_LIST = [
  ITEM_CATEGORIES.WATER,
  ITEM_CATEGORIES.FOOD,
  ITEM_CATEGORIES.MEDICAL,
  ITEM_CATEGORIES.SHELTER,
  ITEM_CATEGORIES.CLOTHING
];

export const DEFAULT_INVENTORY_ITEMS = [
  { id: 1, name: "Bottled Water", category: ITEM_CATEGORIES.WATER, stock: 4500, min: 6000 },
  { id: 2, name: "Dry Ration", category: ITEM_CATEGORIES.FOOD, stock: 3900, min: 3500 },
  { id: 3, name: "Blankets", category: ITEM_CATEGORIES.SHELTER, stock: 2600, min: 2000 },
  { id: 4, name: "Tents", category: ITEM_CATEGORIES.SHELTER, stock: 240, min: 400 },
  { id: 5, name: "Medicine Kits", category: ITEM_CATEGORIES.MEDICAL, stock: 310, min: 500 },
  { id: 6, name: "Clothing Sets", category: ITEM_CATEGORIES.CLOTHING, stock: 800, min: 1000 },
];
