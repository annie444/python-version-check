import * as core from '@actions/core'
import { queryIndex } from './query.js'
import {
  getPackageInfo,
  getPackageVersion,
  type PackageInfo
} from './pyproject.js'

function assertHasMessage(
  error: unknown
): asserts error is { message: string } {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('message' in error) ||
    typeof (error as { message: unknown }).message !== 'string'
  ) {
    throw new TypeError('The error does not have a message property')
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const pyprojectPath: string = core.getInput('path')
    const simpleIndexUrl: string = core.getInput('index')
    if (!pyprojectPath) {
      core.setFailed('Input "path" is required')
      return
    }
    if (!simpleIndexUrl) {
      core.setFailed('Input "index" is required')
      return
    }

    core.debug(`Looking for package at ${pyprojectPath}`)
    const packageInfo: PackageInfo = await getPackageInfo(pyprojectPath)
    const packageName: string = packageInfo.name
    core.debug(`Found package: ${packageName}`)
    const packageVersion: string = await getPackageVersion(packageInfo)
    core.debug(`Found version: ${packageVersion}`)

    core.setOutput('package_name', packageName)
    core.setOutput('package_version', packageVersion)

    core.debug(`Querying ${simpleIndexUrl} for published versions`)
    const versions = await queryIndex(simpleIndexUrl, packageName)
    if (versions === null) {
      core.setFailed(`Failed to query index ${simpleIndexUrl}`)
      return
    }
    core.info(`Published versions for ${packageName}: ${versions.join(', ')}`)
    const versionExists =
      versions.length > 0 ? versions.includes(packageVersion) : false
    core.setOutput(`current_version_exists`, versionExists)
  } catch (error) {
    // Fail the workflow run if an error occurs
    try {
      assertHasMessage(error)
      core.setFailed(error.message)
    } catch {
      core.setFailed(`An unknown error occurred: ${String(error)}`)
    }
  }
}
