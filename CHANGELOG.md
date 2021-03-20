# Change Log

## [1.7.0] 2021-03-20

### Added

* Configurable filename extensions:
	* yaml can be `.yaml` or `.yml`
	* json can be `json`

`jsonc` might be supported at a later point if requested as the extension should also support converting from `jsonc` then.

### Changed

* Default configurations correction for `yamlIndent` (no affect on usage)

## [1.6.0] 2020-12-10

### Changed

* Old configurations keys has been marked as deprecated
* New configurations keys are grouped in an object `yaml-plus-json`.

### Added

* `yamlSchema` configuration. See [yaml module documentation](https://github.com/eemeli/yaml/blob/master/docs/03_options.md#data-schemas) for details.

## [1.5.0] 2020-12-08

### Added

* Revert files converted. After converting one or multiple files (using features that includes right click on file(s)), a prompt will be shown allowing to revert. Reverting will include YAML comments.

## [1.4.0] 2020-09-07

### Added

* Configure the amount of spaces used for indentation when converting to YAML.

## [1.3.0] 2020-06-30

### Fixed

* Converting multiple files on windows.

## [1.2.1] 2020-04-13

### Changed

* Now hidding commands from command palette related to multi file conversion:
	* `Convert YAML files to JSON`
	* `Convert JSON files to YAML`
	* `Convert selected files to YAML`
	* `Convert selected files to JSON`

## [1.2.0] 2020-04-09

### Added

* Convert a range of selected items from JSON to YAML and vice versa.

## [1.1.1] 2020-04-09

### Changed

* Folder conversion context menus only shown if selected resources is a folder.

## [1.1.0] 2020-04-07

### Added

* Convert YAML files in directory to JSON and vice versa.

## [1.0.0] 2020-03-21

### Added

* Yaml Plus Json configurations
	* `yaml-plus-json.convertOnRename` - disable/enable automatic conversion on file rename. Defaults to true.

## [0.4.0-0.7.0] 2020-03-21

### changed

* Bundle extension.
* Reduce publish size.

## [0.3.1] 2020-03-15

* Security patch.

## [0.3.0] 2020-03-8

* Feature: Convert selection of JSON / YAML.

## [0.2.1] 2020-02-23

* Updated readme.

## [0.2.0] 2020-02-23

* Remove convert commands from command palette, when they are not applicable.
* Make those commands actually work using the command palette and not only using the right click context menu.

## [0.1.2] 2020-02-10

* Added extension logo. Thanks to [Jonathan](https://github.com/JonathanMH) for help creating it.

## [0.1.1] 2020-02-8

### Changed

* Updated readme.

## [0.1.0] 2020-02-8

### Added

* Right click `.json` files to convert to `.yml`.
* Right click `.yml` or `.yaml` files to convert to json.
