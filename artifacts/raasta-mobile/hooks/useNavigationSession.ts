import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import * as Location from "expo-location";
import { planRoute, type RoutePlanResponse } from "@/api/routePlan";
import {
  startBackgroundNavigationUpdates,
  stopBackgroundNavigationUpdates,
} from "@/lib/navigationLocationTask";

export const FOLLOW_ZOOM = 17;
const CAMERA_THROTTLE_MS = 2000;
const CAMERA_THROTTLE_NAV_MS = 1400;
const PERIODIC_REPLAN_MS = 120_000;

export type NavDestination = { lat: number; lng: number };

/** Live sample for the navigation vehicle puck (high frequency; not camera-throttled). */
export type NavUserSample = {
  latitude: number;
  longitude: number;
  /** Degrees clockwise from north; smoothed fallback if GPS omits heading. */
  headingDeg: number;
  speedMps: number | null;
};

/**
 * Google Maps–style navigation: follow user, re-fetch route from current GPS → destination
 * when the app returns to the foreground (or on a timer), optional Android FGS in background.
 */
export function useNavigationSession(options: {
  active: boolean;
  destination: NavDestination | null;
  onReplanned: (plan: RoutePlanResponse) => void;
  /** Android MapLibre: [lng, lat] */
  onFollowCoordinate?: (coord: [number, number]) => void;
  /** iOS: region center */
  onFollowRegion?: (lat: number, lng: number) => void;
  /** Every GPS tick while navigating — for vehicle marker & bearing (independent of camera throttle). */
  onUserNavigationSample?: (sample: NavUserSample) => void;
}) {
  const {
    active,
    destination,
    onReplanned,
    onFollowCoordinate,
    onFollowRegion,
    onUserNavigationSample,
  } = options;
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastCameraAt = useRef(0);
  const lastHeadingDegRef = useRef(0);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const prevAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const sessionIdRef = useRef(0);

  const replanFromCurrentPosition = useCallback(async () => {
    if (!destination) return;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const next = await planRoute({
        fromLat: pos.coords.latitude,
        fromLng: pos.coords.longitude,
        toLat: destination.lat,
        toLng: destination.lng,
      });
      onReplanned(next);
    } catch {
      /* keep previous polyline */
    }
  }, [destination, onReplanned]);

  const maybeMoveCamera = useCallback(
    (lat: number, lng: number, navigating: boolean) => {
      const now = Date.now();
      const minMs = navigating ? CAMERA_THROTTLE_NAV_MS : CAMERA_THROTTLE_MS;
      if (now - lastCameraAt.current < minMs) return;
      lastCameraAt.current = now;
      onFollowCoordinate?.([lng, lat]);
      onFollowRegion?.(lat, lng);
    },
    [onFollowCoordinate, onFollowRegion],
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      setAppState(next);
    });
    return () => sub.remove();
  }, []);

  /* After tapping Start: align polyline to latest GPS → B once. */
  useEffect(() => {
    if (!active || !destination) return;
    sessionIdRef.current += 1;
    const token = sessionIdRef.current;
    const t = setTimeout(() => {
      if (token !== sessionIdRef.current) return;
      void replanFromCurrentPosition();
    }, 450);
    return () => clearTimeout(t);
  }, [active, destination?.lat, destination?.lng, replanFromCurrentPosition]);

  /* Foreground watch while navigation is active. */
  useEffect(() => {
    if (!active || !destination) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted" || cancelled) return;

      await Location.requestBackgroundPermissionsAsync().catch(() => undefined);

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 6,
          timeInterval: 900,
        },
        loc => {
          const { latitude, longitude, heading, speed } = loc.coords;
          let headingDeg = lastHeadingDegRef.current;
          if (typeof heading === "number" && !Number.isNaN(heading) && heading >= 0) {
            lastHeadingDegRef.current = heading;
            headingDeg = heading;
          }
          onUserNavigationSample?.({
            latitude,
            longitude,
            headingDeg,
            speedMps: speed != null && !Number.isNaN(speed) ? speed : null,
          });
          maybeMoveCamera(latitude, longitude, true);
        },
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      watchRef.current = sub;
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [active, destination?.lat, destination?.lng, maybeMoveCamera, onUserNavigationSample]);

  useEffect(() => {
    if (!active) lastHeadingDegRef.current = 0;
  }, [active]);

  /* Replan when returning from background or a phone call (inactive → active). */
  useEffect(() => {
    if (!active || !destination) {
      prevAppStateRef.current = appState;
      return;
    }
    const prev = prevAppStateRef.current;
    prevAppStateRef.current = appState;
    if (prev !== "active" && appState === "active") {
      void replanFromCurrentPosition();
    }
  }, [appState, active, destination, replanFromCurrentPosition]);

  /* Android: foreground-service location task while app is not active (reduces GPS stale on return). */
  useEffect(() => {
    if (!active || !destination || Platform.OS !== "android") return;

    if (appState === "active") {
      void stopBackgroundNavigationUpdates();
    } else {
      void startBackgroundNavigationUpdates().catch(() => undefined);
    }

    return () => {
      void stopBackgroundNavigationUpdates();
    };
  }, [active, destination?.lat, destination?.lng, appState]);

  /* Periodic replan while navigating (long trips). */
  useEffect(() => {
    if (!active || !destination) {
      if (periodicRef.current) {
        clearInterval(periodicRef.current);
        periodicRef.current = null;
      }
      return;
    }
    periodicRef.current = setInterval(() => {
      void replanFromCurrentPosition();
    }, PERIODIC_REPLAN_MS);
    return () => {
      if (periodicRef.current) {
        clearInterval(periodicRef.current);
        periodicRef.current = null;
      }
    };
  }, [active, destination?.lat, destination?.lng, replanFromCurrentPosition]);

  useEffect(() => {
    return () => {
      void stopBackgroundNavigationUpdates();
    };
  }, []);
}
