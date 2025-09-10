import * as fs from "fs";

export function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) return {} as T;
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

export function saveJson(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
