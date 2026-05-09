const fs = require('fs');
const file = 'c:\\Users\\Admin\\Desktop\\smart-disaster-relief-system\\client\\src\\pages\\NGODonationPage.jsx';
let lines = fs.readFileSync(file, 'utf-8').split('\n');

// Find line index of "function validateForm() {"
const startIdx = lines.findIndex(l => l.trim() === 'function validateForm() {');
// Find the closing "}" of validateForm - it's the line that has just "  }" after "return Object.values"
let endIdx = -1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (lines[i].trim().startsWith('return Object.values')) {
    // next line should be the closing brace
    endIdx = i + 1;
    break;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find validateForm boundaries:', startIdx, endIdx);
  process.exit(1);
}

const replacement = `  function validateForm() {
    const newErrors = { amount: "", selectedBank: "", items: {}, expectedDeliveryDate: "" };

    if (form.donationType === "monetary") {
      if (!form.selectedBank) {
        newErrors.selectedBank = "Please select a bank for the transfer.";
      }
      const amount = Number(form.amount);
      if (!form.amount) {
        newErrors.amount = "Amount is required.";
      } else if (amount <= 0) {
        newErrors.amount = "Please enter an amount greater than 0.";
      } else if (amount < MIN_MONETARY_AMOUNT) {
        newErrors.amount = \`Minimum donation amount is LKR \${MIN_MONETARY_AMOUNT.toLocaleString()}.\`;
      }
    }

    if (form.donationType === "inventory") {
      for (let i = 0; i < form.items.length; i++) {
        const item = form.items[i];
        if (!item.inventoryItemId) {
          newErrors.items[i] = "Please select an item.";
        } else {
          const qty = Number(item.quantity);
          if (!item.quantity || qty < MIN_ITEM_QUANTITY) {
            newErrors.items[i] = \`Quantity must be at least \${MIN_ITEM_QUANTITY}.\`;
          }
        }
      }
    }

    if (form.expectedDeliveryDate && new Date(form.expectedDeliveryDate) < new Date(getTodayDateLocal())) {
      newErrors.expectedDeliveryDate = "Expected delivery date cannot be in the past.";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((err) => err === "" || Object.keys(err).length === 0);
  }`;

const newLines = [
  ...lines.slice(0, startIdx),
  ...replacement.split('\n'),
  ...lines.slice(endIdx + 1)
];

fs.writeFileSync(file, newLines.join('\n'), 'utf-8');
console.log('Done - replaced lines', startIdx + 1, 'to', endIdx + 1);
