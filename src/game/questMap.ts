export type QuestMapRect = {
  left: number
  top: number
  width: number
  height: number
}

type QuestMapPoint = {
  x: number
  y: number
}

type QuestConnectionRoute = {
  path: string
  points: QuestMapPoint[]
}

const routeClearance = 6

function rectRight(rect: QuestMapRect) {
  return rect.left + rect.width
}

function rectBottom(rect: QuestMapRect) {
  return rect.top + rect.height
}

function uniqueCoordinates(values: number[], minimum: number, maximum: number) {
  return [...new Set(values.map((value) => Math.max(minimum, Math.min(maximum, Math.round(value)))))]
}

function compactPoints(points: QuestMapPoint[]) {
  return points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
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

function routeLength(points: QuestMapPoint[]) {
  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index]
    return total + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
  }, 0)
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
  obstacles: QuestMapRect[],
  mapWidth: number,
  mapHeight: number,
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
  const horizontalStart = { x: movingRight ? rectRight(parent) : parent.left, y: parentCenter.y }
  const horizontalEnd = { x: movingRight ? child.left : rectRight(child), y: childCenter.y }
  const verticalStart = { x: parentCenter.x, y: movingDown ? rectBottom(parent) : parent.top }
  const verticalEnd = { x: childCenter.x, y: movingDown ? child.top : rectBottom(child) }
  const preferredHorizontal = Math.abs(childCenter.x - parentCenter.x) >= Math.abs(childCenter.y - parentCenter.y)

  const xCandidates = uniqueCoordinates([
    (horizontalStart.x + horizontalEnd.x) / 2,
    routeClearance,
    mapWidth - routeClearance,
    ...obstacles.flatMap((rect) => [rect.left - routeClearance, rectRight(rect) + routeClearance]),
  ], routeClearance, mapWidth - routeClearance)
  const yCandidates = uniqueCoordinates([
    (verticalStart.y + verticalEnd.y) / 2,
    routeClearance,
    mapHeight - routeClearance,
    ...obstacles.flatMap((rect) => [rect.top - routeClearance, rectBottom(rect) + routeClearance]),
  ], routeClearance, mapHeight - routeClearance)

  const candidates = [
    ...xCandidates.map((x) => ({
      points: compactPoints([horizontalStart, { x, y: horizontalStart.y }, { x, y: horizontalEnd.y }, horizontalEnd]),
      preferred: preferredHorizontal,
    })),
    ...yCandidates.map((y) => ({
      points: compactPoints([verticalStart, { x: verticalStart.x, y }, { x: verticalEnd.x, y }, verticalEnd]),
      preferred: !preferredHorizontal,
    })),
  ]
  const best = candidates
    .map((candidate) => {
      const crossings = obstacles.filter((rect) => questRouteCrossesRect(candidate.points, rect)).length
      return {
        ...candidate,
        score: crossings * 1_000_000 + routeLength(candidate.points) + Math.max(0, candidate.points.length - 2) * 12 + (candidate.preferred ? 0 : 18),
      }
    })
    .sort((left, right) => left.score - right.score)[0]

  return {
    path: routePath(best.points),
    points: best.points,
  }
}
