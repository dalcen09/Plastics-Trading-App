import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "yyyy/MM/dd");
  } catch (e) {
    return dateString;
  }
}

export function formatNumber(num: number | null | undefined, suffix = "") {
  if (num === null || num === undefined) return "-";
  const formatted = new Intl.NumberFormat("ja-JP").format(num);
  return `${formatted}${suffix ? " " + suffix : ""}`;
}
