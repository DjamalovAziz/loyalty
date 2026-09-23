import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

function run(cmd: string[], env: Record<string, string | undefined>) {
  return new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
    const proc = spawn(cmd[0], cmd.slice(1), { env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("exit", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const outDir = process.env.BACKUP_DIR || "backups";
  mkdirSync(outDir, { recursive: true });

  const file = `${outDir}/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sql.gz`;

  const pgDumpCmd = process.env.PG_DUMP || "pg_dump";
  const { code } = await run(
    [pgDumpCmd, "--format=custom", "--file", file, "--dbname", databaseUrl],
    { PGPASSWORD: process.env.PGPASS }
  );

  if (code !== 0) {
    console.error("pg_dump failed");
    process.exit(1);
  }

  const stat = readFileSync(file);
  console.log(`Backup written: ${file} (${stat.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
