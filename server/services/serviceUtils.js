const toDateString = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const normalizeCategory = (category) => {
  if (!category) {
    return '';
  }

  const value = String(category).trim().toLowerCase();
  const categories = {
    water: 'Water',
    food: 'Food',
    medical: 'Medical',
    shelter: 'Shelter',
  };

  return categories[value] || String(category).trim();
};

module.exports = {
  toDateString,
  normalizeCategory,
};
