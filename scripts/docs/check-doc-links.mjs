import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const files = execFileSync("rg", [
  "--files",
  "-g",
  "*.md",
  "-g",
  "!node_modules/**",
  "-g",
  "!frontend/node_modules/**",
], { cwd: repoRoot, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const broken = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const relativeFile of files) {
  const absoluteFile = path.join(repoRoot, relativeFile);
  const content = fs.readFileSync(absoluteFile, "utf8");

  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:[a-z]+:|#)/i.test(rawTarget)) continue;

    const targetWithoutAnchor = decodeURIComponent(rawTarget.split("#", 1)[0]);
    if (!targetWithoutAnchor) continue;

    const resolved = path.resolve(path.dirname(absoluteFile), targetWithoutAnchor);
    if (!fs.existsSync(resolved)) {
      const line = content.slice(0, match.index).split("\n").length;
      broken.push(`${relativeFile}:${line} -> ${rawTarget}`);
    }
  }
}

if (broken.length) {
  console.error(`Broken local Markdown links: ${broken.length}`);
  console.error(broken.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated ${files.length} Markdown files; no broken local links found.`);
}
