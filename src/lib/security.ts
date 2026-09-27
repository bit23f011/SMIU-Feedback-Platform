import { headers } from "next/headers";

/*
  Rate-limit + client-IP helpers.

  IMPORTANT (production honesty): neeche wala limiter IN-MEMORY hai. Yeh single
  instance ke liye theek hai (dev / single server), magar serverless ya multi-
  instance deploy par reliable nahi - har instance ka apna map hota hai.
  Phase 2 (auth) me isko durable store (Supabase table ya Upstash Redis) se
  replace karna hai. Security ka asli boundary hamesha DB/RLS + server actions
  hai, yeh limiter sirf abuse ko slow karta hai.
*/

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

// Fixed-window limiter. key = pehchan (jaise `${ip}:${action}`).
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// getClientIp: proxy headers se best-effort client IP. Spoofable hai, isliye
// ise rate-limit key ki tarah use karo, kabhi authorization ke liye nahi.
export function getClientIp(): string {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return h.get("x-real-ip") ?? "unknown";
}
