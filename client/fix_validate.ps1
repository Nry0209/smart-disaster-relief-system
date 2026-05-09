$file = "c:\Users\Admin\Desktop\smart-disaster-relief-system\client\src\pages\NGODonationPage.jsx"
$lines = [System.IO.File]::ReadAllLines($file)
$output = New-Object System.Collections.Generic.List[string]
$skip = $false
$skipCount = 0

for ($idx = 0; $idx -lt $lines.Length; $idx++) {
    $line = $lines[$idx]
    $trimmed = $line.Trim()
    
    # Detect start of validateForm
    if ($trimmed -eq 'function validateForm() {') {
        $output.Add('  function validateForm() {')
        $output.Add('    const newErrors = { amount: "", selectedBank: "", items: {}, expectedDeliveryDate: "" };')
        $output.Add('')
        $output.Add('    if (form.donationType === "monetary") {')
        $output.Add('      if (!form.selectedBank) {')
        $output.Add('        newErrors.selectedBank = "Please select a bank for the transfer.";')
        $output.Add('      }')
        $output.Add('      const amount = Number(form.amount);')
        $output.Add('      if (!form.amount) {')
        $output.Add('        newErrors.amount = "Amount is required.";')
        $output.Add('      } else if (amount <= 0) {')
        $output.Add('        newErrors.amount = "Please enter an amount greater than 0.";')
        $output.Add('      } else if (amount < MIN_MONETARY_AMOUNT) {')
        $output.Add('        newErrors.amount = [char]96 + "Minimum donation amount is LKR " + [char]36 + "{MIN_MONETARY_AMOUNT.toLocaleString()}." + [char]96 + ";")
        $output.Add('      }')
        $output.Add('    }')
        $output.Add('')
        $output.Add('    if (form.donationType === "inventory") {')
        $output.Add('      for (let i = 0; i < form.items.length; i++) {')
        $output.Add('        const item = form.items[i];')
        $output.Add('        if (!item.inventoryItemId) {')
        $output.Add('          newErrors.items[i] = "Please select an item.";')
        $output.Add('        } else {')
        $output.Add('          const qty = Number(item.quantity);')
        $output.Add('          if (!item.quantity || qty < MIN_ITEM_QUANTITY) {')
        $output.Add('            newErrors.items[i] = [char]96 + "Quantity must be at least " + [char]36 + "{MIN_ITEM_QUANTITY}." + [char]96 + ";")
        $output.Add('          }')
        $output.Add('        }')
        $output.Add('      }')
        $output.Add('    }')
        $output.Add('')
        $output.Add('    if (form.expectedDeliveryDate && new Date(form.expectedDeliveryDate) < new Date(getTodayDateLocal())) {')
        $output.Add('      newErrors.expectedDeliveryDate = "Expected delivery date cannot be in the past.";')
        $output.Add('    }')
        $output.Add('')
        $output.Add('    setErrors(newErrors);')
        $output.Add('    return Object.values(newErrors).every((err) => err === "" || Object.keys(err).length === 0);')
        $output.Add('  }')
        
        # Skip until we find the closing of the old validateForm
        # Look for the line "  }" that closes it (line 302 in original)
        $skip = $true
        continue
    }
    
    if ($skip) {
        # Check if this is the closing brace of validateForm
        if ($trimmed -eq '}' -and $lines[$idx].StartsWith('  }')) {
            # Count braces to find the right closing
            $skipCount++
        }
        # We know the old function ends at the line with just "  }" 
        # after "return Object.values..."
        if ($trimmed -match 'return Object\.values') {
            # Next line should be "  }"
            $skip = $false
            # Skip this line and the next closing brace
            $idx++ # skip the closing }
            continue
        }
        continue
    }
    
    $output.Add($line)
}

[System.IO.File]::WriteAllLines($file, $output.ToArray())
Write-Host "Done - wrote $($output.Count) lines"
