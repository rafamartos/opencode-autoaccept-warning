export function permissionMode(config, inlineConfig, args) {
  if (args.includes("--auto")) return "autoaccept";
  const override = inlineConfig ? JSON.parse(inlineConfig) : undefined;
  const mode = override?.session?.permissions ?? config?.session?.permissions ?? "prompt";
  if (mode !== "prompt" && mode !== "autoaccept") {
    throw new Error("Unknown permission mode");
  }
  return mode;
}
