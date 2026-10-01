---
rfc: 0008
title: Deno and gpui-native runtime on Linux
status: draft
created: 2026-09-26
references: [0001, 0002, 0003, 0004, 0005, 0006, 0007]
gates: accept, verify
---

# RFC 0008: Deno and gpui-native runtime on Linux

## Summary
On Linux, replace Electron and Node with Deno as the only runtime and draw the launcher with gpui-native (Vue rendered by GPUI). The process structure, message routing, plugin API, built-in plugins and launcher behavior of RFCs 0002–0007 are kept; only what the new runtime forces is changed. macOS and Windows keep the Electron build.

## Motivation
- **Maintenance:** Electron, the webpack build around it and vm2 (discontinued upstream, patched here) are a growing burden.
- **Foundation:** plugin isolation, plugin UI and user-chosen shortcuts build on Deno's permission model and a native UI toolkit; this RFC changes the runtime only, so those decisions stay separate and reviewable.

Linux goes first because it is the platform CI already covers and where the needed gpui-native window features exist today.

## Requirements

### Processes and messaging
- **R1** — On Linux, the Deno stack runs with Deno as its only runtime. The Linux Electron build stays available alongside it.
- **R2** — Three processes: *main* (hub and lifecycle; no UI, no plugin code), the *UI process* (every window, drawn with gpui-native) and the *plugin host* (all plugins).
- **R3** — Main starts the UI process and the plugin host by spawning the Deno executable with a Node-compatible IPC channel (`advanced` serialization), explicit Deno permissions and `--no-prompt`, and forwards their stdout and stderr line by line.
- **R4** — The UI process is granted no `net` and no `run` permission, so result icons are `plugin://` or `data:` URLs; other URLs are not shown. The plugin host is granted all permissions.
- **R5** — Messages between processes use `MessageTunnel` over the IPC channel, with the token handshake of RFC-0002/R11 for both children.
- **R6** — Main stays the hub: the UI process and the plugin host never talk directly. Window commands (`beforeShow`, `resizeWindow`, `closeWindow`) travel between main and the UI process.
- **R7** — When the UI process or the plugin host exits unexpectedly, main logs it and starts it again, following the startup order of RFC-0002/R4. After three unexpected exits of the same process within 60 seconds, main stops restarting it and logs that `einstein --restart` is needed.
- **R8** — A second start of Einstein does not create another instance. `einstein --toggle` toggles the launcher of the running instance and `einstein --restart` restarts it, through a local socket.

### UI
- **R9** *(manual)* — The launcher is Vue 3 rendered by gpui-native. Its behavior follows RFC 0004 and its look follows RFC 0007; any deviation GPUI forces is listed in the docs.
- **R10** *(manual)* — The launcher window is frameless. On Wayland compositors with layer-shell it is a layer-shell overlay, and on X11 a popup window; both stay above other windows and have no taskbar entry. On Wayland compositors without layer-shell it is a normal window, placed by the compositor and raised and focused on each show. Hiding keeps the input and results for the next show.
- **R11** — `plugin://<uid>/<path>` images are drawn from the file the plugin host resolves inside that plugin's folder; a path that resolves outside it is refused.
- **R12** *(manual)* — The global shortcut is registered by the UI process: through the XDG Desktop Portal `GlobalShortcuts` on Wayland (Alt+Space as the preferred trigger, which the user may change), and as a key grab on X11. It toggles as in RFC-0004/R2. A failed registration is reported in the log and points to `einstein --toggle`.
- **R13** — One command installs the desktop entry (application id) that the portal requires into `$XDG_DATA_HOME/applications`; another removes exactly that file.

### gpui-native
- **R14** — gpui-native is pinned to an upstream commit; Einstein's changes to it live only as patch files in this repository.
- **R15** — One Containerfile builds the patched addon for every Linux target, under Docker or Podman, for local builds and CI alike. It cross-compiles for x86_64 and aarch64 with zig as the linker, against glibc 2.36 (Debian bookworm), from a base image pinned by digest, a pinned Rust toolchain and `cargo --locked`.

