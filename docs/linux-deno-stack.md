# Einstein on Linux: the Deno and gpui-native stack

Einstein has two stacks ([RFC 0008](rfc/0008-deno-gpui-runtime.md)):

- **Deno stack (Linux):** Deno is the only runtime and the launcher is drawn with [gpui-native](https://github.com/countradooku/gpui-native) (Vue 3 rendered by GPUI).
- **Electron stack (all platforms):** macOS and Windows use it. The Linux Electron build is still available; see [Build](../README.md#build) in the README.

Both stacks share the plugin API, the plugin sources and the user data and plugin config locations, so switching stacks keeps your settings.

## Requirements

- [Deno](https://deno.com/) at the version pinned in [`.tool-versions`](../.tool-versions).
- Node.js and npm (see the [README](../README.md#requirements)). They are still needed to build the plugins with webpack and for the Electron stack.
- [Podman](https://podman.io/) or [Docker](https://www.docker.com/), to build the gpui-native addon.
- A Wayland or X11 session.

## Build and run from source

Install the npm dependencies first, as for the Electron stack; the plugin build uses them:

```bash
npm install
(cd plugins/desktop && npm install)
```

Then, from the repository root:

```bash
deno task native:fetch   # fetch the pinned gpui-native commit and apply the patches
deno task native:build   # build the gpui-native addon in a container
deno task install:ui     # install the UI dependencies, including the built addon
deno task build          # build the UI, check main and the plugin host, build the plugins
deno task dev            # run Einstein
```

About `deno task native:build`:

- The first build downloads a Rust and zig toolchain inside the container and compiles gpui-native. Expect about 20 minutes.
- It builds for the host architecture only. The result is written to `native/gpui-native/dist`.
- The container engine is `podman` by default. Set `CONTAINER_ENGINE` to use another one, for example `CONTAINER_ENGINE=docker deno task native:build`.
- Inside a toolbox or distrobox where only the host has podman, use `CONTAINER_ENGINE="host-spawn podman" deno task native:build`. `podman-remote` does not work, because it lacks `--output`.

`deno task test` runs the Deno stack's tests.

For visual checks on KDE Plasma, `deno task capture:launcher [--toggle] <file.png>` saves a screenshot of the launcher window only, taken with Spectacle while the launcher is the active window; `--toggle` shows it first. It refuses without capturing when KWin reports that another window is active, and deletes a capture that is not 600 px wide. Inside a toolbox, set `SPECTACLE="host-spawn spectacle"`.

## Single instance and control

Only one Einstein runs at a time. Starting it again does not create a second instance; instead:

- `einstein --toggle` shows or hides the launcher of the running instance;
- `einstein --restart` restarts it.

From source, run these as `deno task dev --toggle` and `deno task dev --restart`.

## Global shortcut

The launcher is toggled with Alt+Space.

- **Wayland:** the shortcut is registered through the XDG Desktop Portal (`GlobalShortcuts`). The portal needs a desktop entry for Einstein's app id, `io.github.ChildishGhost.Einstein`:
  1. Run `deno task desktop-entry:install`. It writes `io.github.ChildishGhost.Einstein.desktop` into `$XDG_DATA_HOME/applications` (by default `~/.local/share/applications`).
  2. Restart your session.
  3. Start Einstein and approve the portal dialog. Alt+Space is the preferred key; the dialog may let you choose another.
- **X11:** the shortcut is a key grab; no desktop entry is needed.
- **Fallback:** if the shortcut cannot be registered (no portal, or the key is taken), Einstein logs it. Bind `einstein --toggle` in your desktop's own shortcut settings instead. From source, that command is `deno task --config /path/to/einstein/deno.json dev --toggle`.

`deno task desktop-entry:remove` removes exactly that desktop entry file.

The desktop entry stores the absolute paths of this checkout's `deno.json` and of the Deno executable. After moving the checkout, run `deno task desktop-entry:install` again.

## Window behavior

- The launcher is a layer-shell overlay where the Wayland compositor supports it, a popup window on X11, and a normal window on Wayland compositors without layer-shell.
- It is frameless. The layer-shell overlay and the popup stay above other windows and have no taskbar entry.
- The layer-shell overlay takes the keyboard exclusively while it is shown.
- Hiding the launcher keeps the input and the results for the next show.
- The launcher uses the font stack Noto Sans CJK TC, then LiHei Pro, then the system UI font. On Linux, the system UI font is the family that fontconfig picks for `sans-serif` in the environment Einstein runs in. Inside a toolbox or distrobox, that is the container's fontconfig, not the host's, so the font can differ from your desktop setting.

## Plugins on the Deno plugin host

- Each plugin runs in its own Deno Worker. The plugin API (`einstein` and the fuzzy matcher) is the same as on the Electron plugin host.
- The plugin host loads the plugin's `module` entry (an ES module). A plugin without `module` is loaded from its `main` entry (CommonJS) instead.
- A result's `icon` must be a `plugin://` or `data:` URL. The UI process has no network access, so other URLs are not shown.

## Crash handling

If the UI process or the plugin host exits unexpectedly, Einstein logs it and starts it again. After three unexpected exits of the same process within 60 seconds, it stays down; run `einstein --restart` (from source, `deno task dev --restart`).

## Updating the gpui-native pin

gpui-native is pinned to an upstream commit in [`native/gpui-native/upstream.json`](../native/gpui-native/upstream.json). Einstein's changes to it live only as patch files in `native/gpui-native/patches/`, applied in file name order. Never edit the upstream checkout without turning the change into a patch.

1. Change `commit` in `upstream.json`.
2. Regenerate the patches against the new commit: in the upstream checkout at `native/gpui-native/.cache/upstream`, apply and fix each patch in order and write it back with `git diff`. `deno task native:fetch` resets that checkout, so save your work as patches before rerunning it.
3. Run `deno task native:fetch` and `deno task native:build`.
4. Run `deno install --config src/ui.deno/deno.json` once, without `--frozen`, to update `src/ui.deno/deno.lock`. Then `deno task install:ui` and `deno task build` as usual.

## Known deviations forced by GPUI

Compared with the Electron launcher ([RFC 0004](rfc/0004-launcher-and-search.md), [RFC 0007](rfc/0007-launcher-visual-design.md)):

<!-- known-deviations: add further GPUI-forced deviations below (RFC-0008/R9) -->
- There is no application menu. Restart moves to `einstein --restart`.
- There is no DevTools.
- The launcher is not centered on the screen: it is centered horizontally with its top 160 px below the top of the screen (the layer-shell overlay on Wayland, the popup on X11). On Wayland compositors without layer-shell, the compositor places the window (RFC-0004/R1, R2).
- The layer-shell overlay takes the keyboard exclusively while it is shown, so typing goes to the launcher until it hides. It does not hide when it loses focus; that is a known gap from RFC 0004.
- On Wayland, hiding closes the launcher window and showing opens it again, because GPUI cannot hide a layer surface in place; on X11 the window is kept and only hidden (RFC-0004/R1). The input and results are kept either way.
- On compositors without layer-shell (such as GNOME), the launcher is a normal window. It can be covered by other windows and shows in the dash, the overview and Alt+Tab while open; the compositor places it (RFC-0004/R1, R2).
