import { Router, Request, Response } from "express";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = Router();

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function getDiskUsage(): Promise<{ used: number; total: number; percent: number; usedFormatted: string; totalFormatted: string } | null> {
  try {
    const { stdout } = await execAsync("df -B1 / 2>/dev/null | tail -1");
    const parts = stdout.trim().split(/\s+/);
    if (parts.length >= 5) {
      const total = Number(parts[1]);
      const used = Number(parts[2]);
      return {
        total,
        used,
        percent: Math.round((used / total) * 100),
        usedFormatted: formatBytes(used),
        totalFormatted: formatBytes(total),
      };
    }
  } catch {}
  return null;
}

async function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus = os.cpus();
    const start = cpus.map((cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return { idle: cpu.times.idle, total };
    });

    setTimeout(() => {
      const end = os.cpus();
      let totalDelta = 0;
      let idleDelta = 0;
      end.forEach((cpu, i) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        totalDelta += total - start[i].total;
        idleDelta += cpu.times.idle - start[i].idle;
      });
      const usage = totalDelta > 0 ? Math.round(((totalDelta - idleDelta) / totalDelta) * 100) : 0;
      resolve(Math.min(100, Math.max(0, usage)));
    }, 500);
  });
}

router.get("/stats", async (_req: Request, res: Response) => {
  const [cpuUsage, disk] = await Promise.all([getCpuUsage(), getDiskUsage()]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.json({
    cpu: {
      usage: cpuUsage,
      count: os.cpus().length,
      model: os.cpus()[0]?.model?.split("@")[0]?.trim() || "Unknown",
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percent: Math.round((usedMem / totalMem) * 100),
      usedFormatted: formatBytes(usedMem),
      totalFormatted: formatBytes(totalMem),
    },
    disk: disk || {
      percent: 0,
      usedFormatted: "N/A",
      totalFormatted: "N/A",
    },
    system: {
      uptime: os.uptime(),
      uptimeFormatted: formatUptime(os.uptime()),
      platform: os.platform(),
      hostname: os.hostname(),
      loadAvg: os.loadavg().map((v) => v.toFixed(2)),
    },
  });
});

export default router;
