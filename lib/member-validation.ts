const NIN_NOT_APPLICABLE_VALUES = new Set([
  "N/A",
  "NA",
  "NONE",
  "NOT APPLICABLE",
  "NOT_APPLICABLE",
  "NOTAPPLICABLE",
  "-",
]);

export function isNationalIdNotApplicableValue(value?: string | null): boolean {
  if (!value?.trim()) return false;
  return NIN_NOT_APPLICABLE_VALUES.has(value.trim().toUpperCase());
}

export function validateUgandaNationalId(nin: string): string | null {
  const normalized = nin.trim().toUpperCase();
  if (normalized.length < 14 || normalized.length > 20) {
    return "National ID must be 14 characters (e.g. CM92123401234AB)";
  }
  if (!/^[A-Z]{2}[A-Z0-9]+$/.test(normalized)) {
    return "National ID must start with two letters followed by alphanumeric characters";
  }
  const body = normalized.slice(2);
  if (/^(.)\1+$/.test(body) || /^0+$/.test(body) || /^1234567890/.test(body)) {
    return "National ID appears invalid";
  }
  return null;
}

export function validateMemberNationalId(
  nationalId: string,
  notApplicable: boolean,
): string | null {
  if (notApplicable || isNationalIdNotApplicableValue(nationalId)) return null;
  const trimmed = nationalId.trim();
  if (!trimmed) return "National ID is required or mark as not applicable";
  return validateUgandaNationalId(trimmed);
}

export function parseTruthyExcelFlag(value: unknown): boolean {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["yes", "true", "1", "y"].includes(raw);
}
