import { describe, expect, it } from 'vitest'
import { questRouteCrossesRect, routeQuestConnection, type QuestMapRect } from './questMap'

describe('quest map routing', () => {
  it('routes around an unrelated node between two quests', () => {
    const parent: QuestMapRect = { left: 20, top: 80, width: 58, height: 58 }
    const child: QuestMapRect = { left: 260, top: 80, width: 58, height: 58 }
    const obstacle: QuestMapRect = { left: 130, top: 70, width: 58, height: 58 }

    const route = routeQuestConnection(parent, child, [obstacle], 360, 220)

    expect(questRouteCrossesRect(route.points, obstacle)).toBe(false)
    expect(route.path).toMatch(/[VH]/)
  })

  it('keeps a clear route compact', () => {
    const parent: QuestMapRect = { left: 20, top: 20, width: 58, height: 58 }
    const child: QuestMapRect = { left: 220, top: 140, width: 58, height: 58 }

    const route = routeQuestConnection(parent, child, [], 360, 240)

    expect(route.points.length).toBeLessThanOrEqual(4)
  })
})
