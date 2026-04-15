import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

/**
 * Android foreground-service location while navigation is active in background.
 * Keeps GPS warm so when the user returns (e.g. after a call), fixes are fresh.
 */
export const BACKGROUND_NAVIGATION_TASK = "RAASTA_NAVIGATION_LOCATION";

if (!TaskManager.isTaskDefined(BACKGROUND_NAVIGATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_NAVIGATION_TASK, async () => {
    /* Foreground service keeps GPS alive; map UI uses watchPosition in the foreground. */
    await Promise.resolve();
  });
}

export async function startBackgroundNavigationUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
  if (started) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 20,
    timeInterval: 4000,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Raasta navigation",
      notificationBody: "Following your route",
      notificationColor: "#01411C",
    },
  });
}

export async function stopBackgroundNavigationUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_NAVIGATION_TASK);
  }
}
