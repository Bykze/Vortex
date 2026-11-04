import { existsSync } from "fs";
import { fileURLToPath } from "url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
