export type FieldCommand = 'move' | 'turnLeft' | 'turnRight' | 'harvest' | 'plant'

const commandPattern = /^(move|turnLeft|turnRight|harvest|plant)\(\);?$/

export function parseFieldProgram(source: string): { commands: FieldCommand[]; error: string | null } {
  const commands: FieldCommand[] = []
  const lines = source.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line || line.startsWith('//')) continue
    const match = line.match(commandPattern)
    if (!match) return { commands: [], error: `Line ${index + 1}: I don't understand “${line}”.` }
    commands.push(match[1] as FieldCommand)
  }
  if (commands.length === 0) return { commands: [], error: 'Add at least one command, then tap Run.' }
  if (commands.length > 40) return { commands: [], error: 'Programs can contain up to 40 commands.' }
  return { commands, error: null }
}
