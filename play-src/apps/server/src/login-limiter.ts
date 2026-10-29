import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import { reserveLoginAttempt, type LoginAttempts, type LoginDecision } from "./rate-limit";

/** One instance per client IP: remembers recent failed teacher logins. */
export class LoginLimiter extends DurableObject<Env> {
  /** Admits an attempt and records it as a failure until `succeed` clears it; one storage round trip, so it is atomic. */
  async reserve(): Promise<LoginDecision> {
    const { decision, attempts } = reserveLoginAttempt(await this.attempts(), Date.now());
    if (decision.allowed) await this.ctx.storage.put("attempts", attempts);
    return decision;
  }

  async succeed(): Promise<void> {
    await this.ctx.storage.delete("attempts");
  }

  private async attempts(): Promise<LoginAttempts> {
    return (await this.ctx.storage.get<LoginAttempts>("attempts")) ?? { failures: [] };
  }
}
