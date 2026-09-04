import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type FocusEventHandler,
  type PointerEventHandler,
  type ReactElement,
  type ReactNode
} from 'react'
import { calculateCursorTooltipPosition } from './cursor-tooltip-position'

const TOOLTIP_ID = 'gitfeed-cursor-tooltip'

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface CursorTooltipContextValue {
  show: (content: string, point: Point) => void
  move: (point: Point) => void
  hide: () => void
  isVisible: () => boolean
}

interface CursorTooltipTargetProps {
  'aria-describedby'?: string
  'data-cursor-tooltip-target'?: string
  onBlur?: FocusEventHandler<HTMLElement>
  onFocus?: FocusEventHandler<HTMLElement>
  onPointerCancel?: PointerEventHandler<HTMLElement>
  onPointerEnter?: PointerEventHandler<HTMLElement>
  onPointerLeave?: PointerEventHandler<HTMLElement>
  onPointerMove?: PointerEventHandler<HTMLElement>
}

interface CursorTooltipProps {
  title: string
  children: ReactElement<CursorTooltipTargetProps>
}

const CursorTooltipContext = createContext<CursorTooltipContextValue | null>(null)

export function CursorTooltipProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipSizeRef = useRef<Size>({ width: 0, height: 0 })

  const isVisible = useCallback((): boolean => {
    return tooltipRef.current?.dataset.visible === 'true'
  }, [])

  const move = useCallback((point: Point): void => {
    const tooltip = tooltipRef.current
    if (!tooltip) return

    const position = calculateCursorTooltipPosition(point, tooltipSizeRef.current, {
      width: window.innerWidth,
      height: window.innerHeight
    })
    tooltip.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`
  }, [])

  const show = useCallback(
    (content: string, point: Point): void => {
      const tooltip = tooltipRef.current
      if (!tooltip) return

      tooltip.textContent = content
      const bounds = tooltip.getBoundingClientRect()
      tooltipSizeRef.current = { width: bounds.width, height: bounds.height }
      move(point)
      tooltip.dataset.visible = 'true'
      tooltip.setAttribute('aria-hidden', 'false')
    },
    [move]
  )

  const hide = useCallback((): void => {
    const tooltip = tooltipRef.current
    if (!tooltip) return
    tooltip.dataset.visible = 'false'
    tooltip.setAttribute('aria-hidden', 'true')
  }, [])

  useEffect(() => {
    window.addEventListener('blur', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      window.removeEventListener('blur', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [hide])

  const value = useMemo(() => ({ show, move, hide, isVisible }), [hide, isVisible, move, show])

  return (
    <CursorTooltipContext.Provider value={value}>
      {children}
      <div
        ref={tooltipRef}
        id={TOOLTIP_ID}
        role="tooltip"
        aria-hidden="true"
        data-visible="false"
        className="cursor-tooltip"
      />
    </CursorTooltipContext.Provider>
  )
}

function shouldSuppressTooltip(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('button, a, .ant-btn, .ant-collapse, .ant-collapse-content, [role="button"]')
  )
}

export function CursorTooltip({ title, children }: CursorTooltipProps): React.JSX.Element {
  const tooltip = useContext(CursorTooltipContext)
  const child = Children.only(children)

  if (!tooltip) return child

  return cloneElement(child, {
    'aria-describedby': TOOLTIP_ID,
    'data-cursor-tooltip-target': 'true',
    onPointerEnter: (event) => {
      child.props.onPointerEnter?.(event)
      if (shouldSuppressTooltip(event.target)) {
        tooltip.hide()
      } else {
        tooltip.show(title, { x: event.clientX, y: event.clientY })
      }
    },
    onPointerMove: (event) => {
      child.props.onPointerMove?.(event)
      if (shouldSuppressTooltip(event.target)) {
        tooltip.hide()
      } else if (!tooltip.isVisible()) {
        tooltip.show(title, { x: event.clientX, y: event.clientY })
      } else {
        tooltip.move({ x: event.clientX, y: event.clientY })
      }
    },
    onPointerLeave: (event) => {
      child.props.onPointerLeave?.(event)
      tooltip.hide()
    },
    onPointerCancel: (event) => {
      child.props.onPointerCancel?.(event)
      tooltip.hide()
    },
    onFocus: (event) => {
      child.props.onFocus?.(event)
      if (shouldSuppressTooltip(event.target)) {
        tooltip.hide()
      } else {
        const bounds = event.currentTarget.getBoundingClientRect()
        tooltip.show(title, { x: bounds.left + bounds.width / 2, y: bounds.bottom })
      }
    },
    onBlur: (event) => {
      child.props.onBlur?.(event)
      tooltip.hide()
    }
  })
}
