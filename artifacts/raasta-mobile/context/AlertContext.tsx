import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Platform, AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getApiOrigin } from "@/constants/apiOrigin";

const BASE = getApiOrigin();

// Alert radius in meters
const ALERT_RADIUS_CRITICAL = 4000;   // 4km
const ALERT_RADIUS_HIGH = 3000;        // 3km
const ALERT_RADIUS_MEDIUM = 2000;      // 2km
const REPEAT_INTERVAL_MS = 15 * 60 * 1000; // 15 min

export interface ActiveAlert {
  id: string;
  title: string;
  type: string;
  severity: string;
  location: string;
  alternateRoutes?: string[];
  estimatedDuration?: string | null;
  distanceMeters: number;
  timestamp: number;
}

interface AlertContextType {
  activeAlerts: ActiveAlert[];
  currentLocation: { latitude: number; longitude: number } | null;
  isMonitoring: boolean;
  dismissAlert: (id: string) => void;
  replayAlert: (alert: ActiveAlert) => void;
  startMonitoring: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType>({
  activeAlerts: [],
  currentLocation: null,
  isMonitoring: false,
  dismissAlert: () => {},
  replayAlert: () => {},
  startMonitoring: async () => {},
});

function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function alertRadius(severity: string): number {
  if (severity === "critical") return ALERT_RADIUS_CRITICAL;
  if (severity === "high") return ALERT_RADIUS_HIGH;
  return ALERT_RADIUS_MEDIUM;
}

function buildSpeech(alert: ActiveAlert): string {
  const dist = Math.round(alert.distanceMeters / 100) * 100;
  const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} kilometres` : `${dist} metres`;

  let msg = "";
  if (alert.severity === "critical") {
    msg = `ALERT! Critical incident ahead. `;
  } else if (alert.severity === "high") {
    msg = `Warning! `;
  } else {
    msg = `Heads up. `;
  }

  switch (alert.type) {
    case "vip_movement":
      msg += `VIP convoy movement ahead on ${alert.location}. Road may be closed. `;
      break;
    case "blockage":
      msg += `Road blocked on ${alert.location}. `;
      break;
    case "construction":
      msg += `Construction work on ${alert.location}. `;
      break;
    case "accident":
      msg += `Accident on ${alert.location}. `;
      break;
    case "congestion":
      msg += `Heavy congestion on ${alert.location}. Do not take this route. `;
      break;
    default:
      msg += `${alert.title} on ${alert.location}. `;
  }

  msg += `Approximately ${distStr} ahead. `;

  if (alert.alternateRoutes && alert.alternateRoutes.length > 0) {
    const routes = alert.alternateRoutes.slice(0, 2).join(", and ");
    msg += `Consider using ${routes} as alternate route.`;
  } else {
    msg += `Please find an alternate route.`;
  }

  return msg;
}

async function scheduleLocalNotification(alert: ActiveAlert) {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const dist = Math.round(alert.distanceMeters / 100) * 100;
    const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`;

    let emoji = "⚠️";
    if (alert.severity === "critical") emoji = "🚨";
    if (alert.type === "vip_movement") emoji = "🚔";
    if (alert.type === "congestion") emoji = "🚦";

    const altText = alert.alternateRoutes?.length
      ? `Use: ${alert.alternateRoutes[0]}`
      : "Find alternate route";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${emoji} ${alert.title}`,
        body: `${distStr} ahead on ${alert.location}. ${altText}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { alertId: alert.id },
      },
      trigger: null,
    });
  } catch {}
}

