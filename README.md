# YAML :heart: JSON

[![CodeQL](https://github.com/hilleer/vscode-yaml-plus-json/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/hilleer/vscode-yaml-plus-json/actions/workflows/github-code-scanning/codeql)
[![extension CI](https://github.com/hilleer/vscode-yaml-plus-json/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/hilleer/vscode-yaml-plus-json/actions/workflows/ci.yaml)

Easily convert YAML to JSON or vice versa. Conversion can be done by each individual file or by all files in a folder.

Any good ideas or feature requests? Please, do not hesitate to open [a new issue](https://github.com/hilleer/vscode-yaml-plus-json/issues/new)!

## Features and usage

* **Convert a single file:**
  * Convert a YAML file to JSON by right clicking it and selecting `Convert to JSON`.
  * Convert a YAML file to JSON by changing file extension to `.json`.
  * Convert a JSON file to YAML by right clicking it and selecting `Convert to YAML`.
  * Convert a JSON file to YAML by changing file extension to `.yaml` or `.yml`.
* **Convert selection as preview:**
  * Convert YAML selection as preview by using command `YAML+JSON: Preview as JSON (from YAML. Opens in new file)`
  * Convert JSON selection as preview by using command `YAML+JSON: Preview as YAML (from JSON. Opens in new file)`
* **Convert text selection:**
  * Convert YAML selection by using command `Convert selection to JSON` - _does not_ change file extension.
  * Convert JSON selection by using command `Convert selection to YAML` - _does not_ change file extension.
* **Converting multiple files:**
  * Convert a selection of JSON files to YAML by right clicking one of the selected files and selecting `Convert selected files to YAML`.
  * Convert a selection of YAML files to JSON by right clicking one of the selected files and selecting `Convert selected files to JSON`.
  * Convert YAML files in a directory to JSON by right clicking the directory and selecting `Convert YAML files to JSON`.
  * Convert JSON files in a directory to YAML by right clicking the directory and selecting `Convert JSON files to YAML`.

* Reverting converted files: When a file has been reverted, a _"revert"_ prompt will be shown to revert it. Using this will return the entirety of the original file, including YAML comments.
* Overwriting existent files: When trying to convert a file into a destination that already exist, you can use the `overwriteExistentFiles` configuration to overwrite such. **Notice** if you use the revert feature after overwriting a file, the extension cannot (currently) revert the overwritten file. Also, due to limitation in vscode of active user prompts, if you set it to `"ask"` you will only be prompted to overwrite N number of files, while others will be skipped.

## Config

All configurations should be defined in `yaml-plus-json` in vscode settings (e.g. workspace file `.vscode/settings.json`). Example:

```jsonc
{
  "yaml-plus-json": {
    "convertOnRename": true,
    "yamlIndent": 2,
    "yamlLineWidth": 0,
    "yamlMerge": false,
    "fileExtensions": {
      "yaml": ".yaml",
      "json": ".json"
    },
    // for more advanced parser configurations
    // see the YAML module documentation for details:
    // https://github.com/eemeli/yaml/blob/main/docs/03_options.md#options
    // note specific extension configs set takes precedence ("yamlIndent" for example)
    "yamlOptions": {
      "indent": 2,
      "lineWidth": 0
    }
  }
}
```

<!-- use table generator to parse and update: https://www.tablesgenerator.com/markdown_tables --> 

|  | description | type | default | example |
|---|---|---|---|---|
| `convertOnRename` | Convert YAML/JSON files on rename | boolean | `true` | `false` |
| `yamlIndent` | The number of spaces to use when indenting code (yaml) | number | `2` | `4` |
| `yamlSchema` | See [yaml module documentation](https://github.com/eemeli/yaml/blob/master/docs/03_options.md#schema-options) for details | string | `"core"` | `"json"` |
|   `yamlMerge` | Enable support for << merge keys. Default value depends on YAML version. | boolean |   `true` |    `false` |
| `yamlLineWidth` | Set to 0 to disable line wrapping. See [line width options](https://github.com/eemeli/yaml/blob/main/docs/03_options.md#tostring-options) for details | number |  | `100` |
| `fileExtensions` | define what filename extension(s) to use when converting file(s) | object |  |  |
| `fileExtensions.yaml` | yaml filename extension | string | `".yaml"` | `".yml"` |
| `fileExtensions.json` | json filename extension | string | `".json"` | `".json"` |
| `keepOriginalFiles` | Keep original files when converting. Use `"ask"` to be asked every time or `"always"` to always keep original files | string |  | `"always"` |
| `overwriteExistentFiles` | Overwrite existent files when converting. Use `"ask"` to be asked every time or `"always"` to always overwrite | string |  | `"always"` |
|   `yamlOptions` | Options used to convert from JSON to YAML. See the module [docs](https://github.com/eemeli/yaml/blob/main/docs/03_options.md) for details. Note that specific extension configs set takes precedence. | object |  |  |
<!-- |   `jsonOptions` | Options used to convert from YAML to JSON. See the module [docs](https://github.com/eemeli/yaml/blob/main/docs/03_options.md) for details. Note that specific extension configs set takes precedence. | object |  |  | -->

---

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/hilleer)
