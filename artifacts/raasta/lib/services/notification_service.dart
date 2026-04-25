import 'dart:async';
import 'dart:ui';
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
        child: Material(
          color: Colors.transparent,
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.92),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.15),
                  blurRadius: 32,
                  offset: const Offset(0, 14),
                ),
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      // Left color accent bar
                      Container(
                        width: 6,
                        decoration: BoxDecoration(
                          color: color,
                          gradient: LinearGradient(
                            colors: [color, color.withValues(alpha: 0.7)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              // Status indicator icon
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      color.withValues(alpha: 0.18),
                                      color.withValues(alpha: 0.05)
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(15),
                                ),
                                child: Center(
                                  child: Icon(
                                    _iconFor(widget.notification.severity),
                                    color: color,
                                    size: 26,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 7,
                                            vertical: 2.5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: color,
                                            borderRadius: BorderRadius.circular(7),
                                            boxShadow: [
                                              BoxShadow(
                                                color: color.withValues(alpha: 0.2),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Text(
                                            widget.notification.severity
                                                .toUpperCase(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.7,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Text(
                                          'ON YOUR ROUTE',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF71717A),
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      widget.notification.title,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF09090B),
                                        height: 1.2,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 1),
                                    Text(
                                      widget.notification.body,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF71717A),
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Vertical Divider
                      Container(
                        width: 1,
                        margin: const EdgeInsets.symmetric(vertical: 16),
                        color: Colors.black.withValues(alpha: 0.05),
                      ),
                      // Close button
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            dismiss();
                            Future.delayed(
                              const Duration(milliseconds: 400),
                              widget.onDismiss,
                            );
                          },
                          borderRadius: const BorderRadius.only(
                            topRight: Radius.circular(24),
                            bottomRight: Radius.circular(24),
                          ),
                          child: const SizedBox(
                            width: 54,
                            child: Center(
                              child: Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: Color(0xFFA1A1AA),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
