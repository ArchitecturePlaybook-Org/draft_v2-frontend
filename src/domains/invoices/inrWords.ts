/**
 * Converts a numerical INR amount into formal words
 * e.g., 125500.50 -> "Rupees One Lakh Twenty-Five Thousand Five Hundred and Fifty Paise Only"
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) {
      str += "-" + ONES[n % 10];
    }
    str += " ";
  } else if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Rupees Zero Only";

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = "";

  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  const hundredAndBelow = rem;

  if (crore > 0) {
    result += convertBelowThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + " Thousand ";
  }
  if (hundredAndBelow > 0) {
    result += convertBelowThousand(hundredAndBelow) + " ";
  }

  result = result.trim();
  if (!result) {
    result = "Zero";
  }

  let finalStr = `${isNegative ? "Minus " : ""}Rupees ${result}`;

  if (paise > 0) {
    finalStr += ` and ${convertBelowThousand(paise)} Paise`;
  }

  finalStr += " Only";
  return finalStr;
}
