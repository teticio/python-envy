const { PythonExtension } = require("@vscode/python-extension");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    let pythonApi;
    try {
        pythonApi = await PythonExtension.api();
    } catch (error) {
        vscode.window.showInformationMessage(
            "Python Envy: please install the Python extension."
        );
        return;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        await setupPythonEnvironment(activeEditor, pythonApi);
    }

    let disposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor) {
            await setupPythonEnvironment(editor, pythonApi);
        }
    });

    context.subscriptions.push(disposable);
}

async function setupPythonEnvironment(editor, pythonApi) {
    let currentDir = path.dirname(editor.document.uri.fsPath);
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
        const venvPath = path.join(currentDir, ".venv");

        if (fs.existsSync(venvPath) && fs.lstatSync(venvPath).isDirectory()) {
            const currentPythonPath =
                pythonApi.environments.getActiveEnvironmentPath();
            const pythonPath = path.join(venvPath, "bin", "python");

            if (currentPythonPath.path !== pythonPath) {
                try {
                    await pythonApi.environments.updateActiveEnvironmentPath(pythonPath);
                    vscode.window.showInformationMessage(
                        `Python Envy: interpreter set to: ${pythonPath}`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Python Envy: error setting Python interpreter: ${error.message}`
                    );
                }
            }

            return;
        }
        currentDir = path.dirname(currentDir);
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate,
};