### Plugins
- **R16** — The plugin host runs each plugin in its own Deno Worker. A preload module provides `einstein` and the fuzzy matcher (RFC-0003/R5), resolved through an import map; the API of RFC-0003/R14 is unchanged.
- **R17** — `spawn` and `openUrl` are carried out by the plugin host on the plugin's behalf, with the behavior of RFC-0003/R15–R16 and the environment allowlist of RFC-0003/R6.
- **R18** — Plugins are written as ES modules. The build emits a CommonJS bundle (`main`, for the Electron plugin host) and an ES module bundle (`module`, for the Deno plugin host); the Deno plugin host loads `module`, and falls back to loading `main` through Deno's Node-compatible `require` for plugins that have no `module`.
- **R19** — The built-in plugins (RFC 0005) behave the same on both plugin hosts.

### Build and staging
- **R20** — The Deno version is pinned in `.tool-versions`. On Linux, one Deno task builds everything (UI with Vite and the gpui-native Vue renderer, main, plugin host, plugins) and another runs it from the source tree. A third, `test`, runs the Deno stack's tests, written for Deno's test runner with `jsr:@std/testing/bdd`.
- **R21** — macOS and Windows keep the Electron build unchanged; CI builds both stacks, on Linux as well, and runs the Deno tests on Linux.

## Design

```
                 main (Deno) — hub, lifecycle, single-instance socket
          IPC (spawn + 'ipc', token)          IPC (spawn + 'ipc', token)
        ┌─────────────┴─────────────┐   ┌──────────────┴─────────────────┐
        │ UI process (Deno)         │   │ plugin host (Deno, all perms)   │
        │ gpui-native + Vue 3       │   │ Worker per plugin               │
        │ launcher + shared window  │   │ preload: einstein + matcher     │
        │ global shortcut (portal / │   │ broker: spawn, openUrl,         │
        │ X11 grab)                 │   │ plugin:// path resolution       │
        └───────────────────────────┘   └────────────────────────────────┘
```

- **Why a separate UI process:** gpui-native runs in the process that loads it. The Vue side (state, diffing, batching) always runs on that process's JS thread. Keeping main as a thin hub, as RFC 0002 intends, means the UI gets its own process. The reserved shared window (RFC-0002/R1) becomes a second window of the UI process.
- **Why `spawn` with an IPC channel, not `fork`:** under Deno 2.9, a `fork`ed child always receives every permission, and `execArgv` is passed to V8, not Deno. Spawning the Deno executable with an `'ipc'` stdio slot keeps the same channel and serialization, with exact permissions per process.
- **gpui-native:** Apache-2.0, compatible with Einstein's LGPL-3.0 (RFC-0006/R10). Loaded through Deno's Node-API support. On Linux its GPUI loop runs on a native thread of the UI process.
- **Patch set** (`native/gpui-native/patches/`, applied in file-name order): 0001 adds window kinds (popup, Wayland layer-shell), frameless decorations, runtime resize, hide/show and global shortcuts; 0002 lets a window start hidden, registers shortcuts before the first show and falls back from layer-shell to a popup window where the compositor lacks it (an X11 popup, or a normal window on Wayland); 0003 lets an input capture listed keys (its `captureKeys` prop) before window bindings see them; 0004 accepts `fontFamily` lists with fallbacks; 0005 resolves `.SystemUIFont` through fontconfig on Linux; 0006 enables GPUI's X11 backend; 0007 focuses X11 popups on show and ignores the focus loss a key grab causes; 0008 keeps the latest requested size when a Wayland configure answers an older one; 0009 hides X11 windows by unmapping them instead of closing them; 0010 exposes the window's display bounds (`getDisplayBounds`); 0011 opens the X11 popup centered horizontally with its top 160 px below the top of the screen; 0012 lays out input text with the input's own line height.
- **Keys in the input:** Esc and the arrow keys arrive as `keyDown` on a single-line input; Tab reaches it only through patch 0003.
- **Key-stop transform:** gpui-native events reach JS after dispatch, so `.stop` cannot stop them there; a Vue compiler transform (`src/ui.deno/vite/keyStop.ts`) turns `@key-down.<key>.stop` into the input's `captureKeys`.
- **UI build:** the container builds `@gpui-native/{core,runtime,vue}`, `src/ui.deno` installs them through Deno `links`, and Vite bundles the UI to `src/ui.deno/dist/`.
- **Shortcut fallback:** where the portal is missing or the key is taken, the user binds `einstein --toggle` in the desktop's own shortcut settings.
- **Command name:** `einstein` in these requirements is Einstein's entry point; run from source it is `deno task dev`, so `einstein --toggle` is `deno task dev --toggle`.
- **Plugins in Workers:** the Workers keep full Deno permissions, as vm2 effectively did.
- **Container build:** `native/gpui-native/Containerfile` starts from Debian bookworm, clones upstream at the pinned commit, applies the patches in order and builds with the napi-rs CLI through zig, so no host needs a Rust toolchain. The addon leaves the build as a file through `--output`, so no container is kept running.
- **Two stacks:** the Electron build (webpack, vm2, Node plugin host) stays as is. Shared are the plugin API, the plugin sources, and the user data and plugin config locations (RFC-0002/R17), so switching stacks keeps the user's settings.

