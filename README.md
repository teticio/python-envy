# Python Envy

[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/teticio.python-envy?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=teticio.python-envy)

Automatically activate Python virtual environments as you navigate the source code.

This is useful if you are working with a monorepo that contains sub-projects, modules, libraries or deployments with different Python dependencies. Or perhaps you want to automatically activate a development environment when you click on a test file.

## Features

As you can see in the following demo, the active Python environment changes as soon as a file is loaded into the editor. You may want to consider only enabling the extension for specific workspaces.

![demo](https://raw.githubusercontent.com/teticio/python-envy/main/images/screenshot.gif)

## Requirements

The [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) must be enabled for this to work.

## Extension Settings

This extension has the following setting:

* `pythonEnvy.venv`: Location of the virtual environments. Set to `.venv` by default.

## Known Issues

N/A

## Release Notes

## [0.1.8]
- Activate on presence of Jupyter notebook (`*.ipynb`).
