import type * as fs from 'node:fs'
import { jest } from '@jest/globals'

export const promises = {
  stat: jest.fn<typeof fs.promises.stat>(),
  readFile: jest.fn<typeof fs.promises.readFile>()
}
