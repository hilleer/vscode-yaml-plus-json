# Change Log

## [1.15.0](https://github.com/hilleer/vscode-yaml-plus-json/compare/yaml-plus-json-v1.14.0...yaml-plus-json-v1.15.0) (2026-02-22)


### Features

* 🎸 make yaml line lengths configurable ([#310](https://github.com/hilleer/vscode-yaml-plus-json/issues/310)) ([84a0e2a](https://github.com/hilleer/vscode-yaml-plus-json/commit/84a0e2a58dc100a82793318a9cb677f77fe67337))
* add command to preview conversion ([#48](https://github.com/hilleer/vscode-yaml-plus-json/issues/48)) ([3f7f64b](https://github.com/hilleer/vscode-yaml-plus-json/commit/3f7f64b1077b78535c850bcdad0a2ab4fb0c1fec))
* Add convertOnSave configuration ([#417](https://github.com/hilleer/vscode-yaml-plus-json/issues/417)) ([3e158de](https://github.com/hilleer/vscode-yaml-plus-json/commit/3e158deaba11c011c9996ff069c9596c18fc0b40))
* add directoryConversion config to toggle folder context menu co… ([#424](https://github.com/hilleer/vscode-yaml-plus-json/issues/424)) ([d880a50](https://github.com/hilleer/vscode-yaml-plus-json/commit/d880a50a34bae0caaf3cb9702fa81de9c2481703))
* allow to overwrite existent files ([#68](https://github.com/hilleer/vscode-yaml-plus-json/issues/68)) ([dd16b0c](https://github.com/hilleer/vscode-yaml-plus-json/commit/dd16b0c92b44439ae3d088d3c65bda93c83b8110))
* support trailing commas in JSON → YAML conversion ([#418](https://github.com/hilleer/vscode-yaml-plus-json/issues/418)) ([28e7eca](https://github.com/hilleer/vscode-yaml-plus-json/commit/28e7eca3e549782d2a23641f4de08e2205d2ba00))
* yamlMerge as specific config ([84a0e2a](https://github.com/hilleer/vscode-yaml-plus-json/commit/84a0e2a58dc100a82793318a9cb677f77fe67337))


### Bug Fixes

* 🐛 publish require vscode v1.109.0 ([#423](https://github.com/hilleer/vscode-yaml-plus-json/issues/423)) ([bc73e78](https://github.com/hilleer/vscode-yaml-plus-json/commit/bc73e7832c3fd5fb0a77f388cc3e2714462102a9))
* enable merge tags ([#140](https://github.com/hilleer/vscode-yaml-plus-json/issues/140)) ([a3884c4](https://github.com/hilleer/vscode-yaml-plus-json/commit/a3884c41a81209856265aa1a68a8a724633ab650))
* vscode types match vscode version in engines ([a43ae0a](https://github.com/hilleer/vscode-yaml-plus-json/commit/a43ae0a280f050d92dbc3d37cbbdbebf9f02039f))

## [1.14.0] - 2026-02-22

### Added

- Config: `convertOnSave` to automatically convert a YAML/JSON file to its counterpart format on every save

### Changed

- Preview commands (`Preview as YAML` / `Preview as JSON`) now convert the full file when no text is selected, in addition to the existing selection-only behaviour

### Fixed

- JSON files containing trailing commas now convert to YAML correctly instead of throwing a parse error

## [1.13.0] - 2025-04-14

### Added

- Config: `yamlLineWidth` to control YAML line width (and option to disable line wrapping)
- Config: Expose `yamlMerge` config currently defaulted to true always.
- Config: Enable (more advanced) users to configure all available YAML module options that is available using `yamlOptions` object

### Changed

- Bump version of [YAML](https://www.npmjs.com/package/yaml) parser module to `2.7.1`

## [1.12.1] - 2023-04-13

#### Fixed

- CodeQL README badge

## [1.12.0] - 2023-04-07

### Added

- Config: Allow overwriting existent files

### Changed

- Update YAML stringify/parse library
- set `merge: true` in options when using YAML library

## [1.11.0] - 2022-08-28

### Changed

- Remove information message after successfully doing revert of converted files

### Added

- Additional extension activation events

## [1.10.0] - 2022-04-08

### Added

- Feature: Preview YAML selection as JSON by using command `YAML+JSON: Preview as JSON (from YAML. Opens in new file)`
- Feature: Preview JSON selection as YAML `YAML+JSON: Preview as YAML (from JSON. Opens in new file)`

## [1.9.2] - 2021-11-21

### Changes

- remove `null` default from `keepOriginalFiles` config

## [1.9.1] - 2021-11-21

### Fixed

- npm audit to fix security concerns with dependencies

## [1.9.0] - 2021-11-21

### Added

- feature: keep original files on conversion, based on configuration; `ask` to be asked to keep original files and `always` to always keep original files.

## [1.8.0] - 2021-05-27

### Fixed

- extension not being activated when workspace don't contain any `.json` or `.y(a)ml` file(s)

## [1.7.0] - 2021-03-20

### Added

- Configurable filename extensions:
  - yaml can be `.yaml` or `.yml`
  - json can be `json`

`jsonc` might be supported at a later point if requested as the extension should also support converting from `jsonc` then.

### Changed

- Default configurations correction for `yamlIndent` (no affect on usage)

## [1.6.0] - 2020-12-10

### Changed

- Old configurations keys has been marked as deprecated
- New configurations keys are grouped in an object `yaml-plus-json`.

### Added

- `yamlSchema` configuration. See [yaml module documentation](https://github.com/eemeli/yaml/blob/master/docs/03_options.md#data-schemas) for details.

## [1.5.0] - 2020-12-08

### Added

- Revert files converted. After converting one or multiple files (using features that includes right click on file(s)), a prompt will be shown allowing to revert. Reverting will include YAML comments.

## [1.4.0] - 2020-09-07

### Added

- Configure the amount of spaces used for indentation when converting to YAML.

## [1.3.0] - 2020-06-30

### Fixed

- Converting multiple files on windows.

## [1.2.1] - 2020-04-13

### Changed

- Now hidding commands from command palette related to multi file conversion:
  - `Convert YAML files to JSON`
  - `Convert JSON files to YAML`
  - `Convert selected files to YAML`
  - `Convert selected files to JSON`

## [1.2.0] - 2020-04-09

### Added

- Convert a range of selected items from JSON to YAML and vice versa.

## [1.1.1] - 2020-04-09

### Changed

- Folder conversion context menus only shown if selected resources is a folder.

## [1.1.0] - 2020-04-07

### Added

- Convert YAML files in directory to JSON and vice versa.

## [1.0.0] - 2020-03-21

### Added

- Yaml Plus Json configurations
  - `yaml-plus-json.convertOnRename` - disable/enable automatic conversion on file rename. Defaults to true.

## [0.4.0-0.7.0] - 2020-03-21

### changed

- Bundle extension.
- Reduce publish size.

## [0.3.1] - 2020-03-15

- Security patch.

## [0.3.0] - 2020-03-8

- Feature: Convert selection of JSON / YAML.

## [0.2.1] - 2020-02-23

- Updated readme.

## [0.2.0] - 2020-02-23

- Remove convert commands from command palette, when they are not applicable.
- Make those commands actually work using the command palette and not only using the right click context menu.

## [0.1.2] - 2020-02-10

- Added extension logo. Thanks to [Jonathan](https://github.com/JonathanMH) for help creating it.

## [0.1.1] - 2020-02-8

### Changed

- Updated readme.

## [0.1.0] - 2020-02-8

### Added

- Right click `.json` files to convert to `.yml`.
- Right click `.yml` or `.yaml` files to convert to json.