const DISMISSED_KEY = "raasta_dismissed_alerts";
const SPOKEN_KEY = "raasta_spoken_alerts";

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);
  const dismissedRef = useRef<Set<string>>(new Set());
  const spokenTimestamps = useRef<Map<string, number>>(new Map());

  // Configure notification handler
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldShowAlert: true,
      }),
    });
    requestNotificationPermission();
    loadDismissed();
  }, []);

  async function requestNotificationPermission() {
    if (Platform.OS === "web") return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    } catch {}
  }

  async function loadDismissed() {
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        dismissedRef.current = new Set(arr);
      }
    } catch {}
  }

  async function saveDismissed() {
    try {
      await AsyncStorage.setItem(
        DISMISSED_KEY,
        JSON.stringify([...dismissedRef.current])
      );
    } catch {}
  }

  const checkProximity = useCallback(async (
    lat: number,
    lng: number,
  ) => {
    try {
      const res = await fetch(`${BASE}/api/incidents?status=active`);
      if (!res.ok) return;
      const incidents = await res.json() as Array<{
        id: string;
        title: string;
        type: string;
        severity: string;
        location: string;
        lat: number;
        lng: number;
        status: string;
        alternateRoutes?: string[];
        estimatedDuration?: string | null;
      }>;

      const now = Date.now();
      const newAlerts: ActiveAlert[] = [];

      for (const incident of incidents) {
        if (incident.status !== "active") continue;
        if (dismissedRef.current.has(incident.id)) continue;

        const dist = haversineMeters(lat, lng, incident.lat, incident.lng);
        const radius = alertRadius(incident.severity);
        if (dist > radius) continue;

        const lastSpoken = spokenTimestamps.current.get(incident.id) ?? 0;
        const shouldSpeak = now - lastSpoken > REPEAT_INTERVAL_MS;

        const alert: ActiveAlert = {
          id: incident.id,
          title: incident.title,
          type: incident.type,
          severity: incident.severity,
          location: incident.location,
          alternateRoutes: incident.alternateRoutes,
          estimatedDuration: incident.estimatedDuration,
          distanceMeters: dist,
          timestamp: now,
        };

        newAlerts.push(alert);

        if (shouldSpeak) {
          spokenTimestamps.current.set(incident.id, now);
          const text = buildSpeech(alert);

          if (Platform.OS !== "web") {
            // Check if app is foregrounded
            if (appState.current === "active") {
              await speakAlert(text);
            } else {
              // App backgrounded — use notification
              await scheduleLocalNotification(alert);
            }
          }
        }
      }

      // Keep showing already-active alerts that haven't been dismissed
      setActiveAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const incoming = newAlerts.filter((a) => !dismissedRef.current.has(a.id));
        // Merge: update distances on existing, add new
        const merged = incoming.map((a) => {
          const old = prev.find((p) => p.id === a.id);
          return old ? { ...old, distanceMeters: a.distanceMeters } : a;
        });
        return merged;
      });
    } catch {}
  }, []);

  async function speakAlert(text: string) {
    if (Platform.OS === "web") return;
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }
      Speech.speak(text, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
        onError: () => {},
      });
    } catch {}
  }

  const startMonitoring = useCallback(async () => {
    if (isMonitoring) return;

    if (Platform.OS !== "web") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30_000,
          distanceInterval: 200,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentLocation({ latitude, longitude });
          checkProximity(latitude, longitude);
        }
      );
    } else {
      // Web: use browser geolocation
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCurrentLocation({ latitude, longitude });
            checkProximity(latitude, longitude);
          },
          () => {},
          { enableHighAccuracy: false, maximumAge: 30000 }
        );
      }
    }

    setIsMonitoring(true);

    // Poll every 30s regardless
    pollTimer.current = setInterval(async () => {
      if (currentLocation) {
        await checkProximity(currentLocation.latitude, currentLocation.longitude);
      }
    }, 30_000);
  }, [isMonitoring, currentLocation, checkProximity]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      appState.current = state;
    });
    return () => sub.remove();
  }, []);

  // Start monitoring automatically
  useEffect(() => {
    startMonitoring();
    return () => {
      locationSubscription.current?.remove();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const dismissAlert = useCallback((id: string) => {
    dismissedRef.current.add(id);
    saveDismissed();
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const replayAlert = useCallback((alert: ActiveAlert) => {
    const text = buildSpeech(alert);
    speakAlert(text);
  }, []);

  return (
    <AlertContext.Provider value={{
      activeAlerts,
      currentLocation,
      isMonitoring,
      dismissAlert,
      replayAlert,
      startMonitoring,
    }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  return useContext(AlertContext);
}
