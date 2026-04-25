// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Requests browser push-notification permission and returns true if granted.
Future<bool> requestNotificationPermission() async {
  try {
    final result = await html.Notification.requestPermission();
    return result == 'granted';
  } catch (_) {
    return false;
  }
}

/// Fires a native browser OS notification.
void showBrowserNotification(String title, String body) {
  try {
    html.Notification('🚦 $title', body: body);
  } catch (_) {}
}
