import { randomUUID } from "node:crypto";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { permissionMode } from "./state.mjs";

export async function togglePermissions(configPath, inlineConfig, args) {
  const override = inlineConfig ? JSON.parse(inlineConfig) : undefined;
  if (args.includes("--auto")) {
    throw new Error("Permissions are locked by --auto. Restart OpenCode without --auto to change them.");
  }
  if (override?.session?.permissions != null) {
    throw new Error("Permissions are overridden by OPENCODE_CLI_CONFIG_CONTENT. Remove that override first.");
  }

  const contents = await readFile(configPath, "utf8");
  const config = JSON.parse(contents);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("CLI settings must be a JSON object.");
  }
  if (config.session != null && (typeof config.session !== "object" || Array.isArray(config.session))) {
    throw new Error("CLI session settings must be a JSON object.");
  }
  const next = permissionMode(config, inlineConfig, args) === "autoaccept" ? "prompt" : "autoaccept";
  config.session = { ...config.session, permissions: next };
  const temporaryPath = `${configPath}.${randomUUID()}.tmp`;
  try {
    const info = await stat(configPath);
    await writeFile(temporaryPath, `${JSON.stringify(config, null, 2)}\n`, { mode: info.mode & 0o777, flag: "wx" });
    if ((await readFile(configPath, "utf8")) !== contents) {
      throw new Error("CLI settings changed while switching permissions. Try again.");
    }
    await rename(temporaryPath, configPath);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  return next;
}
