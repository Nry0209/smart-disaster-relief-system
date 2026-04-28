// Item Categories - Must match frontend categories
const ITEM_CATEGORIES = {
  WATER: "Water",
  FOOD: "Food",
  MEDICAL: "Medical",
  SHELTER: "Shelter",
  CLOTHING: "Clothing"
};

const ITEM_CATEGORY_LIST = [
  ITEM_CATEGORIES.WATER,
  ITEM_CATEGORIES.FOOD,
  ITEM_CATEGORIES.MEDICAL,
  ITEM_CATEGORIES.SHELTER,
  ITEM_CATEGORIES.CLOTHING
];

// For database enum validation (includes "Other" for flexibility)
const ITEM_CATEGORY_ENUM = [...ITEM_CATEGORY_LIST, "Other"];

module.exports = {
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LIST,
  ITEM_CATEGORY_ENUM
};
