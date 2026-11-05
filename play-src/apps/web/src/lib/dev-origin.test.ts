import { describe, expect, it } from "vitest";
import { devProxyOrigin } from "./dev-origin";

const DEV = "http://localhost:5173";

describe("devProxyOrigin", () => {
  it("passes a page served from the Mac's LAN address on as the dev origin", () => {
    expect(devProxyOrigin("http://192.168.10.154:5173", "192.168.10.154:5173", DEV)).toBe(DEV);
  });

  it("follows the address when the network changes", () => {
    expect(devProxyOrigin("http://10.0.0.7:5173", "10.0.0.7:5173", DEV)).toBe(DEV);
  });

  it("leaves another site's origin alone, so the server still refuses it", () => {
    expect(devProxyOrigin("https://evil.example", "192.168.10.154:5173", DEV)).toBeNull();
    expect(devProxyOrigin("http://evil.example:5173", "192.168.10.154:5173", DEV)).toBeNull();
  });

  it("does not trust a page on another port of the same machine", () => {
    expect(devProxyOrigin("http://192.168.10.154:8080", "192.168.10.154:5173", DEV)).toBeNull();
  });

  it("does not treat https on the same host as the plain dev page", () => {
    expect(devProxyOrigin("https://192.168.10.154:5173", "192.168.10.154:5173", DEV)).toBeNull();
  });

  it("does nothing without an Origin (scripts, same-origin GETs) or a Host", () => {
    expect(devProxyOrigin(undefined, "192.168.10.154:5173", DEV)).toBeNull();
    expect(devProxyOrigin("http://192.168.10.154:5173", undefined, DEV)).toBeNull();
  });
});
