/**
 * Unit tests for the action's pyproject.toml parsing functionality,
 * src/pyproject.ts
 */
import { jest } from '@jest/globals'
import * as fs from '../__fixtures__/fs.js'
import { BigIntStats, Stats } from 'node:fs'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('node:fs', () => fs)
jest.unstable_mockModule('fs', () => fs)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { getPackageInfo, getPackageVersion } = await import(
  '../src/pyproject.js'
)

describe('pyproject.ts', () => {
  beforeEach(() => {
    fs.promises.readFile.mockImplementation(async (path): Promise<string> => {
      const paths = {
        ['valid/path']: `[project]
name = "valid-package"
version = "1.0.0"
`,
        ['valid/dynamic/path']: `[project]
name = "valid-package"
dynamic = ["version"]
`,
        ['invalid/toml']: `invalid toml content`
      }
      if (path in paths) {
        return paths[path as keyof typeof paths]
      }
      throw new Error(`File not found: ${path}`)
    })
    fs.promises.stat.mockImplementation(
      async (path): Promise<Stats | BigIntStats> => {
        const valid = ['valid/path', 'valid/dynamic/path', 'invalid/toml']
        const invalid = ['not/a/file']
        if (valid.includes(path as string)) {
          return {
            isFile: () => true
          } as Stats
        } else if (invalid.includes(path as string)) {
          return {
            isFile: () => false
          } as Stats
        }
        throw new Error(`File not found: ${path}`)
      }
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('gets package info from a valid pyproject.toml', async () => {
    const info = await getPackageInfo('valid/path')
    expect(info.name).toEqual('valid-package')
    expect(info.version).toEqual('1.0.0')
    expect(info.dynamic).toBeUndefined()
    const infoDynamic = await getPackageInfo('valid/dynamic/path')
    expect(infoDynamic.name).toEqual('valid-package')
    expect(infoDynamic.version).toBeUndefined()
    expect(infoDynamic.dynamic).toEqual(['version'])
  })

  it('gets package version from a valid pyproject.toml', async () => {
    const pkg = await getPackageInfo('valid/path')
    const version = await getPackageVersion(pkg)
    expect(version).toEqual('1.0.0')
  })

  it('throws an error for a non-existent file', async () => {
    await expect(getPackageInfo('non/existent/path')).rejects.toThrow(
      'File not found: non/existent/path'
    )
  })

  it('throws an error for a path that is not a file', async () => {
    await expect(getPackageInfo('not/a/file')).rejects.toThrow(
      'Not a file: not/a/file'
    )
  })

  it('throws an error for invalid TOML content', async () => {
    await expect(getPackageInfo('invalid/toml')).rejects.toThrow(
      'Failed to parse invalid/toml as TOML: Expected \\"=\\" or [ \\\\t] but \\"t\\" found. At line 1, column 9'
    )
  })
})
