import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (...segments) =>
  JSON.parse(await readFile(path.join(root, ...segments), "utf8"));

const packageJson = await readJson("package.json");
const codexManifest = await readJson(".codex-plugin", "plugin.json");
const claudeManifest = await readJson(".claude-plugin", "plugin.json");
const codexMarketplace = await readJson(".agents", "plugins", "marketplace.json");
const claudeMarketplace = await readJson(".claude-plugin", "marketplace.json");
const mcpConfig = await readJson(".mcp.json");

for (const manifest of [codexManifest, claudeManifest]) {
  assert.equal(manifest.name, packageJson.name);
  assert.equal(manifest.version, packageJson.version);
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description);
  assert.ok(manifest.author?.name);
  assert.equal(manifest.license, "MIT");
  assert.ok(!JSON.stringify(manifest).includes("[TODO:"));

  for (const key of ["homepage", "repository"]) {
    assert.equal(new URL(manifest[key]).protocol, "https:");
  }

  for (const key of ["skills", "mcpServers"]) {
    const target = path.resolve(root, manifest[key]);
    assert.ok(target.startsWith(`${root}${path.sep}`));
    await access(target);
  }
}

assert.ok(codexManifest.interface?.displayName);
assert.ok(codexManifest.interface?.shortDescription);
assert.ok(codexManifest.interface?.longDescription);
assert.ok(codexManifest.interface?.developerName);
assert.ok(codexManifest.interface?.category);

const prompts = codexManifest.interface.defaultPrompt;
assert.ok(Array.isArray(prompts));
assert.ok(prompts.length > 0 && prompts.length <= 3);
assert.ok(prompts.every((prompt) => prompt.length <= 128));

assert.equal(codexMarketplace.name, "zar-jobs");
assert.equal(codexMarketplace.plugins.length, 1);
assert.equal(codexMarketplace.plugins[0].name, packageJson.name);
assert.equal(codexMarketplace.plugins[0].source.source, "url");
assert.equal(
  codexMarketplace.plugins[0].source.url,
  "https://github.com/abelvalle/zar-jobs-ai-connector.git"
);
assert.equal(codexMarketplace.plugins[0].source.ref, `v${packageJson.version}`);
assert.equal(codexMarketplace.plugins[0].policy.installation, "AVAILABLE");
assert.ok(["ON_INSTALL", "ON_USE"].includes(codexMarketplace.plugins[0].policy.authentication));

assert.equal(claudeMarketplace.name, "zar-jobs");
assert.equal(claudeMarketplace.version, packageJson.version);
assert.equal(claudeMarketplace.plugins.length, 1);
assert.equal(claudeMarketplace.plugins[0].name, packageJson.name);
assert.equal(claudeMarketplace.plugins[0].version, packageJson.version);
assert.equal(claudeMarketplace.plugins[0].source.source, "github");
assert.equal(claudeMarketplace.plugins[0].source.repo, "abelvalle/zar-jobs-ai-connector");
assert.equal(claudeMarketplace.plugins[0].source.ref, `v${packageJson.version}`);

const mcpServer = mcpConfig.mcpServers?.["zar-jobs"];
assert.equal(mcpServer.command, "npx");
assert.deepEqual(mcpServer.args.slice(0, 3), [
  "--yes",
  "--package",
  `github:abelvalle/zar-jobs-ai-connector#v${packageJson.version}`,
]);
assert.equal(mcpServer.args[3], packageJson.name);
assert.equal(packageJson.bin?.[packageJson.name], "./src/cli.mjs");

for (const removedPath of [
  "Dockerfile",
  ".dockerignore",
  path.join("src", "http-server.mjs"),
  path.join("test", "http-server.test.mjs"),
]) {
  await assert.rejects(access(path.join(root, removedPath)));
}

console.log("Codex, Claude Code, marketplace and local MCP manifests are valid.");
