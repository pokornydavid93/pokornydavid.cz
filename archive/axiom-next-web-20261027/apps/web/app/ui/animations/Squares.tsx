"use client";

import { useRef, useEffect } from "react";
import s from "./squares.module.css";

type Direction = "right" | "left" | "up" | "down" | "diagonal";

interface SquaresProps {
  direction?: Direction;
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  className?: string;
}

const Squares = ({
  direction = "right",
  speed = 1,
  borderColor = "currentColor",
  squareSize = 40,
  hoverFillColor = "transparent",
  className = ""
}: SquaresProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const numSquaresX = useRef<number>(0);
  const numSquaresY = useRef<number>(0);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      numSquaresX.current = Math.ceil(canvas.width / squareSize) + 1;
      numSquaresY.current = Math.ceil(canvas.height / squareSize) + 1;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const startX =
        Math.floor(gridOffset.current.x / squareSize) * squareSize;
      const startY =
        Math.floor(gridOffset.current.y / squareSize) * squareSize;

      for (let x = startX; x < canvas.width + squareSize; x += squareSize) {
        for (let y = startY; y < canvas.height + squareSize; y += squareSize) {
          const squareX = x - (gridOffset.current.x % squareSize);
          const squareY = y - (gridOffset.current.y % squareSize);

          const hover = hoveredSquare.current;
          if (
            hover &&
            Math.floor((x - startX) / squareSize) === hover.x &&
            Math.floor((y - startY) / squareSize) === hover.y
          ) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(squareX, squareY, squareSize, squareSize);
          }

          ctx.strokeStyle = borderColor;
          ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        }
      }
    };

    const updateAnimation = () => {
      const effectiveSpeed = Math.max(speed, 0.1);

      switch (direction) {
        case "right":
          gridOffset.current.x =
            (gridOffset.current.x - effectiveSpeed + squareSize) %
            squareSize;
          break;

        case "left":
          gridOffset.current.x =
            (gridOffset.current.x + effectiveSpeed + squareSize) %
            squareSize;
          break;

        case "up":
          gridOffset.current.y =
            (gridOffset.current.y + effectiveSpeed + squareSize) %
            squareSize;
          break;

        case "down":
          gridOffset.current.y =
            (gridOffset.current.y - effectiveSpeed + squareSize) %
            squareSize;
          break;

        case "diagonal":
          gridOffset.current.x =
            (gridOffset.current.x - effectiveSpeed + squareSize) %
            squareSize;
          gridOffset.current.y =
            (gridOffset.current.y - effectiveSpeed + squareSize) %
            squareSize;
          break;
      }

      drawGrid();
      requestRef.current = requestAnimationFrame(updateAnimation);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const startX =
        Math.floor(gridOffset.current.x / squareSize) * squareSize;
      const startY =
        Math.floor(gridOffset.current.y / squareSize) * squareSize;

      const hoveredSquareX = Math.floor(
        (mouseX + gridOffset.current.x - startX) / squareSize
      );
      const hoveredSquareY = Math.floor(
        (mouseY + gridOffset.current.y - startY) / squareSize
      );

      hoveredSquare.current = { x: hoveredSquareX, y: hoveredSquareY };
    };

    const handleMouseLeave = () => {
      hoveredSquare.current = null;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    requestRef.current = requestAnimationFrame(updateAnimation);

    return () => {
      cancelAnimationFrame(requestRef.current!);
      window.removeEventListener("resize", resizeCanvas);

      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize]);

  return (
    <canvas ref={canvasRef} className={`${s.canvas} ${className}`} />
  );
};

export default Squares;
