import { state } from "../core/state";

export function initCostDashboardControls() {
  const currencySelect = document.getElementById("currency-select") as HTMLSelectElement | null;
  if (currencySelect) {
    currencySelect.addEventListener("change", (e: any) => {
      state.selectedCurrency = e.target.value;
      updateCostCalculations();
    });
  }
}

export function updateCostCalculations() {
  const rate = state.currencyRates[state.selectedCurrency] || 1.0;
  const symbol = state.currencySymbols[state.selectedCurrency] || "$";

  const totalEl = document.getElementById("cost-total-val");
  if (totalEl) {
    totalEl.textContent = `${symbol}${(state.projectTotalCost * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}
