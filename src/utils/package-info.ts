import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export function getPackageVersion(): string {
    const fileName = fileURLToPath(import.meta.url);
    const dirName = dirname(fileName);
    const packageJsonPath = resolve(dirName, "../../package.json");
    
    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageData = JSON.parse(packageJsonContent);

    return packageData?.version ?? "0.0.0";
}