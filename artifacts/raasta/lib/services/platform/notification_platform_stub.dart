/// Stub for mobile/desktop — no browser Notification API.
Future<bool> requestNotificationPermission() async => false;

void showBrowserNotification(String title, String body) {
  // No-op on mobile — in-app banners handle it instead.
}
