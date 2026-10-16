import { describe, expect, it } from "vitest";
import { describeProblem, isValidName, normalise, problemWith } from "../name";

/**
 * These rules exist twice — here and in the contract — so they are tested against the same cases
 * the Solidity suite uses. A divergence shows up as a name the UI offers and the chain refuses.
 */
describe("problemWith", () => {
  it("accepts what the contract accepts", () => {
    for (const name of ["abc", "alice", "a-b", "bot-2026", "007", "a".repeat(32)]) {
      expect(problemWith(name), name).toBeNull();
    }
  });

  it("rejects lengths outside the contract's bounds", () => {
    expect(problemWith("ab")).toEqual({ kind: "too-short", length: 2 });
    expect(problemWith("a".repeat(33))).toEqual({ kind: "too-long", length: 33 });
  });

  it("rejects leading and trailing hyphens", () => {
    expect(problemWith("-alice")).toEqual({ kind: "edge-hyphen" });
    expect(problemWith("alice-")).toEqual({ kind: "edge-hyphen" });
    expect(problemWith("a-b-c")).toBeNull();
  });

  it("rejects uppercase, spaces, dots and symbols", () => {
    expect(problemWith("Alice")?.kind).toBe("bad-character");
    expect(problemWith("my name")?.kind).toBe("bad-character");
    expect(problemWith("alice.bot")?.kind).toBe("bad-character");
    expect(problemWith("alice_bot")?.kind).toBe("bad-character");
  });

  // The contract measures bytes. A multi-byte character must read as a character problem, not as
  // a confusing length error.
  it("reports a non-ASCII character as a character problem", () => {
    expect(problemWith("alicé")?.kind).toBe("bad-character");
  });

  it("reports the edge-hyphen rule before the character scan", () => {
    // "-abc" is otherwise all legal characters; the useful message is about the hyphen.
    expect(problemWith("-abc")).toEqual({ kind: "edge-hyphen" });
  });
});

describe("describeProblem", () => {
  it("says something specific for each common mistake", () => {
    expect(describeProblem(problemWith("Alice")!)).toMatch(/lowercase/i);
    expect(describeProblem(problemWith("my name")!)).toMatch(/spaces/i);
    expect(describeProblem(problemWith("alice.bot")!)).toMatch(/\.bot/);
    expect(describeProblem(problemWith("ab")!)).toMatch(/at least 3/i);
  });
});

describe("normalise", () => {
  it("takes what a user is likely to paste", () => {
    expect(normalise("  Alice.bot ")).toBe("alice");
    expect(normalise("ALICE")).toBe("alice");
    expect(normalise("alice")).toBe("alice");
  });

  it("only strips a trailing .bot", () => {
    expect(normalise("alice.bot.bot")).toBe("alice.bot");
  });
});

describe("isValidName", () => {
  it("agrees with problemWith", () => {
    expect(isValidName("alice")).toBe(true);
    expect(isValidName("Alice")).toBe(false);
  });
});
