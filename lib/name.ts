/**
 * The naming rules, in TypeScript.
 *
 * These duplicate `HandleRegistry._validate`, which is a thing to be uneasy about: two copies of a
 * rule drift. The duplication buys instant feedback as someone types, instead of a chain read per
 * keystroke or — worse — a failed transaction to learn that a space is not allowed.
 *
 * The drift is contained two ways. The contract exposes `isValid` as a `pure` function, so the UI
 * can check its own verdict against the chain's before offering to spend gas; and the contract
 * remains the authority, with its reverts decoded and shown. This file is a courtesy, never a
 * substitute.
 */

export const MIN_LENGTH = 3;
export const MAX_LENGTH = 32;

export type NameProblem =
  | { kind: "empty" }
  | { kind: "too-short"; length: number }
  | { kind: "too-long"; length: number }
  | { kind: "edge-hyphen" }
  | { kind: "bad-character"; character: string; position: number };

/**
 * @returns the first problem with a name, or null if it is well-formed.
 *
 * Length is measured in bytes, as the contract measures it. For an ASCII-only charset the two
 * agree, but a user pasting "café" must be told the character is wrong rather than being given a
 * length error computed from UTF-16 units.
 */
export function problemWith(name: string): NameProblem | null {
  if (name.length === 0) return { kind: "empty" };

  const bytes = new TextEncoder().encode(name);
  if (bytes.length < MIN_LENGTH) return { kind: "too-short", length: bytes.length };
  if (bytes.length > MAX_LENGTH) return { kind: "too-long", length: bytes.length };

  // Checked before the character scan so "-abc" reports the hyphen rule rather than pointing at a
  // character that is otherwise perfectly legal.
  if (name.startsWith("-") || name.endsWith("-")) return { kind: "edge-hyphen" };

  for (let i = 0; i < name.length; i++) {
    const c = name[i];
    const allowed = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-";
    if (!allowed) return { kind: "bad-character", character: c, position: i };
  }

  return null;
}

export function isValidName(name: string): boolean {
  return problemWith(name) === null;
}

/** The problem, in words, for a user who is mid-keystroke. */
export function describeProblem(problem: NameProblem): string {
  switch (problem.kind) {
    case "empty":
      return "Type a name to check it.";
    case "too-short":
      return `Names are at least ${MIN_LENGTH} characters.`;
    case "too-long":
      return `Names are at most ${MAX_LENGTH} characters — that is ${problem.length}.`;
    case "edge-hyphen":
      return "A name cannot start or end with a hyphen.";
    case "bad-character":
      if (problem.character === " ") return "Names cannot contain spaces.";
      if (problem.character >= "A" && problem.character <= "Z")
        // Folding case in the contract would mean the stored name is not the typed one, and every
        // off-chain consumer would have to know to fold too.
        return "Names are lowercase only.";
      if (problem.character === ".") return "Leave off the .bot — it is implied.";
      return `"${problem.character}" is not allowed. Letters, digits and hyphens only.`;
  }
}

/** Trim what a user pasted into something worth checking: "Alice.bot " becomes "alice". */
export function normalise(input: string): string {
  return input.trim().toLowerCase().replace(/\.bot$/, "");
}
