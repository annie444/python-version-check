/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput().
    core.getInput.mockImplementation((val) => {
      const inputs: Record<string, string> = {
        ['path']: 'tests/fixtures/already_published/pypi.org/pyproject.toml',
        ['index']: 'https://pypi.org/simple'
      }
      return inputs[val] ?? ''
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Sets the package info output', async () => {
    await run()

    // Verify the time output was set.
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'package_name',
      expect.stringMatching('requests')
    )
    expect(core.setOutput).toHaveBeenNthCalledWith(
      2,
      'package_version',
      expect.stringMatching('2.31.0')
    )
    expect(core.setOutput).toHaveBeenNthCalledWith(
      3,
      'current_version_exists',
      true
    )
  })

  it('Sets a failed status', async () => {
    // Clear the getInput mock and return an invalid value.
    core.getInput.mockClear().mockImplementationOnce((val) => {
      const inputs: Record<string, string> = {
        ['path']: 'invalid/path',
        ['index']: 'https://pypi.org/simple'
      }
      return inputs[val] ?? ''
    })

    await run()

    // Verify that the action was marked as failed.
    expect(core.setFailed).toHaveBeenNthCalledWith(
      1,
      "ENOENT: no such file or directory, stat 'invalid/path'"
    )
  })
})
