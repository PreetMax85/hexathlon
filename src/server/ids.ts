// No 0/O/1/I/l so an id is easy to read out or retype.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** Random 8-character challenge id (31^8 ≈ 8.5e11 possibilities). */
export function newChallengeId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
