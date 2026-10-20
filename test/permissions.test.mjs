import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { permissionMode } from "../state.mjs";
import { togglePermissions } from "../settings.mjs";

test("permission precedence and defaults", () => {
  assert.equal(permissionMode({}, undefined, []), "prompt");
  assert.equal(permissionMode({ session: { permissions: "autoaccept" } }, undefined, []), "autoaccept");
  assert.equal(permissionMode({ session: { permissions: "autoaccept" } }, '{"session":{"permissions":"prompt"}}', []), "prompt");
  assert.equal(permissionMode({}, '{"session":{"permissions":"autoaccept"}}', []), "autoaccept");
  assert.equal(permissionMode({}, '{"theme":{"name":"opencode"}}', []), "prompt");
  assert.equal(permissionMode({}, '{"session":{"permissions":"prompt"}}', ["--auto"]), "autoaccept");
  assert.throws(() => permissionMode({}, "{", []));
  assert.throws(() => permissionMode({ session: { permissions: "invalid" } }, undefined, []));
});

async function fixture(t, contents) {
  const directory = await mkdtemp(join(process.env.OPENCODE_TEST_TMPDIR || tmpdir(), "autoaccept-warning-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "cli.json");
  if (contents !== undefined) await writeFile(path, contents);
  return { directory, path };
}

test("toggle both directions and preserve unrelated settings", async (t) => {
  const original = { theme: { name: "opencode" }, session: { permissions: "autoaccept", thinking: "show" }, plugins: ["example"] };
  const { directory, path } = await fixture(t, JSON.stringify(original));
  assert.equal(await togglePermissions(path, undefined, []), "prompt");
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), { ...original, session: { ...original.session, permissions: "prompt" } });
  assert.equal(await togglePermissions(path, undefined, []), "autoaccept");
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), original);
  assert.deepEqual(await readdir(directory), ["cli.json"]);
});

test("missing preference defaults to prompt and unrelated environment overrides are allowed", async (t) => {
  const { path } = await fixture(t, "{}");
  assert.equal(await togglePermissions(path, '{"theme":{"name":"opencode"}}', []), "autoaccept");
});

test("locked modes are rejected without modifying the file", async (t) => {
  const { path } = await fixture(t, "{}");
  await assert.rejects(togglePermissions(path, undefined, ["--auto"]), /locked/);
  await assert.rejects(togglePermissions(path, '{"session":{"permissions":"prompt"}}', []), /overridden/);
  await assert.rejects(togglePermissions(path, '{"session":{"permissions":"autoaccept"}}', []), /overridden/);
  assert.equal(await readFile(path, "utf8"), "{}");
});

for (const contents of ["{", "[]", "null", '{"session":[]}', '{"session":"invalid"}', '{"session":{"permissions":"invalid"}}']) {
  test(`invalid settings are preserved: ${contents}`, async (t) => {
    const { directory, path } = await fixture(t, contents);
    await assert.rejects(togglePermissions(path, undefined, []));
    assert.equal(await readFile(path, "utf8"), contents);
    assert.deepEqual(await readdir(directory), ["cli.json"]);
  });
}

test("missing file is not created by the shortcut", async (t) => {
  const { directory, path } = await fixture(t);
  await assert.rejects(togglePermissions(path, undefined, []), { code: "ENOENT" });
  assert.deepEqual(await readdir(directory), []);
});

test("invalid inline JSON leaves settings untouched", async (t) => {
  const { path } = await fixture(t, "{}");
  await assert.rejects(togglePermissions(path, "{", []));
  assert.equal(await readFile(path, "utf8"), "{}");
});
