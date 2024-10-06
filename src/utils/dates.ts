const PREFERRED_TIME_ZONE = "Asia/Manila";
const PREFERRED_DATE_FORMAT = "yyyy-MM-dd";

function formatDate(date: Date) {
  return Utilities.formatDate(date, PREFERRED_TIME_ZONE, PREFERRED_DATE_FORMAT);
}

export function extractDate(value: any) {
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === "string") {
    const DATE_RE = /^\d+\/\d+\/\d+$/;
    if (value.match(DATE_RE)) {
      return formatDate(new Date(value));
    }
  }
}
