# Einstein

A cross-platform launcher with plugins.

## Build

### Requirements

- [Node.js](https://nodejs.org/) >= `15.6.0`
- [npm](https://www.npmjs.com/) >= `7.5.0`

### npm scripts

- `build`: Bundle sources and make distributed electron package in `dist/electron`
- `lint`: Run ESLint
- `format`: Run Prettier and ESLint to correct code styles
- `run`: Bundle sources and run with electron
- `watch`: Watch and bundle sources

## Project Structure

### Components

- `src/api`: Einstein API
- `src/common`: Common utils shared between other components
- `src/main`: Main process which controls Electron and bridges IPC with other processes
- `src/omniSearch`: UI process with browser environment
- `src/pluginHost.node`: Plugin host process with node environment where plugins executed
- `src/sharedProcess`: Shared process with browser environment which runs at background
