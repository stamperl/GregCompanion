export type QuestMapRect = {
  left: number
  top: number
  width: number
  height: number
}

export type QuestMapSide = 'left' | 'right'

type QuestMapPoint = {
  x: number
  y: number
}

type QuestConnectionRoute = {
  path: string
  points: QuestMapPoint[]
}

const routeClearance = 6
const alignmentTolerance = 1
const iconRouteGap = 8

function rectRight(rect: QuestMapRect) {
  return rect.left + rect.width
}

function rectBottom(rect: QuestMapRect) {
  return rect.top + rect.height
}

function compactPoints(points: QuestMapPoint[]) {
  const unique = points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true
    const previous = unique[index - 1]
    const next = unique[index + 1]
    return !(
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y)
    )
  })
}

export function questRouteCrossesRect(points: QuestMapPoint[], rect: QuestMapRect, clearance = routeClearance) {
  const left = rect.left - clearance
  const right = rectRight(rect) + clearance
  const top = rect.top - clearance
  const bottom = rectBottom(rect) + clearance

  return points.slice(1).some((point, index) => {
    const previous = points[index]
    if (previous.y === point.y) {
      const segmentLeft = Math.min(previous.x, point.x)
      const segmentRight = Math.max(previous.x, point.x)
      return previous.y > top && previous.y < bottom && segmentRight > left && segmentLeft < right
    }
    if (previous.x === point.x) {
      const segmentTop = Math.min(previous.y, point.y)
      const segmentBottom = Math.max(previous.y, point.y)
      return previous.x > left && previous.x < right && segmentBottom > top && segmentTop < bottom
    }
    return false
  })
}

function routePath(points: QuestMapPoint[]) {
  const [start, ...rest] = points
  return rest.reduce((path, point, index) => {
    const previous = points[index]
    return `${path} ${previous.y === point.y ? 'H' : 'V'} ${previous.y === point.y ? point.x : point.y}`
  }, `M ${start.x} ${start.y}`)
}

export function routeQuestConnection(
  parent: QuestMapRect,
  child: QuestMapRect,
  _obstacles: QuestMapRect[],
  _mapWidth: number,
): QuestConnectionRoute {
  const parentCenter = {
    x: parent.left + parent.width / 2,
    y: parent.top + parent.height / 2,
  }
  const childCenter = {
    x: child.left + child.width / 2,
    y: child.top + child.height / 2,
  }
  const movingRight = childCenter.x >= parentCenter.x
  const movingDown = childCenter.y >= parentCenter.y
  const separatedVertically = child.top >= rectBottom(parent) || parent.top >= rectBottom(child)
  const separatedHorizontally = child.left >= rectRight(parent) || parent.left >= rectRight(child)
  const verticalFlow = separatedVertically || !separatedHorizontally
  let points: QuestMapPoint[]

  if (verticalFlow) {
    const start = { x: parentCenter.x, y: movingDown ? rectBottom(parent) + iconRouteGap : parent.top - iconRouteGap }
    const end = { x: childCenter.x, y: movingDown ? child.top - iconRouteGap : rectBottom(child) + iconRouteGap }
    if (Math.abs(start.x - end.x) <= alignmentTolerance) {
      points = [start, end]
    } else {
      const railY = Math.round((start.y + end.y) / 2)
      points = compactPoints([start, { x: start.x, y: railY }, { x: end.x, y: railY }, end])
    }
  } else {
    const start = { x: movingRight ? rectRight(parent) + iconRouteGap : parent.left - iconRouteGap, y: parentCenter.y }
    const end = { x: movingRight ? child.left - iconRouteGap : rectRight(child) + iconRouteGap, y: childCenter.y }
    if (Math.abs(start.y - end.y) <= alignmentTolerance) {
      points = [start, end]
    } else {
      const railX = Math.round((start.x + end.x) / 2)
      points = compactPoints([start, { x: railX, y: start.y }, { x: railX, y: end.y }, end])
    }
  }

  return {
    path: routePath(points),
    points,
  }
}

export function routeQuestSideConnection(
  parent: QuestMapRect,
  child: QuestMapRect,
  side: QuestMapSide,
): QuestConnectionRoute {
  const parentCenter = {
    x: parent.left + parent.width / 2,
    y: parent.top + parent.height / 2,
  }
  const childCenter = {
    x: child.left + child.width / 2,
    y: child.top + child.height / 2,
  }
  const movingDown = childCenter.y >= parentCenter.y

  if (Math.abs(parentCenter.x - childCenter.x) <= alignmentTolerance) {
    const start = { x: parentCenter.x, y: movingDown ? rectBottom(parent) + iconRouteGap : parent.top - iconRouteGap }
    const end = { x: childCenter.x, y: movingDown ? child.top - iconRouteGap : rectBottom(child) + iconRouteGap }
    return { path: routePath([start, end]), points: [start, end] }
  }

  const start = {
    x: side === 'right' ? rectRight(parent) + iconRouteGap : parent.left - iconRouteGap,
    y: parentCenter.y,
  }
  if (Math.abs(parentCenter.y - childCenter.y) <= alignmentTolerance) {
    const end = {
      x: side === 'right' ? child.left - iconRouteGap : rectRight(child) + iconRouteGap,
      y: childCenter.y,
    }
    return { path: routePath([start, end]), points: [start, end] }
  }

  const end = {
    x: childCenter.x,
    y: movingDown ? child.top - iconRouteGap : rectBottom(child) + iconRouteGap,
  }
  const points = compactPoints([start, { x: childCenter.x, y: start.y }, end])
  return { path: routePath(points), points }
}
