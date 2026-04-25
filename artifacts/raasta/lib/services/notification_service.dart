import 'dart:async';
import 'package:flutter/material.dart';

// Conditional import: web impl on web, stub on mobile/desktop.
import 'platform/notification_platform_stub.dart'
    if (dart.library.html) 'platform/notification_platform_web.dart';

/// Manages both browser push notifications and in-app notification streams.
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  bool _permissionGranted = false;
  bool _enabled = true;

  bool get enabled => _enabled;
  bool get permissionGranted => _permissionGranted;

  // Stream of in-app notifications (title, body, severity)
  final _inAppCtrl = StreamController<InAppNotification>.broadcast();
  Stream<InAppNotification> get inAppStream => _inAppCtrl.stream;

  final Set<String> _sentAlertIds = {};

  /// Call at app startup — asks for browser notification permission (web only).
  Future<void> initialize() async {
    _permissionGranted = await requestNotificationPermission();
  }

  void setEnabled(bool value) => _enabled = value;

  /// Fire both an in-app banner and (on web) a browser OS notification.
  void sendAlert({
    required String id,
    required String title,
    required String body,
    required String severity,
    bool forceResend = false,
  }) {
    if (!_enabled) return;
    if (!forceResend && _sentAlertIds.contains(id)) return;
    _sentAlertIds.add(id);

    // In-app banner always shows (all platforms)
    _inAppCtrl.add(InAppNotification(title: title, body: body, severity: severity));

    // Browser OS notification — no-op on mobile
    if (_permissionGranted) {
      showBrowserNotification(title, body);
    }
  }

  /// Mark that we haven't sent this alert yet (useful after route changes).
  void resetSent(String id) => _sentAlertIds.remove(id);
  void resetAllSent() => _sentAlertIds.clear();

  void dispose() {
    _inAppCtrl.close();
  }
}

class InAppNotification {
  final String title;
  final String body;
  final String severity;
  InAppNotification({required this.title, required this.body, required this.severity});
}

/// Overlay widget that listens to in-app notification stream and shows sliding banners.
class AlertBannerOverlay extends StatefulWidget {
  final Widget child;
  const AlertBannerOverlay({super.key, required this.child});

  @override
  State<AlertBannerOverlay> createState() => _AlertBannerOverlayState();
}

class _AlertBannerOverlayState extends State<AlertBannerOverlay> {
  final List<_ActiveBanner> _banners = [];
  late StreamSubscription _sub;

  @override
  void initState() {
    super.initState();
    _sub = NotificationService().inAppStream.listen(_addBanner);
  }

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }

  void _addBanner(InAppNotification n) {
    final key = GlobalKey<_BannerTileState>();
    setState(() => _banners.add(_ActiveBanner(key: key, notification: n)));
    Future.delayed(const Duration(seconds: 6), () {
      if (mounted) {
        key.currentState?.dismiss();
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) setState(() => _banners.removeWhere((b) => b.key == key));
        });
      }
    });
  }

  void _remove(GlobalKey key) {
    setState(() => _banners.removeWhere((b) => b.key == key));
  }

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      widget.child,
      Positioned(
        top: MediaQuery.of(context).padding.top + 8,
        left: 12,
        right: 12,
        child: Column(
          children: _banners.map((b) => _BannerTile(
            key: b.key,
            notification: b.notification,
            onDismiss: () => _remove(b.key),
          )).toList(),
        ),
      ),
    ]);
  }
}

class _ActiveBanner {
  final GlobalKey<_BannerTileState> key;
  final InAppNotification notification;
  _ActiveBanner({required this.key, required this.notification});
}

class _BannerTile extends StatefulWidget {
  final InAppNotification notification;
  final VoidCallback onDismiss;
  const _BannerTile({super.key, required this.notification, required this.onDismiss});

  @override
  State<_BannerTile> createState() => _BannerTileState();
}

class _BannerTileState extends State<_BannerTile> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slide;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _slide = Tween(begin: const Offset(0, -1.5), end: Offset.zero)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack));
    _fade = Tween(begin: 0.0, end: 1.0)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _ctrl.forward();
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  void dismiss() => _ctrl.reverse();

  static Color _colorFor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical': return const Color(0xFFB71C1C);
      case 'high':     return const Color(0xFFE65100);
      case 'medium':   return const Color(0xFFF9A825);
      default:         return const Color(0xFF2E7D32);
    }
  }

  static IconData _iconFor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical': return Icons.warning_rounded;
      case 'high':     return Icons.priority_high_rounded;
      default:         return Icons.info_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(widget.notification.severity);
    return FadeTransition(
      opacity: _fade,
      child: SlideTransition(
        position: _slide,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border(left: BorderSide(color: color, width: 5)),
            boxShadow: [
              BoxShadow(color: color.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 6)),
              BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(14),
              child: Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_iconFor(widget.notification.severity), color: color, size: 24),
              ),
            ),
            Expanded(child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
                    child: Text(
                      widget.notification.severity.toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text('ON YOUR ROUTE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF9E9E9E), letterSpacing: 0.5)),
                ]),
                const SizedBox(height: 4),
                Text(widget.notification.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0D0D0D)), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(widget.notification.body,  style: const TextStyle(fontSize: 12, color: Color(0xFF9E9E9E)), maxLines: 1, overflow: TextOverflow.ellipsis),
              ]),
            )),
            IconButton(
              onPressed: () {
                dismiss();
                Future.delayed(const Duration(milliseconds: 400), widget.onDismiss);
              },
              icon: const Icon(Icons.close_rounded, size: 18, color: Color(0xFF9E9E9E)),
            ),
          ]),
        ),
      ),
    );
  }
}
