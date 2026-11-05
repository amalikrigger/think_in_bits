import { afterEach, describe, expect, it, vi } from "vitest";
import { playerSeat } from "./storage";

// Locked-down school Chromebooks and Safari with "Block all cookies" throw on any storage
// access. The seat must still survive a Wi-Fi blip there: only a full refresh may lose it.

const blockedWindow = {
  get localStorage(): Storage {
    throw new DOMException("The operation is insecure.", "SecurityError");
  },
  get sessionStorage(): Storage {
    throw new DOMException("The operation is insecure.", "SecurityError");
  },
};

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

afterEach(() => {
  playerSeat.set("123456", null);
  vi.unstubAllGlobals();
});

describe("playerSeat", () => {
  it("keeps the seat for this page when the device blocks storage, so a reconnect resumes instead of rejoining", () => {
    vi.stubGlobal("window", blockedWindow);

    playerSeat.set("123456", { token: "seat-token", nickname: "Dana" });

    expect(playerSeat.get("123456")).toEqual({ token: "seat-token", nickname: "Dana" });
  });

  it("forgets the seat everywhere when it is cleared", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
    playerSeat.set("123456", { token: "seat-token", nickname: "Dana" });

    playerSeat.set("123456", null);

    expect(playerSeat.get("123456")).toBeNull();
  });

  it("still finds a seat saved before a refresh, when storage works", () => {
    const local = memoryStorage();
    local.setItem("bitblitz:seat:123456", JSON.stringify({ token: "from-last-page", nickname: "Dana" }));
    vi.stubGlobal("window", { localStorage: local, sessionStorage: memoryStorage() });

    expect(playerSeat.get("123456")).toEqual({ token: "from-last-page", nickname: "Dana" });
  });
});
