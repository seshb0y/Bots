export function normalize(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "");
} 