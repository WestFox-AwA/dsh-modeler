# Install and verify

This page is written so that an AI agent can follow it without guessing.

## 1. Get the package

Download `dsh-modeler-1.0.0-alpha-1.zip` from the GitHub **Releases** page and
extract it. The extracted directory must contain `package.json` and `index.js`
at its root — not inside a nested folder.

Example destinations:

- Windows: `C:\Users\<you>\dsh-modeler`
- macOS/Linux: `~/dsh-modeler`

## 2. Install into DSH

Call the plugin manager with the **absolute** path of the extracted directory:

```json
{"action":"install_bundle","target":"C:\\Users\\<you>\\dsh-modeler"}
```

If an older version is installed, remove it first:

```json
{"action":"remove_bundle","target":"@local/dsh-modeler"}
```

A successful install returns `"application": "applied"`. The local-link peer
dependency warning about `@deepseek-ai/dsh-tools` is expected and harmless.

## 3. Refresh the page

The Host loads immediately, but the browser keeps the previously loaded client
bundle. Refresh the DSH page once after installing or updating.

## 4. Verify

```json
{"action":"status"}
```

- `clientBuildId` must equal the value in the package's `client-build.json`.
- `clientCurrent` becomes `true` after the refreshed page checks in.
- `bound: false` is normal until an asset is opened or created.

Then request the guide:

```json
{"action":"guide","args":{"id":"main"}}
```

If this returns a guide payload, the plugin is live.

## 5. First model

```json
{"action":"new","args":{"title":"First model"}}
```

```json
{"op":"program","expectedHash":"<contentHash>","code":"const body=m.box([1,.4,.6]).key('body');return m.scene('First model',[body]);"}
```

Capture it with a declared purpose:

```json
{"purpose":"shape","expectedHash":"<contentHash>"}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `stale_client` on capture | page still runs an old client | refresh the DSH page |
| `capture_purpose_required` | capture had no `purpose`, `displayMode` or diagnostic `mode` | add `purpose:"shape"`, `"topology"` or `"appearance"` |
| `native geometry backend unavailable` | Blender backend not configured | install/point the backend, or use legacy script assets |
| `binding_conflict` on write | the session switched assets | re-read `status`, retry with the current guard |
| install cannot find `package.json` | zip extracted one level too deep | install the folder that directly contains `package.json` |

## Uninstall

```json
{"action":"remove_bundle","target":"@local/dsh-modeler"}
```

Assets under `~/.dsh/modeler-resources` are not deleted by uninstalling.
