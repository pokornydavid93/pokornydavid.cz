import React, { ComponentPropsWithoutRef, CSSProperties } from "react"
import { Play } from "lucide-react"

import { cn } from "@/lib/utils"

interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number
  mainCircleOpacity?: number
  numCircles?: number

  /** Play ikona uprostřed */
  showPlay?: boolean
  playSize?: number
  playColor?: string
}

export const Ripple = React.memo(function Ripple({
  mainCircleSize = 200,
  mainCircleOpacity = 0.54,
  numCircles = 2,
  showPlay = true,
  playSize = 35,
  playColor = "rgb(var(--brand-tertiary-rgb))",
  className,
  ...props
}: RippleProps) {
  const centerSize = mainCircleSize

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0  select-none",
        className
      )}
      {...props}
    >
      {/* Ripples */}
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70
        const opacity = mainCircleOpacity - i * 0.03
        const animationDelay = `${i * 0.06}s`

        return (
          <div
            key={i}
            className="animate-ripple bg-foreground/25 absolute rounded-full border shadow-xl"
            style={
              {
                "--i": i,
                width: `${size}px`,
                height: `${size}px`,
                opacity,
                animationDelay,
                borderStyle: "solid",
                borderWidth: "1px",
                borderColor: `var(--brand-tertiary)`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        )
      })}

      {/* Center play */}
      {showPlay && (
        <div
          className="absolute left-1/2 top-1/2 grid place-items-center rounded-full border"
          style={
            {
              width: `${Math.max(72, Math.floor(centerSize * 0.42))}px`,
              height: `${Math.max(72, Math.floor(centerSize * 0.42))}px`,
              transform: "translate(-50%, -50%)",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: `color-mix(in srgb, ${playColor} 55%, transparent)`,
              background: "transparent",
              boxShadow:
                "0 18px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
            } as CSSProperties
          }
        >
  

          <Play
            size={playSize}
            className="relative"
            style={
              {
                color: `color-mix(in srgb, ${playColor} 95%, white 5%)`,
                // opticky vycentruje "play" (trochu je posunutý doprava)
                transform: "translateX(1px)",
              } as CSSProperties
            }
          />
        </div>
      )}
    </div>
  )
})

Ripple.displayName = "Ripple"
