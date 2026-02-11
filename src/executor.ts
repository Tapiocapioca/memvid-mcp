import spawn from "cross-spawn";
import { existsSync } from "fs";
import type { CliResult, ExecuteOptions } from "./types.js";
import { TIMEOUTS, log } from "./types.js";

const MEMVID_PATH = process.env.MEMVID_PATH || "memvid";
const MEMVID_VERBOSE = process.env.MEMVID_VERBOSE === "1";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 100;

// Verify path exists at startup (logged once)
let pathVerified = false;
function verifyPath(): boolean {
  if (pathVerified) return true;
  
  const exists = MEMVID_PATH === "memvid" || existsSync(MEMVID_PATH);
  if (exists) {
    log("info", `Memvid path verified: ${MEMVID_PATH}`);
    pathVerified = true;
  } else {
    log("error", `Memvid path does not exist: ${MEMVID_PATH}`);
  }
  return exists;
}

// Single execution attempt
function executeOnce(
  fullArgs: string[],
  command: string,
  timeout: number,
  skipJson: boolean
): Promise<CliResult> {
  return new Promise((resolve) => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const child = spawn(MEMVID_PATH, fullArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      log("warning", `Command timeout: memvid ${command}`, { timeout });
      resolve({
        success: false,
        error: `Command timed out after ${timeout}ms: memvid ${fullArgs.join(" ")}`,
        exitCode: -1,
      });
    }, timeout);

    child.stdout?.on("data", (data: Buffer) => {
      stdout.push(data.toString());
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr.push(data.toString());
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      log("error", `Spawn failed: ${err.message}`, { 
        path: MEMVID_PATH, 
        command, 
        code: (err as NodeJS.ErrnoException).code 
      });
      const errCode = (err as NodeJS.ErrnoException).code;
      let hint = `Is MEMVID_PATH set correctly? Current: ${MEMVID_PATH}`;
      if (errCode === "ENOENT") {
        hint = `memvid binary not found at "${MEMVID_PATH}". Set MEMVID_PATH environment variable to the correct path, or ensure "memvid" is in your system PATH.`;
      } else if (errCode === "EACCES") {
        hint = `Permission denied running "${MEMVID_PATH}". Check file permissions.`;
      }
      resolve({
        success: false,
        error: `Failed to spawn memvid: ${err.message}. ${hint}`,
        exitCode: -1,
        isSpawnError: true,
        spawnErrorCode: errCode,
      } as CliResult);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      const stdoutStr = stdout.join("").trim();
      const stderrStr = stderr.join("").trim();

      if (code === 0) {
        if (skipJson) {
          log("debug", `Command success: memvid ${command}`);
          resolve({
            success: true,
            data: stdoutStr,
            exitCode: code,
          });
        } else {
          try {
            const data = JSON.parse(stdoutStr);
            log("debug", `Command success: memvid ${command}`);
            resolve({
              success: true,
              data,
              exitCode: code,
            });
          } catch (parseError) {
            log("warning", `JSON parse failed for: memvid ${command}`, {
              error: parseError instanceof Error ? parseError.message : "unknown",
              outputLength: stdoutStr.length,
            });
            resolve({
              success: true,
              data: stdoutStr,
              exitCode: code,
            });
          }
        }
      } else {
        log("info", `Command failed: memvid ${command}`, { exitCode: code });
        const rawError = stderrStr || stdoutStr || "";
        const errorMsg = rawError || `memvid ${command} failed with exit code ${code}. Check that the file exists and the command arguments are correct.`;
        resolve({
          success: false,
          error: errorMsg,
          stderr: stderrStr,
          exitCode: code ?? -1,
        });
      }
    });
  });
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function executeMemvid(
  args: string[],
  options: ExecuteOptions = {}
): Promise<CliResult> {
  const { timeout = TIMEOUTS.DEFAULT, skipJson = false } = options;

  // Verify path on first call
  verifyPath();

  const fullArgs = [...args];
  if (!skipJson) {
    fullArgs.push("--json");
  }
  if (MEMVID_VERBOSE) {
    fullArgs.push("--verbose");
  }

  const command = args[0] || "unknown";
  log("debug", `Executing: memvid ${command}`, { args: args.slice(1, 3) });

  // Execute with retry for ENOENT errors (transient spawn issues)
  let lastResult: CliResult | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      log("info", `Retry ${attempt}/${MAX_RETRIES} for: memvid ${command}`);
      await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
    }

    lastResult = await executeOnce(fullArgs, command, timeout, skipJson);
    
    // Only retry on spawn errors (ENOENT, etc.), not on command failures
    const isSpawnError = (lastResult as { isSpawnError?: boolean }).isSpawnError;
    if (lastResult.success || !isSpawnError) {
      return lastResult;
    }
    
    log("warning", `Spawn error on attempt ${attempt + 1}, will retry`, {
      code: (lastResult as { spawnErrorCode?: string }).spawnErrorCode
    });
  }

  return lastResult!;
}

export function buildArgs(
  baseArgs: string[],
  options: Record<string, unknown>
): string[] {
  const args = [...baseArgs];

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;

    const flag = `--${key.replace(/_/g, "-")}`;

    if (typeof value === "boolean") {
      if (value) args.push(flag);
    } else if (Array.isArray(value)) {
      args.push(flag, value.join(","));
    } else {
      args.push(flag, String(value));
    }
  }

  return args;
}
