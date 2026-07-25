import { describe, expect, it } from 'vitest'
import { routeQuestConnection, routeQuestSideConnection, type QuestMapRect } from './questMap'

describe('quest map routing', () => {
  it('uses one deliberate branch rail for offset rows', () => {
    const parent: QuestMapRect = { left: 20, top: 20, width: 58, height: 58 }
    const child: QuestMapRect = { left: 220, top: 140, width: 58, height: 58 }

    const route = routeQuestConnection(parent, child, [], 360)

    expect(route.points).toHaveLength(4)
    expect(route.path).toBe('M 49 86 V 109 H 249 V 132')
  })

  it('draws a straight vertical line for aligned quests', () => {
    const parent: QuestMapRect = { left: 40, top: 20, width: 58, height: 58 }
    const child: QuestMapRect = { left: 40, top: 180, width: 58, height: 58 }

    const route = routeQuestConnection(parent, child, [], 320)

    expect(route.points).toHaveLength(2)
    expect(route.path).toBe('M 69 86 V 172')
  })

  it('draws a straight horizontal line for aligned quests', () => {
    const parent: QuestMapRect = { left: 40, top: 40, width: 58, height: 58 }
    const child: QuestMapRect = { left: 180, top: 40, width: 58, height: 58 }

    const route = routeQuestConnection(parent, child, [], 320)

    expect(route.points).toHaveLength(2)
    expect(route.path).toBe('M 106 69 H 172')
  })

  it('routes side quests out of a machine side before dropping into their lane', () => {
    const parent: QuestMapRect = { left: 40, top: 40, width: 58, height: 58 }
    const child: QuestMapRect = { left: 180, top: 180, width: 46, height: 46 }

    const route = routeQuestSideConnection(parent, child, 'right')

    expect(route.points).toHaveLength(3)
    expect(route.path).toBe('M 106 69 H 203 V 172')
  })
})
