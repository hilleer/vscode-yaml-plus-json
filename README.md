# YAML plus JSON

**Easily** convert **json to yaml** or **yaml to json**.

Any good ideas or feature requests? Pleas, do not hesitate to open [a new issue](https://github.com/hilleer/vscode-yaml-plus-json/issues/new)!

## Features

* Convert YAML file to JSON and vice versa.
* Convert YAML file to JSON on file rename and vice versa.
* Convert YAML files in directory to JSON and vice versa.

## Usage

* Right click a YAML file and select `Convert to JSON`.
* Right click a JSON file and select `Convert to YAML`.
* Rename a file to `.json` from `.yml` or `.yaml`.
* Rename a file to `.yaml` or `.yml` from `.json`.
* Make a JSON selection and select command `Convert selection to YAML` - _does not_ change file extension.
* Make a YAML selection and select command `Convert selection to JSON` - _does not_ change file extension.
* Right click a directory and select `Convert JSON files to YAML`.
* Right click a directory and select `Convert YAML files to JSON`.

## Config

| id                             | description                       | type    | default | example |
|--------------------------------|-----------------------------------|---------|---------|---------|
| yaml-plus-json.convertOnRename | Convert YAML/JSON files on rename | boolean | true    | true    |
