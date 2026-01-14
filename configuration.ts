import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// determine env (default to local)
const env = process.env.NODE_ENV?.trim() || "local";

// Load dotenv from configs only when not in production AND file exists.
// This avoids accidentally reading a file in PaaS where env vars are provided by the platform.
const dotenvPath = path.resolve(__dirname, `./configs/.${env}.env`);
if (env !== "production" && fs.existsSync(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
}

// Helper to parse integers safely
const parseIntOr = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : fallback;
};

const configuration = {
    NODE_ENV: env,
    HOST: process.env.HOST || "0.0.0.0",
    PORT: parseIntOr(process.env.PORT, 3000),
    DATABASE_URL: process.env.DATABASE_URL || (() => { throw new Error('DATABASE_URL required'); })(),
};

export default configuration;