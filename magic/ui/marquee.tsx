"use client"

import React, { ComponentPropsWithoutRef, useLayoutEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  className?: string
  vertical?: boolean
  speed?: number
  reverse?: boolean
  repeat?: number
  pauseOnHover?: boolean
  gap?: number | string
  children: React.ReactNode
}

export function Marquee({
  className,
  vertical = true,
  speed = 0.4,
  reverse = false,
  repeat = 6,
  pauseOnHover = false,
  gap = 30,
  children,
  ...rest
}: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const offset = useRef(0)
  const isDragging = useRef(false)
  const isPointerDown = useRef(false)
  const isHovering = useRef(false)

  const lastPos = useRef(0)
  const startPos = useRef(0)
  const size = useRef(0)
  const raf = useRef<number | null>(null)

  const gapValue = typeof gap === "number" ? `${gap}px` : gap
  const step = reverse ? -Math.abs(speed) : Math.abs(speed)

  const apply = () => {
    if (!trackRef.current) return
    trackRef.current.style.transform = vertical
      ? `translate3d(0, ${-offset.current}px, 0)`
      : `translate3d(${-offset.current}px, 0, 0)`
  }

  const normalize = () => {
    const s = size.current
    if (s <= 0) return
    offset.current = ((offset.current % s) + s) % s
  }

  const tick = () => {
    const paused = isDragging.current || (pauseOnHover && isHovering.current)

    if (!paused) {
      offset.current += step
      normalize()
      apply()
    }

    raf.current = requestAnimationFrame(tick)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true
    isDragging.current = false
    lastPos.current = vertical ? e.clientY : e.clientX
    startPos.current = lastPos.current
  }

  const beginDrag = (e: React.PointerEvent, pos: number) => {
    isDragging.current = true
    lastPos.current = pos
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return

    const pos = vertical ? e.clientY : e.clientX
    const moved = Math.abs(pos - startPos.current)
    if (!isDragging.current) {
      if (moved < 6) return
      beginDrag(e, pos)
    }

    const delta = pos - lastPos.current
    lastPos.current = pos
    offset.current -= delta
    normalize()
    apply()
  }

  const endDrag = (e: React.PointerEvent) => {
    isPointerDown.current = false
    if (!isDragging.current) return
    isDragging.current = false
    containerRef.current?.releasePointerCapture(e.pointerId)
  }

  useLayoutEffect(() => {
    if (!trackRef.current) return

    const first = trackRef.current.children[0] as HTMLElement | undefined
    if (!first) return

    size.current = vertical ? first.offsetHeight : first.offsetWidth

    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical, step, pauseOnHover, gapValue])

  return (
    <div
      {...rest}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onMouseEnter={() => (isHovering.current = true)}
      onMouseLeave={() => (isHovering.current = false)}
      style={{
        // 🔑 KLÍČOVÁ VĚC PRO MOBIL
        touchAction: vertical ? "pan-x" : "pan-y",
      }}
      className={cn(
        "overflow-hidden cursor-grab active:cursor-grabbing select-none",
        className
      )}
    >
      <div
        ref={trackRef}
        className={cn(
          "flex will-change-transform",
          vertical ? "flex-col" : "flex-row"
        )}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex shrink-0",
              vertical ? "flex-col" : "flex-row"
            )}
            style={{ gap: gapValue }}
          >
            {children}

            {/* spacer – vytváří gap mezi cykly */}
            <div aria-hidden />
          </div>
        ))}
      </div>
    </div>
  )
}