## Relation to earlier RFCs
The Electron build keeps every earlier requirement on every platform, except the changes to RFC-0006/R2, R3 and R8, which apply to both stacks. The other entries are for the Deno stack; requirements not listed are kept.

- RFC-0002/R1 — changed: three processes; the launcher and shared windows live in the UI process instead of Electron renderers (gpui-native draws in the process that loads it).
- RFC-0002/R3 — changed: the plugin host is a spawned Deno process with an IPC channel instead of a forked Node process; `advanced` serialization and output forwarding kept.
- RFC-0002/R6 — changed: restart is `einstein --restart` instead of a menu command (R8).
- RFC-0002/R7 — changed: the only transport is the Node-compatible IPC channel; the MessagePort transports go with Electron.
- RFC-0002/R10 — changed: removed; no renderer ports to hand out.
- RFC-0002/R15 — changed: `plugin://` is resolved for images by the UI process through main instead of an Electron protocol; the lookup and the plugin-folder scope are kept.
- RFC-0002/R2, R4, R5, R8, R9, R11–R14, R16, R17 — kept.
- RFC-0003/R2 — changed on the Deno host: the entry is `module`; `main` stays the Electron entry (R18).
- RFC-0003/R11 — changed on Linux: a result's `icon` must be a `plugin://` or `data:` URL (R4); the UI process has no network access.
- RFC-0003/R4 — changed on the Deno host: a Worker per plugin instead of a vm2 context; the default export is still the setup function.
- RFC-0003/R5, R6, R14–R16, R18 — kept (R16, R17).
- RFC-0004/R1 — changed on Linux: layer-shell or popup window instead of Electron's always-on-top `toolbar` window. On Wayland compositors without layer-shell (such as GNOME) the launcher is an ordinary window: it is not kept on top, and it is listed in the dash, the overview and the app switcher while shown.
- RFC-0004/R2 — changed on Linux: the launcher is centered horizontally with its top 160 px below the top of the screen, as the layer-shell overlay on Wayland and as the popup on X11, instead of centered on the screen; on Wayland the key is a preferred trigger the user confirms, and the compositor places the window (the normal-window fallback too, where the compositor lacks layer-shell); toggle behavior kept.
- RFC-0004/R3 — changed on Linux: no application menu; DevTools is dropped and Restart moves to `einstein --restart`.
- RFC-0006/R2 — changed: new devDependencies `vite` 8.2.2, `@vitejs/plugin-vue` 6.0.8 and `@vue/compiler-core` 3.5.41; `vue` is bumped to `^3.5.41` and `@types/node` to `^24.0.0`. The Deno UI has its own manifest, `src/ui.deno/package.json`, which lists gpui-native. On Linux the Deno stack also runs on the Deno version of `.tool-versions` (R20), and still needs Node to build the plugins.
- RFC-0006/R3 — changed: `npm run build` runs six webpack configs; the sixth, `plugins:module`, is the ES module plugin bundle the Deno plugin host loads (R18). On Linux the Deno stack's UI bundle is built by Vite, and its plugin bundles by webpack under Node (`build:plugins`, R20).
- RFC-0006/R5 — changed on Linux: the Deno stack downloads no Electron.
- RFC-0006/R8 — changed: plugin sources import local modules with explicit `.ts` extensions instead of extension-less, and Node builtins with the `node:` prefix, so Deno runs them without unstable flags; `plugins/` has its own ESLint flat config (the root one with Node globals).
- RFC-0006/R4 — changed: gpui-native is patched from this repository (R14); the vm2 patch remains for the Electron build only.
- RFC-0006/R9 — changed: CI also builds the Deno stack on Linux and the gpui-native addon (R15, R21).
- RFC 0005 and RFC 0007 — kept (R9, R19).

