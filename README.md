# OpenCode Autoaccept Warning

A small **OpenCode V2 CLI plugin** that makes automatic permission approval
harder to overlook, without changing your theme.

```text
⚠ AUTO ACCEPT
```

The indicator appears in **bold, bright yellow** at the start of the prompt
footer's status area. It disappears in `prompt` mode. An unreadable or invalid
permission configuration displays `? PERMISSIONS UNKNOWN` instead.

## Features

- Persistent visual reminder when autoaccept is enabled.
- **Ctrl+X, then P** to toggle between `prompt` and `autoaccept`.
- Command-palette action: **Toggle permission mode (prompt / auto accept)**.
- Confirmation toast, including `⚠` when autoaccept is enabled.
- Preserves your theme, native `auto` label, and unrelated CLI settings.

## Requirements

OpenCode **V2** with CLI plugin slots and keymap layers. V1 is not supported.
The plugin uses the documented `@opencode/plugin/tui` API and is loaded by
OpenCode; do not run `tui.tsx` directly. No API key or model is required.
The initial plugin was manually tested on macOS; other platforms have not
been manually verified. No minimum V2 patch version has been established.

## Install

1. Clone the repository outside OpenCode's auto-discovered plugin directories:

   ```sh
   git clone https://github.com/rafamartos/opencode-autoaccept-warning.git "$HOME/opencode-autoaccept-warning"
   ```

2. Add the checkout's **absolute path** to the existing `plugins` array in
   `~/.config/opencode/cli.json`. If `XDG_CONFIG_HOME` is set, use
   `$XDG_CONFIG_HOME/opencode/cli.json` instead. Preserve your other settings
   and plugin entries:

   ```json
   {
     "$schema": "https://opencode.ai/v2/cli.json",
     "plugins": ["/absolute/path/to/opencode-autoaccept-warning"]
   }
   ```

   Replace `/absolute/path/to/opencode-autoaccept-warning` with the actual
   checkout path (for example, `/Users/alex/opencode-autoaccept-warning`).
   Configure it in **`cli.json`**, not `opencode.jsonc`, because it is CLI-only.
   This repository is not published to npm; use the local path above.

3. Restart the OpenCode TUI. If permissions are set to `autoaccept`, the yellow
   warning appears. Otherwise, it stays hidden.

No build or `npm install` is required for this local plugin. OpenCode resolves
the TUI and Solid imports at runtime. Avoid loading both this checkout and
another copy of the plugin.

## Usage

Press **Ctrl+X**, release it, then press **P**. The binding is `<leader>p`, so
it follows your custom leader if you changed the default. It is a sequence,
not Ctrl+X+P pressed together. Alternatively, press **Ctrl+P** and choose
**Toggle permission mode (prompt / auto accept)**.

| Mode | Indicator | Behavior |
| --- | --- | --- |
| `prompt` | Hidden | Permission requests wait for approval. |
| `autoaccept` | `⚠ AUTO ACCEPT` | Permission requests are accepted automatically. |
| Unknown | `? PERMISSIONS UNKNOWN` | The plugin cannot determine the configured mode. |

The shortcut saves `session.permissions` in the **global** `cli.json` using
an atomic replacement, preserving unrelated JSON settings. OpenCode reloads
the setting automatically. Other TUI instances using that file also receive
the change. File formatting is normalized to two-space JSON indentation.

You can also change the mode through **Ctrl+P → Open settings → Session →
Permissions**. The indicator checks the file once per second.

## Safety and limitations

**This plugin is a reminder, not a security boundary.** Autoaccept approves
permission requests automatically; returning to prompt does not undo actions
that were already approved or revoke saved approvals. Installing the plugin
does not itself enable autoaccept.

The public TUI plugin API does not expose the effective permission preference.
The plugin therefore mirrors these inputs, rather than querying internal TUI
state:

1. Launch argument `--auto` (highest priority).
2. `OPENCODE_CLI_CONFIG_CONTENT.session.permissions`.
3. Global `cli.json`'s `session.permissions`, defaulting to `prompt`.

The shortcut refuses to change settings when `--auto` or a non-null environment
permission override locks the mode. Restart without `--auto`, or remove the
environment override, before using the shortcut.

Missing files/settings are treated as `prompt` by the indicator. Unreadable
files, invalid JSON, or unsupported permission-mode values produce the unknown
indicator; checks retry every second. The shortcut refuses to overwrite invalid
settings or create a missing file. Create valid CLI settings through OpenCode
first. Normal concurrent edits detected before replacement abort the write,
but this is not a cross-process locking mechanism; avoid editing settings
simultaneously from multiple clients.

The indicator is in the prompt footer, **not** in the agent/model line. Its
yellow color is local to the indicator, not a theme override. The plugin does
not make network requests or send configuration to a model or external service.

## Update or uninstall

To update, pull the checkout and restart the TUI:

```sh
git -C "$HOME/opencode-autoaccept-warning" pull --ff-only
```

To uninstall, remove its path from `cli.json`'s `plugins` array and restart the
TUI. **Uninstalling does not change your permission mode.** Set permissions to
`prompt` first if you want interactive approvals.

## Development

Tests use Node.js 22+ and its built-in test runner, with no dependencies:

```sh
npm test
```

Tests cover permission precedence, toggling, unrelated-setting preservation,
override guards, and rejection of invalid settings. They use temporary files,
not your actual OpenCode configuration. TUI rendering and keyboard interaction
require a manual OpenCode check.

## References

- [OpenCode V2 CLI plugins](https://opencode.ai/v2/docs/build/plugins/cli)
- [Loading CLI plugins](https://opencode.ai/v2/docs/cli/plugins)
- [CLI settings](https://opencode.ai/v2/docs/cli/config)

## License

[MIT](LICENSE).
