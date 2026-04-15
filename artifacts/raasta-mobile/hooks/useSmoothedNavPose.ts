import { useEffect, useRef, useState } from "react";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Shortest-path interpolation between two headings (degrees, 0–360). */
function lerpHeading(from: number, to: number, t: number): number {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return (from + d * t + 360) % 360;
}

export type SmoothedNavPose = {
  latitude: number;
  longitude: number;
  headingDeg: number;
};

/**
 * Eases the nav puck toward live GPS samples so motion feels continuous (Maps-like),
 * without opening a new location watch.
 */
export function useSmoothedNavPose(
  active: boolean,
  target: { latitude: number; longitude: number; headingDeg: number } | null,
): SmoothedNavPose | null {
  const [out, setOut] = useState<SmoothedNavPose | null>(null);
  const poseRef = useRef<SmoothedNavPose | null>(null);
  const targetRef = useRef<typeof target>(null);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!active) {
      poseRef.current = null;
      setOut(null);
      return;
    }

    let raf = 0;
    const step = () => {
      const t = targetRef.current;
      if (!t) {
        raf = requestAnimationFrame(step);
        return;
      }
      const p = poseRef.current;
      if (!p) {
        poseRef.current = {
          latitude: t.latitude,
          longitude: t.longitude,
          headingDeg: t.headingDeg,
        };
        setOut({ ...poseRef.current });
        raf = requestAnimationFrame(step);
        return;
      }

      const alphaPos = 0.28;
      const nextLat = lerp(p.latitude, t.latitude, alphaPos);
      const nextLng = lerp(p.longitude, t.longitude, alphaPos);
      const nextH = lerpHeading(p.headingDeg, t.headingDeg, 0.42);

      const moved =
        Math.abs(nextLat - p.latitude) > 1e-8 ||
        Math.abs(nextLng - p.longitude) > 1e-8 ||
        Math.abs(nextH - p.headingDeg) > 0.2;

      poseRef.current = {
        latitude: nextLat,
        longitude: nextLng,
        headingDeg: nextH,
      };
      if (moved) setOut({ ...poseRef.current });

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return active ? out : null;
}
