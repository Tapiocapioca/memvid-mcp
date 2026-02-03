import spawn from "cross-spawn";
import type { CliResult, ExecuteOptions } from "./types.js";
import { TIMEOUTS, log } from "./types.js";

const MEMVID_PATH = process.env.MEMVID_PATH || "memvid";
const MEMVID_VERBOSE = process.env.MEMVID_VERBOSE === "1";

export async function executeMemvid(
  args: string[],
  options: ExecuteOptions = {}
): Promise<CliResult> {
  const { timeout = TIMEOUTS.DEFAULT, skipJson = false } = options;

  const fullArgs = [...args];
  if (!skipJson) {
    fullArgs.push("--json");
  }
  if (MEMVID_VERBOSE) {
    fullArgs.push("--verbose");
  }

  const command = args[0] || "unknown";
  log("debug", `Executing: memvid ${command}`, { args: args.slice(1, 3) });

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
        error: `Command timed out after ${timeout}ms: memvid ${args.join(" ")}`,
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
      log("error", `Spawn failed: ${err.message}`, { path: MEMVID_PATH });
      resolve({
        success: false,
        error: `Failed to spawn memvid: ${err.message}. Is MEMVID_PATH set correctly? Current: ${MEMVID_PATH}`,
        exitCode: -1,
      });
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
        resolve({
          success: false,
          error: stderrStr || stdoutStr || `Process exited with code ${code}`,
          stderr: stderrStr,
          exitCode: code ?? -1,
        });
      }
    });
  });
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
