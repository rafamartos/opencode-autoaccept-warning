import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Plugin } from "@opencode/plugin/tui";
import { createSignal, Show } from "solid-js";
import { permissionMode } from "./state.mjs";
import { togglePermissions } from "./settings.mjs";

export default Plugin.define({
  id: "local.autoaccept-warning",
  setup(context) {
    const [mode, setMode] = createSignal("unknown");
    const configPath = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode", "cli.json");
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let switching = false;

    // The public plugin API does not expose the TUI's permission preference.
    // Mirror its documented file, environment override, and --auto precedence.
    async function refresh() {
      try {
        const contents = await readFile(configPath, "utf8").catch((error) => {
          if (error.code === "ENOENT") return "{}";
          throw error;
        });
        const next = permissionMode(JSON.parse(contents), process.env.OPENCODE_CLI_CONFIG_CONTENT, process.argv);
        if (!stopped && !switching) setMode(next);
      } catch {
        if (!stopped && !switching) setMode("unknown");
      } finally {
        if (!stopped) timer = setTimeout(refresh, 1000);
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "local.autoaccept-warning.toggle",
          title: "Toggle permission mode (prompt / auto accept)",
          group: "Permissions",
          bind: "<leader>p",
          palette: true,
          async run() {
            if (switching || stopped) return;
            switching = true;
            try {
              const next = await togglePermissions(configPath, process.env.OPENCODE_CLI_CONFIG_CONTENT, process.argv);
              if (stopped) return;
              setMode(next);
              context.ui.toast.show({
                message: next === "autoaccept" ? "⚠ Auto accept enabled: permission requests are approved automatically." : "Prompt mode enabled: permission requests require approval.",
                variant: next === "autoaccept" ? "warning" : "success",
              });
            } catch (error) {
              if (!stopped) context.ui.toast.show({ message: error instanceof Error ? error.message : "Unable to change permission mode.", variant: "error" });
            } finally {
              switching = false;
            }
          },
        },
      ],
      bindings: ["local.autoaccept-warning.toggle"],
    }));

    const removeSlot = context.ui.slot({
      prepend: "prompt.footer.status",
      render: () => (
        <Show when={mode() !== "prompt"}>
          <text fg="#FFD700" flexShrink={0} marginRight={1}>
            <b>{mode() === "autoaccept" ? "⚠ AUTO ACCEPT" : "? PERMISSIONS UNKNOWN"}</b>
          </text>
        </Show>
      ),
    });
    void refresh();

    return () => {
      stopped = true;
      clearTimeout(timer);
      removeSlot();
    };
  },
});