## Alternatives
- **UI in the main process:** fewer processes, but the hub's JS thread would also run all Vue work, against RFC 0002's thin hub.
- **Plain `fork`:** closest to today's code, but gives every child all permissions.
- **stdio JSON lines or local sockets:** workable, but drift further from RFC 0002's IPC, while the Node-compatible channel already works under Deno.
- **vm2 on Deno:** depends on Node internals and a discontinued library.
- **CommonJS only, loaded with `createRequire`:** one artifact, but ties the Deno host to Node's module system; kept only as the fallback for plugins without `module`.
- **Skipping plugins without `module`:** simpler, but breaks existing third-party CommonJS plugins on Linux.
- **Network access for the UI process:** would allow http(s) icons, at the cost of a networked UI process.
- **Vendoring or forking gpui-native:** heavier repository or a fork to maintain; patches on a pinned upstream keep the delta small and reviewable.
- **Keeping crashed children down** (as at `db39f26`): with two children, one crash would leave the launcher unusable until a manual restart.
- **All three platforms at once:** the macOS window and shortcut features do not exist in gpui-native yet.
- **Building on the host:** needs Rust, zig and the native build libraries on every machine that builds from source.
- **Publishing prebuilt binaries with pinned SHA-256:** builds without a container runtime, but needs release hosting and a hash to update for every patch or pin change.
- **Emulated builds (qemu) for aarch64:** no cross-linking setup, but much slower.
- **A newer base image:** newer tools, but excludes distributions with an older glibc.
- **`deno compile` binaries:** packaging is not needed to replace the runtime.

## Verification
Tests cover R1–R8, R11, R13–R21 (processes and permissions, IPC routing, single instance, `plugin://` scoping, desktop entry, patch pinning, plugin loading on both hosts, build tasks, CI configuration, the container recipe). R9, R10 and R12 are checked by hand on KDE Plasma (Wayland).

## Unresolved questions
- Whether R10 and R12 hold on X11 when checked by hand: agents checked the popup and the key grab in Xephyr, but by hand they were checked only on KDE Plasma (Wayland).
- The UI process runs with `--allow-read --allow-ffi --allow-env=GPUI_NATIVE_LIBRARY_PATH,GPUI_VUE_NATIVE_LIBRARY_PATH`. Deno's permissions do not cover gpui-native's native code, which can itself fetch http(s) URLs and read files (for example for `<img>`), so R4 relies on the UI's icon filter. Open: whether a native-side guard is needed.
- Whether R12 holds on GNOME: whether the portal is available on the GNOME version we target and registers the shortcut there. It was not tested; without a portal, registration fails safely and points to `einstein --toggle`.
- Whether all of gpui's native Linux libraries cross-link for aarch64 under zig.
