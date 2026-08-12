import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

assert.equal(manifest.name, path.basename(root));
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
assert.ok(manifest.description);
assert.ok(manifest.author?.name);
assert.ok(manifest.interface?.displayName);
assert.ok(manifest.interface?.shortDescription);
assert.ok(manifest.interface?.longDescription);
assert.ok(manifest.interface?.developerName);
assert.ok(manifest.interface?.category);
assert.ok(!JSON.stringify(manifest).includes("[TODO:"));

for (const key of ["homepage", "repository"]) {
  assert.doesNotThrow(() => new URL(manifest[key]));
  assert.equal(new URL(manifest[key]).protocol, "https:");
}

for (const key of ["skills", "mcpServers"]) {
  const target = path.resolve(root, manifest[key]);
  assert.ok(target.startsWith(`${root}${path.sep}`));
  await access(target);
}

const prompts = manifest.interface.defaultPrompt;
assert.ok(Array.isArray(prompts));
assert.ok(prompts.length > 0 && prompts.length <= 3);
assert.ok(prompts.every((prompt) => prompt.length <= 128));

console.log("Plugin manifest and referenced paths are valid.");
