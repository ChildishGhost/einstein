# Einstein :smirk_cat:

<p align="center">
<a href="https://github.com/ChildishGhost/einstein/blob/dev/.github/workflows/build.yaml"><img alt="Build Status" src="https://github.com/ChildishGhost/einstein/actions/workflows/build.yaml/badge.svg"></a>
</p>

A completely reinvented cross-platform enthusiast-oriented `Spotlight` :mag:-like world-class productivity tool to optimize high-quality desktop experience and automation with excessively flexible community-driven plugin ecosystem.

![The awesome screenshot!](./.github/screenshot1.png)

## Getting started

See build instructions below. On Linux, Einstein can also run on Deno with a native UI drawn by gpui-native: see [Einstein on Linux: the Deno and gpui-native stack](docs/linux-deno-stack.md).

## Documentation

- [Einstein on Linux: the Deno and gpui-native stack](docs/linux-deno-stack.md): requirements, build, global shortcut, plugins, updating gpui-native
- [RFCs](docs/rfc/README.md): design decisions and the RFC process

## Build

### Requirements

- [Node.js](https://nodejs.org/) >= `24.14.0`
- [npm](https://www.npmjs.com/) >= `9.0.0`

One can install `node` and `npm` via `nvm`.

```bash
nvm install 24.14.0
```

### Build and Run Einstein (Electron)

```bash
# build the distributable electron application
npm install
npm run build

# wake up Einstein!
dist/electron/electron

# or use system provided electron binary
# electron dist/electron/resources/app/
# See: https://wiki.archlinux.org/index.php/Electron_package_guidelines
```

### npm scripts

- `build`: Build the distributable electron application under `dist/electron`
- `lint`: Run ESLint
- `format`: Run Prettier and ESLint to enforce coding style
- `run`: Bundle sources and run with electron
- `watch`: Watch and bundle sources
- `clean`: Clean up everything including `node_modules`
- `test`: Run the tests
- `docs:check`: Check RFCs and docs against the [RFC process](docs/rfc/README.md)
- `docs:index`: Regenerate the RFC index
- `rfc:new -- <kebab-title>`: Create the next RFC draft from the template
- `rfc:status -- <NNNN> <status>`: Change an RFC's status and update the index

## Plugins

### Desktop Application Launcher

- support: Linux, macOS

Launch desktop applications in a snap!

### Pass password manager

- support: Linux, macOS

Plugin for [pass](https://www.passwordstore.org/) the standard UNIX password manager.

Synopsis:

```text
pass <filter>
pass show <filter>
```

### Example plugin

- this is not enabled

## Contributing

Decisions (behavior, interfaces, architecture, significant dependencies) start as RFCs: see [docs/rfc](docs/rfc/README.md) for the workflow and the index. Docs are written in English with a Traditional Chinese translation (`*.zh-tw.md`). Coding agents follow [AGENTS.md](AGENTS.md).

## License

See [LICENSE](/LICENSE) file

## See also

- [albert](https://github.com/albertlauncher/albert) (not an open-source software)
- [Alfred](https://www.alfredapp.com/) (proprietary macOS only app)
- [Electron](https://www.electronjs.org/) (MIT License)
- [Fuse.js](https://fusejs.io/) (Apache License)
- [Deno](https://deno.com/) (MIT License)
- [gpui-native](https://github.com/countradooku/gpui-native) (Apache License)
- [Vue.js](https://vuejs.org/) (MIT License)
