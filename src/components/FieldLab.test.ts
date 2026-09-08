import { describe, expect, it } from 'vitest'
import { parseFieldProgram } from './fieldProgram'

describe('parseFieldProgram', () => {
  it('parses supported commands and ignores comments', () => {
    expect(parseFieldProgram('// start\nmove();\nturnRight()\nharvest();')).toEqual({
      commands: ['move', 'turnRight', 'harvest'], error: null,
    })
  })

  it('reports the line containing an unknown command', () => {
    expect(parseFieldProgram('move();\nfly();').error).toContain('Line 2')
  })
})
