import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const DEV_PORT = "3000";
const NEXT_DEV_LOCK = path.join(process.cwd(), ".next", "dev", "lock");

function runPowerShell(command) {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

function getPidOnPort(port) {
  const command = `
    $connection = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if ($connection) {
      $connection.OwningProcess
    }
  `;

  try {
    return runPowerShell(command);
  } catch {
    return "";
  }
}

function getProcessInfo(pid) {
  const command = `
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue

    if ($process) {
      [PSCustomObject]@{
        ProcessId = $process.ProcessId
        Name = $process.Name
        CommandLine = $process.CommandLine
      } | ConvertTo-Json -Compress
    }
  `;

  const output = runPowerShell(command);
  return output ? JSON.parse(output) : null;
}

function stopProcess(pid) {
  runPowerShell(`Stop-Process -Id ${pid} -Force`);
}

function getPidFromLock() {
  try {
    const lock = readFileSync(NEXT_DEV_LOCK, "utf8");
    const parsed = JSON.parse(lock);
    return parsed.pid ? String(parsed.pid) : "";
  } catch (error) {
    if (error instanceof SyntaxError) {
      try {
        const lock = readFileSync(NEXT_DEV_LOCK, "utf8");
        const match = lock.match(/\bpid\b\D+(\d+)/i) ?? lock.match(/\bPID\b\D+(\d+)/);
        return match?.[1] ?? "";
      } catch {
        return "";
      }
    }

    return "";
  }
}

function hasActiveNextDevLock() {
  try {
    readFileSync(NEXT_DEV_LOCK);
    return false;
  } catch (error) {
    return ["EBUSY", "EPERM"].includes(error.code);
  }
}

try {
  const lockPid = getPidFromLock();

  if (lockPid && lockPid !== String(process.pid)) {
    console.log(`Stopping existing Next dev server from lock file (PID ${lockPid})...`);
    stopProcess(lockPid);
    process.exit(0);
  }

  const pid = getPidOnPort(DEV_PORT);

  if (!pid) {
    process.exit(0);
  }

  const processInfo = getProcessInfo(pid);
  const commandLine = processInfo?.CommandLine?.toLowerCase() ?? "";
  const name = processInfo?.Name?.toLowerCase() ?? "";
  const isNextDev =
    (name === "node.exe" &&
      commandLine.includes("next") &&
      commandLine.includes("dev")) ||
    hasActiveNextDevLock();

  if (!isNextDev) {
    console.warn(
      `Port ${DEV_PORT} is already in use by PID ${pid}, but it does not look like Next dev. Leaving it running.`,
    );
    process.exit(0);
  }

  console.log(`Stopping existing Next dev server on port ${DEV_PORT} (PID ${pid})...`);
  stopProcess(pid);
} catch (error) {
  console.warn(`Could not check for an existing Next dev server: ${error.message}`);
}
