import type { Request, Response, NextFunction } from "express";
import { getIp } from "./audit.js";

/**
 * Rate limit em memória (PRD seção 19). Suficiente para uma instância única;
 * para múltiplas réplicas, trocar por Redis. Janela deslizante simples por chave.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = "" } = opts;
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${getIp(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retry = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retry));
      return res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
    }
    next();
  };
}

// Limpeza periódica dos buckets expirados.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}, 60 * 1000).unref?.();
