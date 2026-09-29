import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE_DIR = __dirname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const path = join(dir, d.name);
    if (d.isDirectory()) return sourceFiles(path);
    return /\.ts$/.test(d.name) && !/\.test\.ts$/.test(d.name) ? [path] : [];
  });
}

describe("engine purity", () => {
  it("imports nothing from React, Next, the DB or Node", () => {
    const files = sourceFiles(ENGINE_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const imports = [...readFileSync(file, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map(
        (m) => m[1],
      );
      for (const spec of imports) expect(spec, `${file} imports ${spec}`).toMatch(/^\.\.?\//);
    }
  });
});
