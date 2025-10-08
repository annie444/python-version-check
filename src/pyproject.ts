import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as toml from 'toml'

/**
 * Asserts that the given object has a 'project' field which is an object.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'project' field or if it is not an object.
 * @returns void
 */
function assertHasProject(
  obj: unknown
): asserts obj is { project: Record<string, unknown> } {
  if (!Object.hasOwn(obj as object, 'project')) {
    throw new Error('No [project] section found in pyproject.toml')
  }
  if (typeof (obj as { project?: unknown }).project !== 'object') {
    throw new Error('[project] section is not an object')
  }
}

/**
 * Asserts that the given object has a 'name' field which is a string.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'name' field or if it is not a string.
 * @returns void
 */
function assertHasName(obj: unknown): asserts obj is { name: string } {
  if (!Object.hasOwn(obj as object, 'name')) {
    throw new Error('No name field in [project] section of pyproject.toml')
  }
  if (typeof (obj as { name?: unknown }).name !== 'string') {
    throw new Error('name field in [project] section is not a string')
  }
}

/**
 * Asserts that the given object has a 'version' field which is a string.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'version' field or if it is not a string.
 * @returns void
 */
function assertHasVersion(obj: unknown): asserts obj is { version: string } {
  if (!Object.hasOwn(obj as object, 'version')) {
    throw new Error('No version field in [project] section of pyproject.toml')
  }
  if (typeof (obj as { version?: unknown }).version !== 'string') {
    throw new Error('version field in [project] section is not a string')
  }
}

/**
 * Asserts that the given object has a 'dynamic' field which is an array of strings.
 * Throws an error if the assertion fails.
 *
 * @param obj - The object to check.
 * @throws {Error} If the object does not have a 'dynamic' field or if it is not an array of strings.
 * @returns void
 */
function assertHasDynamic(obj: unknown): asserts obj is { dynamic: string[] } {
  if (!Object.hasOwn(obj as object, 'dynamic')) {
    throw new Error('No dynamic field in [project] section of pyproject.toml')
  }
  if (!Array.isArray((obj as { dynamic?: unknown }).dynamic)) {
    throw new Error('dynamic field in [project] section is not an array')
  }
  for (const item of (obj as { dynamic: unknown[] }).dynamic) {
    if (typeof item !== 'string') {
      throw new Error(
        'dynamic field in [project] section is not an array of strings'
      )
    }
  }
}

/** Information about a Python package parsed from pyproject.toml.
 * Includes the package name, version (if specified), dynamic fields (if any),
 * and the path to the package directory.
 *
 * @example
 * ```json
 * {
 *   "name": "my-package",
 *   "version": "1.0.0",
 *   "path": "/path/to/package"
 * }
 * ```
 */
export interface PackageInfo {
  name: string
  version?: string
  dynamic?: string[]
  path: string
}

/**
 * Reads and parses a pyproject.toml file to extract package information.
 *
 * @param pyprojectPath - The file path to the pyproject.toml file.
 * @throws {Error} If the file does not exist, is not a file, or if required fields are missing.
 * @returns A Promise that resolves to a PackageInfo object containing the package name, version (
 * if specified), dynamic fields (if any), and the path to the package directory.
 */
export async function getPackageInfo(
  pyprojectPath: string
): Promise<PackageInfo> {
  const stat = await fs.promises.stat(pyprojectPath)
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${pyprojectPath}`)
  }
  const file = await fs.promises.readFile(pyprojectPath, 'utf8')
  try {
    const obj = toml.parse(file)
    assertHasProject(obj)
    const project = obj.project as Record<string, unknown>
    assertHasName(project)
    const packageInfo: PackageInfo = {
      name: project.name,
      path: path.dirname(path.resolve(pyprojectPath))
    }
    try {
      assertHasVersion(project)
      packageInfo.version = project.version
    } catch {
      // version field is optional if dynamic includes "version"
      // so we ignore the error here
      // we will get the version from python instead
      // if version is not in dynamic, we will error below
      assertHasDynamic(project)
      if (!project.dynamic.includes('version')) {
        throw new Error(
          'No version field in [project] section of pyproject.toml'
        )
      }
      packageInfo.dynamic = project.dynamic
    }
    return packageInfo
  } catch (error) {
    if (
      Object.hasOwn(error as object, 'line') &&
      Object.hasOwn(error as object, 'column')
    ) {
      throw new Error(
        `Failed to parse ${pyprojectPath} as TOML: ${(error as Error).message} At line ${(error as { line: number }).line}, column ${
          (error as { column: number }).column
        }`
      )
    }
    throw error
  }
}

/**
 * Gets the version of a Python package.
 * If the version is specified in the PackageInfo, it is returned directly.
 * If the version is dynamic, it is retrieved by installing the package and
 * importing it in Python to get the __version__ attribute.
 *
 * @param pkg - The PackageInfo object containing package details.
 * @throws {Error} If the version cannot be determined.
 * @returns A Promise that resolves to the package version as a string.
 */
export async function getPackageVersion(
  pkg: PackageInfo,
  pythonExec: string | undefined
): Promise<string> {
  if (pkg.version) {
    return pkg.version
  }
  if (pkg.dynamic && pkg.dynamic.includes('version')) {
    // get version from python
    let pythonPath: string = ''
    if (pythonExec) {
      pythonPath = pythonExec
    } else {
      pythonPath = await io.which('python3', true)
    }
    const res = await exec.getExecOutput(pythonPath, [
      '-m',
      'pip',
      'install',
      pkg.path
    ])
    if (res.exitCode !== 0) {
      throw new Error(
        `Failed to install package at ${pkg.path}. Stdout: ${res.stdout}. Stderr: ${res.stderr}.`
      )
    }
    const res2 = await exec.getExecOutput(pythonPath, [
      '-c',
      `import ${pkg.name.replace(/-/g, '_')}; print(${pkg.name.replace(
        /-/g,
        '_'
      )}.__version__)`
    ])
    if (res2.exitCode !== 0) {
      throw new Error(
        `Failed to get version of package ${pkg.name}. Stdout: ${res2.stdout}. Stderr: ${res2.stderr}.`
      )
    }
    const version = res2.stdout.trim()
    if (version === '') {
      throw new Error('Failed to get version from pip')
    }
    return version
  }
  throw new Error('No version field in [project] section of pyproject.toml')
}
