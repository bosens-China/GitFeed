import { describe, expect, it } from 'vitest'
import { calculateCursorTooltipPosition } from '../src/renderer/src/components/cursor-tooltip-position'

describe('calculateCursorTooltipPosition', () => {
  it('places the tooltip beside and slightly behind the cursor when space is available', () => {
    expect(
      calculateCursorTooltipPosition(
        { x: 100, y: 80 },
        { width: 120, height: 32 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 118, y: 76 })
  })

  it('flips and clamps the tooltip before it crosses a viewport edge', () => {
    expect(
      calculateCursorTooltipPosition(
        { x: 790, y: 590 },
        { width: 160, height: 40 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 612, y: 552 })

    expect(
      calculateCursorTooltipPosition(
        { x: 2, y: 2 },
        { width: 900, height: 700 },
        { width: 800, height: 600 }
      )
    ).toEqual({ x: 8, y: 8 })
  })
})
