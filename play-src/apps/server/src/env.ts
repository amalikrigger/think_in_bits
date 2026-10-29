import type { GameRoom } from "./game-room";
import type { LoginLimiter } from "./login-limiter";

export type Env = {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  LOGIN_LIMITER: DurableObjectNamespace<LoginLimiter>;
  ALLOWED_ORIGINS: string;
  /** Secret: `pbkdf2-sha256$<iterations>$<salt>$<hash>` from `pnpm hash-passphrase`. */
  HOST_PASSPHRASE_HASH?: string;
  /** Secret: at least 32 random characters, signs host session tokens. */
  SESSION_SECRET?: string;
};
