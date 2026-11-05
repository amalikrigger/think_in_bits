// The engine owns the team names; reading them here fails this test if one is added without a colour.
import { TEAM_NAMES } from "../../../../packages/engine/src/state";
import { describe, expect, it } from "vitest";
import { teamColor, TILES } from "./tiles";

describe("teamColor", () => {
  it("gives each team its own colour, whatever its rank", () => {
    expect(teamColor("Teal")).toBe(TILES[2]!.color);
    expect(teamColor("Coral")).toBe(TILES[1]!.color);
  });

  it("has a distinct colour for every team name the engine can assign", () => {
    const colors = TEAM_NAMES.map(teamColor);
    expect(colors).not.toContain("var(--bb-text-muted)");
    expect(new Set(colors).size).toBe(TEAM_NAMES.length);
  });

  it("falls back to a neutral colour for an unknown name", () => {
    expect(teamColor("Plaid")).toBe("var(--bb-text-muted)");
  });
});
