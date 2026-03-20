"use client";

import { useCallback, useRef } from "react";

interface UseRadarDragOptions {
  svgRef: React.RefObject<SVGSVGElement | null>;
  center: { x: number; y: number };
  radius: number;
  dimensions: string[];
  onValueChange: (dimension: string, value: number) => void;
}

export function useRadarDrag({
  svgRef,
  center,
  radius,
  dimensions,
  onValueChange,
}: UseRadarDragOptions) {
  const draggingRef = useRef<string | null>(null);

  const screenToPolar = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

      const dx = svgPt.x - center.x;
      const dy = svgPt.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Angle from top (12 o'clock), clockwise, in radians
      let angle = Math.atan2(dx, -dy);
      if (angle < 0) angle += 2 * Math.PI;

      return { angle, dist };
    },
    [svgRef, center]
  );

  const angleToDimension = useCallback(
    (angle: number): string | null => {
      const count = dimensions.length;
      const sliceAngle = (2 * Math.PI) / count;

      // Find closest dimension by angle
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < count; i++) {
        const dimAngle = i * sliceAngle;
        let diff = Math.abs(angle - dimAngle);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }

      // Only accept if within half a slice
      if (bestDiff <= sliceAngle / 2) {
        return dimensions[bestIdx];
      }
      return null;
    },
    [dimensions]
  );

  const distToValue = useCallback(
    (dist: number): number => {
      const raw = (dist / radius) * 10;
      return Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
    },
    [radius]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const polar = screenToPolar(e.clientX, e.clientY);
      if (!polar) return;

      const dim = angleToDimension(polar.angle);
      if (!dim) return;

      draggingRef.current = dim;
      (e.target as Element).setPointerCapture(e.pointerId);
      e.preventDefault();

      const value = distToValue(polar.dist);
      onValueChange(dim, value);
    },
    [screenToPolar, angleToDimension, distToValue, onValueChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;

      const polar = screenToPolar(e.clientX, e.clientY);
      if (!polar) return;

      const value = distToValue(polar.dist);
      onValueChange(draggingRef.current, value);
    },
    [screenToPolar, distToValue, onValueChange]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  };
}
