#!/usr/bin/env node
/**
 * build-for-hostinger.mjs
 *
 * Produces a self-contained deployment folder at <repo-root>/hostinger/
 * that can be uploaded to Hostinger Node.js hosting as-is.
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/scripts run build-for-hostinger
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const run = (cmd, cwd = repoRoot) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd });
};

const DEPLOY_DIR = path.join(repoRoot, "hostinger");

console.log("=== Hostinger deployment build ===\n");

// ── 1. Clean previous deploy dir ──────────────────────────────────────────
if (existsSync(DEPLOY_DIR)) {
  console.log("Cleaning previous hostinger/ folder…");
  rmSync(DEPLOY_DIR, { recursive: true });
}
mkdirSync(DEPLOY_DIR, { recursive: true });
mkdirSync(path.join(DEPLOY_DIR, "uploads"), { recursive: true });

// ── 2. Build the React frontend ───────────────────────────────────────────
// BASE_PATH is intentionally not set → Vite defaults to "/" (root domain).
run("pnpm --filter @workspace/ration-card-portal run build");

// ── 3. Build the API server bundle ────────────────────────────────────────
run("pnpm --filter @workspace/api-server run build");

// ── 4. Copy artefacts into hostinger/ ─────────────────────────────────────
const apiServerDir = path.join(repoRoot, "artifacts", "api-server");
const frontendDistDir = path.join(
  repoRoot,
  "artifacts",
  "ration-card-portal",
  "dist",
  "public"
);

console.log("\nCopying server bundle → hostinger/dist/ …");
cpSync(path.join(apiServerDir, "dist"), path.join(DEPLOY_DIR, "dist"), {
  recursive: true,
});

console.log("Copying React build  → hostinger/public/ …");
cpSync(frontendDistDir, path.join(DEPLOY_DIR, "public"), { recursive: true });

// ── 5. Write Hostinger package.json ──────────────────────────────────────
// mysql2 must be installed on the host because it is externalized from the bundle.
// pino-pretty is optional but helpful for readable logs in production.
const pkg = {
  name: "ration-card-portal-production",
  version: "1.0.0",
  private: true,
  type: "module",
  engines: { node: ">=20" },
  scripts: {
    start: "node dist/index.mjs",
  },
  dependencies: {
    mysql2: "^3.14.1",
    "pino-pretty": "^13.1.3",
  },
};
writeFileSync(
  path.join(DEPLOY_DIR, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n"
);

// ── 6. Write a .env.example ───────────────────────────────────────────────
const envExample = `# Required – Hostinger MySQL connection string
# Format: mysql://USER:PASSWORD@HOST:3306/DATABASE
MYSQL_DATABASE_URL=mysql://db_user:db_pass@localhost:3306/db_name

# Required – random secret for JWT signing (min 32 chars)
SESSION_SECRET=change_me_to_a_long_random_string

# Required – admin credentials
ADMIN_EMAIL=admin@erationcards.in
ADMIN_PASSWORD=change_me

# Required – UPI ID shown on the payment page
MERCHANT_UPI_ID=your-upi-id@bank

# Required – port Hostinger binds the Node.js app to (set automatically by hPanel)
PORT=3000

# Optional – absolute path where payment screenshots are stored
# Defaults to <deploy-root>/uploads/ if not set.
# Set this to an absolute path on your Hostinger server, e.g.:
# UPLOADS_DIR=/home/<your-user>/domains/erationcards.in/uploads
UPLOADS_DIR=
`;
writeFileSync(path.join(DEPLOY_DIR, ".env.example"), envExample);

// ── 8. Write a .gitignore for the deploy folder ───────────────────────────
writeFileSync(
  path.join(DEPLOY_DIR, ".gitignore"),
  "node_modules/\n.env\n"
);

// ── 9. Summary ────────────────────────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Build complete!  Deploy package ready at: hostinger/           ║
╠══════════════════════════════════════════════════════════════════╣
║  Next steps (see replit.md "Hostinger Deployment" section):     ║
║                                                                  ║
║  1. Create MySQL database in Hostinger hPanel                   ║
║  2. Set environment variables in hPanel (see .env.example)      ║
║  3. Apply schema migrations (from this repo):                   ║
║     pnpm --filter @workspace/db run generate                    ║
║     MYSQL_DATABASE_URL=... pnpm --filter @workspace/scripts \   ║
║       run migrate                                               ║
║  4. Upload the hostinger/ folder to your Hostinger Node.js app  ║
║  5. In hPanel SSH terminal: cd <app-root> && npm install        ║
║  6. Start / restart the Node.js app in hPanel                   ║
║                                                                  ║
║  Or run all of the above in one command:                        ║
║     MYSQL_DATABASE_URL=... pnpm --filter @workspace/scripts \   ║
║       run deploy-for-hostinger                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
