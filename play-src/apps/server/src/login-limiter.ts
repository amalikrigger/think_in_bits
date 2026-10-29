import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import { decideLogin, recordFailure, type LoginAttempts, type LoginDecision } from "./rate-limit";

/** One instance per client IP: remembers recent failed teacher logins. */
export class LoginLimiter extends DurableObject<Env> {
  async check(): Promise<LoginDecision> {
    return decideLogin(await this.attempts(), Date.now());
  }

  async fail(): Promise<void> {
    await this.ctx.storage.put("attempts", recordFailure(await this.attempts(), Date.now()));
  }

  async succeed(): Promise<void> {
    await this.ctx.storage.delete("attempts");
  }

  private async attempts(): Promise<LoginAttempts> {
    return (await this.ctx.storage.get<LoginAttempts>("attempts")) ?? { failures: [] };
  }
}
