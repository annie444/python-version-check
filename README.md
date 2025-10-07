# 🐍 Python Package Versioning Test • GitHub Action

This is built upon
[MathieuMoalic/action-python-package-new-version](https://github.com/MathieuMoalic/action-python-package-new-version).
This uses the simple API endpoints, which is technically a downgrade. Therefore
I don't expect this to be combined with the upstream.

Make your pipeline _self-aware_: this action inspects the `project.version`
declared in **`pyproject.toml`** and tells you whether that exact version is
already on the Python package index of your choice (PyPI, Test PyPI, a private
index, …).

---

## 🚀 What the action does

1. **Parses** `project.name` and `project.version` from the given
   `pyproject.toml`.
2. **Queries** the (single) index host you specify — defaults to
   **`https://pypi.org/simple`**.
3. **Compares** your local version with the versions already published.
4. **Exposes** three easy-to-consume outputs so you can branch your workflow
   logic.

---

## 🛠 Quick start

```yaml
name: Build & Publish

on:
  push:
    branches: [main]
    tags: ['v[0-9]+.[0-9]+.[0-9]+']

jobs:
  version-check:
    runs-on: ubuntu-latest
    outputs:
      current_version_exists:
        ${{ steps.version_check.outputs.current_version_exists }}
      version: ${{ steps.version_check.outputs.package_version }}
      package_name: ${{ steps.version_check.outputs.package_name }}
    steps:
      - uses: actions/checkout@v4

      - name: Check package version on all index
        id: version_check
        uses: annie444/python-version-check@v1
        with:
          index: https://test.pypi.org/simple

  build:
    runs-on: ubuntu-latest
    needs: version-check
    if: ${{ needs.version-check.outputs.current_version_exists == 'false' }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup uv
        uses: astral-sh/setup-uv@v6

      - name: Build distributions
        run: uv build

      - name: Upload distributions
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish:
    runs-on: ubuntu-latest
    needs: build
    permissions:
      id-token: write
    if: ${{ always() && !cancelled() && needs.build.result == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: Download distributions
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          repository-url: https://test.pypi.org/legacy/
```

---

## ➡️ Inputs

| Name    | Required? | Default                   | Purpose                                                                         |
| ------- | --------- | ------------------------- | ------------------------------------------------------------------------------- |
| `path`  | No        | `pyproject.toml`          | File that contains `project.name` and `project.version`.                        |
| `index` | No        | `https://pypi.org/simple` | **Domain** of the package index to query (e.g. `https://test.pypi.org/legacy`). |

---

## ⬅️ Outputs

| Output                   | Example          | Description                                                         |
| ------------------------ | ---------------- | ------------------------------------------------------------------- |
| `current_version_exists` | `true` / `false` | **`true`** if the version is already published on the chosen index. |
| `package_version`        | `1.4.2`          | The version string read from `pyproject.toml`.                      |
| `package_name`           | `awesome-utils`  | The package name read from `pyproject.toml`.                        |
