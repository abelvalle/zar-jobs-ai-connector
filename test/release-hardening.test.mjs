import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const workflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

test("pins every published runtime dependency exactly", () => {
  for (const [name, version] of Object.entries(packageJson.dependencies)) {
    assert.match(
      version,
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
      `${name} must use an exact version`,
    );
  }
});

test("runs the release gates on Linux, Windows, and macOS", () => {
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
  assert.match(workflow, /runs-on: \$\{\{ matrix\.os \}\}/);
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /npm run smoke:portable/);
});
