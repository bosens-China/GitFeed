const OFFSET_X = 18
const OFFSET_Y = -4
const VIEWPORT_EDGE = 8

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

export function calculateCursorTooltipPosition(point: Point, tooltip: Size, viewport: Size): Point {
  let x = point.x + OFFSET_X
  const y = point.y + OFFSET_Y

  if (x + tooltip.width > viewport.width - VIEWPORT_EDGE) {
    x = point.x - tooltip.width - OFFSET_X
  }

  return {
    x: Math.max(VIEWPORT_EDGE, Math.min(x, viewport.width - tooltip.width - VIEWPORT_EDGE)),
    y: Math.max(VIEWPORT_EDGE, Math.min(y, viewport.height - tooltip.height - VIEWPORT_EDGE))
  }
}
