const { PythonExtension } = require("@vscode/python-extension");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

/**
 * Check if a file contains PEP 723 inline script metadata.
 * PEP 723 format:
 *   # /// script
 *   # ...TOML metadata...
 *   # ///
 */
function hasPep723Metadata(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return /^# \/\/\/ script\s*$/m.test(content);
    } catch (_err) {
        return false;
    }
}

/**
 * Run `uv python find --script <filePath>` to resolve the Python interpreter
 * for a PEP 723 script.
 * @returns {Promise<string|null>} The Python interpreter path, or null on failure.
 */
async function getUvScriptPythonPath(filePath) {
    try {
        const { stdout } = await execFileAsync("uv", ["python", "find", "--script", filePath]);
        return stdout.trim() || null;
    } catch (_err) {
        return null;
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    let pythonApi = await PythonExtension.api();
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
    const filePath = editor.document.uri.fsPath;
    let currentDir = path.dirname(filePath);
    const root = path.parse(currentDir).root;
    const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(editor.document.uri.path));
    const currentWorkspaceFolderPath = currentWorkspaceFolder ? currentWorkspaceFolder.uri.path : null;

    // Get configuration settings
    const config = vscode.workspace.getConfiguration('pythonEnvy');
    const venvName = config.get('venvName');
    const showNotifications = config.get('showNotifications', true); // Default to true for backward compatibility
    const enablePep723 = config.get('enablePep723', true);

    // Check for PEP 723 inline script metadata (requires uv)
    if (enablePep723 && filePath.endsWith(".py") && hasPep723Metadata(filePath)) {
        const pythonPath = await getUvScriptPythonPath(filePath);
        if (pythonPath) {
            if (!fs.existsSync(pythonPath)) {
                if (showNotifications) {
                    vscode.window.showInformationMessage(
                        "Python Envy: PEP 723 script environment has not been created yet."
                    );
                }
                return;
            }

            const currentPythonPath =
                pythonApi.environments.getActiveEnvironmentPath(
                    currentWorkspaceFolder ? currentWorkspaceFolder.uri : undefined
                );

            if (currentPythonPath.path !== pythonPath) {
                try {
                    await pythonApi.environments.updateActiveEnvironmentPath(
                        pythonPath,
                        currentWorkspaceFolder ? currentWorkspaceFolder.uri : undefined
                    );

                    if (showNotifications) {
                        const displayPath = currentWorkspaceFolderPath
                            ? path.relative(currentWorkspaceFolderPath, pythonPath)
                            : pythonPath;
                        const folderName = currentWorkspaceFolder
                            ? " for " + currentWorkspaceFolder.name
                            : "";
                        vscode.window.showInformationMessage(
                            `Python Envy: PEP 723 script interpreter set to ${displayPath}${folderName}`
                        );
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Python Envy: error setting Python interpreter for PEP 723 script: ${error.message}`
                    );
                }
            }
            return;
        }
    }

    while (currentDir !== root) {
        const venvPath = path.join(currentDir, venvName);

        if (fs.existsSync(venvPath) && fs.lstatSync(venvPath).isDirectory()) {
            const currentPythonPath =
                pythonApi.environments.getActiveEnvironmentPath(currentWorkspaceFolder.uri);
            let pythonPath = path.join(venvPath, "bin", "python");

            if (!fs.existsSync(pythonPath)) {
                pythonPath = path.join(venvPath, "Scripts", "python.exe");
            }

            if (currentPythonPath.path !== pythonPath) {
                try {
                    const relativePath = path.relative(currentWorkspaceFolderPath, venvPath);

                    await pythonApi.environments.updateActiveEnvironmentPath(pythonPath, currentWorkspaceFolder.uri);

                    // Only show notification if enabled in settings
                    if (showNotifications) {
                        vscode.window.showInformationMessage(
                            `Python Envy: interpreter set to ${relativePath} for ${currentWorkspaceFolder.name}`
                        );
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Python Envy: error setting Python interpreter: ${error.message}`
                    );
                }
            }
            return;
        }

        if (currentDir === currentWorkspaceFolderPath) {
            break;
        }

        currentDir = path.dirname(currentDir);
        if (currentDir === ".") {
            currentDir = "";
        }
    }
}

function deactivate() { }

module.exports = {
    activate,
    deactivate,
    hasPep723Metadata,
    getUvScriptPythonPath,
};
