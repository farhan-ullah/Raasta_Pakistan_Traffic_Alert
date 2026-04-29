import 'dart:ui';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/traffic_alert.dart';
import '../../providers/alert_provider.dart';
import '../../providers/police_provider.dart';
import '../../providers/route_provider.dart';
import '../../services/notification_service.dart';
import '../../services/voice_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';

// ═══════════════════════════════════════════════════════════
//  MapScreen — heavy map widget, no setState on key presses
// ═══════════════════════════════════════════════════════════

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen>
    with SingleTickerProviderStateMixin {
  final _mapCtrl = MapController();
  bool _showAlerts = true;
  bool _showPolice = true;
  bool _isNavigating = false;

  late AnimationController _pulseCtrl;
  late Animation<double> _pulseAnim;

  final _voice = VoiceService();
  StreamSubscription<Position>? _positionSub;

  static const _islamabad = LatLng(33.6844, 73.0479);

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnim = Tween(
      begin: 0.6,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initLocation();
    });
  }

  Future<void> _initLocation() async {
    final rp = context.read<RouteProvider>();
    await rp.updateCurrentLocation();

    _positionSub =
        Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 10,
          ),
        ).listen((pos) {
          final loc = LatLng(pos.latitude, pos.longitude);
          rp.setCurrentLocation(loc);
          if (_isNavigating) {
            _mapCtrl.move(loc, _mapCtrl.camera.zoom);

            // Update navigation progress
            final oldStep = rp.currentStepIndex;
            rp.updateProgress(loc);
            if (rp.currentStepIndex != oldStep) {
              // New step reached!
              if (rp.currentStep != null) {
                _voice.speakText(rp.currentStep!.instruction);
              }
            }

            // Check for new blockages ahead on route
            final alerts = context.read<AlertProvider>().alerts;
            final onRoute = rp.checkAlertsOnAllRoutes(alerts);
            
            final now = DateTime.now();
            final shouldAlert = _lastBlockageAlertTime == null || 
                now.difference(_lastBlockageAlertTime!).inMinutes >= 2;

            if (onRoute.isNotEmpty && shouldAlert && !_voice.isSpeaking) {
              _lastBlockageAlertTime = now;
              final alert = onRoute.first;
              final type = alert.type.toLowerCase();
              
              if (type.contains('vip')) {
                _voice.speak('vip_movement');
              } else if (type.contains('accident')) {
                _voice.speak('accident');
              } else if (type.contains('construction')) {
                _voice.speak('construction');
              } else if (type.contains('congestion') || type.contains('jam')) {
                _voice.speak('congestion');
              } else {
                _voice.speak('blockage_ahead');
              }
            }
          }
        });
  }

  DateTime? _lastBlockageAlertTime;

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _positionSub?.cancel();
    super.dispose();
  }

  void _onRouteFound(RouteProvider rp) {
    final alerts = context.read<AlertProvider>().alerts;
    final onRoute = rp.checkAlertsOnAllRoutes(alerts);
    if (_voice.enabled) _voice.speak('route_found');
    for (final alert in onRoute) {
      NotificationService().sendAlert(
        id: alert.id,
        title: alert.title,
        body: alert.area.isNotEmpty
            ? 'Located in ${alert.area}'
            : (alert.description.isNotEmpty
                  ? alert.description
                  : 'Alert on your route'),
        severity: alert.severity,
      );
    }
    if (onRoute.isNotEmpty && _voice.enabled) {
      Future.delayed(
        const Duration(seconds: 2),
        () => _voice.speak('blockage_ahead'),
      );
    }
    // Zoom to midpoint
    final sel = rp.selectedRoute;
    if (sel != null && rp.from != null && rp.to != null) {
      final center = LatLng(
        (rp.from!.coords.latitude + rp.to!.coords.latitude) / 2,
        (rp.from!.coords.longitude + rp.to!.coords.longitude) / 2,
      );
      _mapCtrl.move(center, 12);
    }
  }

  void _selectAlternative(int index) {
    final rp = context.read<RouteProvider>();
    rp.selectAlternative(index);
    Navigator.pop(context);
    if (_voice.enabled) _voice.speak('alt_selected');
    final sel = rp.selectedRoute;
    if (sel != null && sel.points.length > 1) {
      _mapCtrl.move(
        LatLng(
          (sel.points.first.latitude + sel.points.last.latitude) / 2,
          (sel.points.first.longitude + sel.points.last.longitude) / 2,
        ),
        12,
      );
    }
  }

  void _showAlternateRoutes() {
    final rp = context.read<RouteProvider>();
    if (rp.alternatives.isEmpty) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => RaastSheet(
        height: MediaQuery.of(context).size.height * 0.65,
        scrollable: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                IconBadge(
                  icon: Icons.alt_route_rounded,
                  color: AppTheme.infoBlue,
                  size: 52,
                ),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Alternate Routes',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                      Text(
                        'Select a route to start navigating',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.textGrey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Consumer<RouteProvider>(
                builder: (_, rp, __) => ListView.separated(
                  padding: EdgeInsets.zero,
                  itemCount: rp.alternatives.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _RouteOptionCard(
                    alt: rp.alternatives[i],
                    isSelected: rp.selectedIndex == i,
                    onTap: () => _selectAlternative(i),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguagePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => RaastSheet(
        child: StatefulBuilder(
          builder: (ctx, ss) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const IconBadge(
                    icon: Icons.record_voice_over_rounded,
                    color: AppTheme.infoBlue,
                    size: 52,
                  ),
                  const SizedBox(width: 14),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Voice Language',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                      Text(
                        'Navigation instructions language',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.textGrey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ...VoiceService.languages.entries.map((e) {
                final selected = _voice.currentLanguage == e.key;
                return GestureDetector(
                  onTap: () {
                    _voice.setLanguage(e.key);
                    ss(() {});
                    Future.delayed(
                      const Duration(milliseconds: 200),
                      () => _voice.speak('route_found'),
                    );
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppTheme.infoBlue.withOpacity(0.08)
                          : const Color(0xFFF8F9FA),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: selected
                            ? AppTheme.infoBlue
                            : const Color(0xFFEEEEEE),
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Text(
                          e.value,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: selected
                                ? FontWeight.w800
                                : FontWeight.w500,
                            color: selected
                                ? AppTheme.infoBlue
                                : AppTheme.textDark,
                          ),
                        ),
                        const Spacer(),
                        if (selected)
                          const Icon(
                            Icons.check_circle_rounded,
                            color: AppTheme.infoBlue,
                          ),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showAlertSheet(TrafficAlert alert, bool onRoute) {
    final color = AppTheme.severityColor(alert.severity);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => RaastSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconBadge(icon: Icons.warning_rounded, color: color, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusBadge(
                        label: alert.severity,
                        color: color,
                        large: true,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert.title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                    ],
                  ),
                ),
                if (onRoute)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEE),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.criticalRed.withOpacity(0.3),
                      ),
                    ),
                    child: const Text(
                      'ON ROUTE',
                      style: TextStyle(
                        color: AppTheme.criticalRed,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              alert.description,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textMed,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 12),
            InfoRow(
              icon: Icons.location_on_rounded,
              label: 'Location',
              value: alert.location,
              color: color,
            ),
            InfoRow(
              icon: Icons.access_time_rounded,
              label: 'Reported',
              value: alert.timeAgo,
              color: color,
            ),
            const SizedBox(height: 16),
            if (onRoute) ...[
              GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                  _showAlternateRoutes();
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0D47A1), Color(0xFF1565C0)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.infoBlue.withOpacity(0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.alt_route_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'View Alternate Routes',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              'See cleaner, faster alternatives',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
            RaastButton(
              height: 52,
              outlined: true,
              colors: [color, color],
              onPressed: () => Navigator.pop(context),
              child: Text(
                'Close',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSimpleDetail(
    String title,
    String desc,
    Color color,
    IconData icon,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => RaastSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                IconBadge(icon: icon, color: color, size: 52),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              desc,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textMed,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 20),
            RaastButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'Close',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final alertProvider = context.watch<AlertProvider>();
    final policeProvider = context.watch<PoliceProvider>();
    final routeProvider = context.watch<RouteProvider>();

    final routeAlertIds = routeProvider.routeAlerts.map((a) => a.id).toSet();

    return Scaffold(
      body: Stack(
        children: [
          // ─── Map (never rebuilds from search field changes) ───
          FlutterMap(
            mapController: _mapCtrl,
            options: MapOptions(
              initialCenter: _islamabad,
              initialZoom: 12.5,
              minZoom: 8,
              maxZoom: 18,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all,
              ),
              onTap: (tapPosition, point) {
                FocusScope.of(context).unfocus();
                if (routeProvider.alternatives.length > 1) {
                  int bestIndex = -1;
                  double minDistance = double.infinity;
                  for (int i = 0; i < routeProvider.alternatives.length; i++) {
                    final alt = routeProvider.alternatives[i];
                    for (int j = 0; j < alt.points.length; j += 5) {
                      final p = alt.points[j];
                      final dist =
                          (p.latitude - point.latitude) *
                              (p.latitude - point.latitude) +
                          (p.longitude - point.longitude) *
                              (p.longitude - point.longitude);
                      if (dist < minDistance) {
                        minDistance = dist;
                        bestIndex = i;
                      }
                    }
                  }
                  // ~700 meters tap tolerance
                  if (minDistance < 0.00005 &&
                      bestIndex != -1 &&
                      bestIndex != routeProvider.selectedIndex) {
                    routeProvider.selectAlternative(bestIndex);
                  }
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.raasta.traffic',
              ),

              // My Location
              if (routeProvider.currentLocation != null &&
                  (routeProvider.routePoints.isEmpty ||
                      routeProvider.isNavigatingFromCurrentLocation))
                MarkerLayer(
                  markers: [
                    Marker(
                      point: routeProvider.currentLocation!,
                      width: 60,
                      height: 60,
                      child: AnimatedBuilder(
                        animation: _pulseAnim,
                        builder: (_, __) => Stack(
                          alignment: Alignment.center,
                          children: [
                            Container(
                              width: 44 * _pulseAnim.value,
                              height: 44 * _pulseAnim.value,
                              decoration: BoxDecoration(
                                color: AppTheme.infoBlue.withOpacity(
                                  0.3 * (1.1 - _pulseAnim.value),
                                ),
                                shape: BoxShape.circle,
                              ),
                            ),
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Container(
                                  width: 12,
                                  height: 12,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.infoBlue,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

              // Non-selected alternatives (faded/grey)
              ...routeProvider.alternatives
                  .asMap()
                  .entries
                  .where((e) => e.key != routeProvider.selectedIndex)
                  .map(
                    (e) => PolylineLayer(
                      polylines: [
                        Polyline<Object>(
                          points: e.value.points,
                          color: Colors.blueGrey.withOpacity(0.6),
                          strokeWidth: 5.0,
                          borderColor: Colors.black26,
                          borderStrokeWidth: 1.5,
                        ),
                      ],
                    ),
                  ),

              // Selected route
              if (routeProvider.routePoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline<Object>(
                      points: routeProvider.routePoints,
                      color: AppTheme.infoBlue,
                      strokeWidth: 6.0,
                      borderColor: Colors.white,
                      borderStrokeWidth: 2.5,
                    ),
                  ],
                ),

              // Origin / destination pins
              if (routeProvider.from != null || routeProvider.to != null)
                MarkerLayer(
                  markers: [
                    if (routeProvider.from != null)
                      Marker(
                        point:
                            routeProvider.routeOrigin ??
                            routeProvider.from!.coords,
                        width: 44,
                        height: 44,
                        child: const _PinMarker(
                          color: AppTheme.successGreen,
                          label: 'A',
                        ),
                      ),
                    if (routeProvider.to != null)
                      Marker(
                        point: routeProvider.to!.coords,
                        width: 44,
                        height: 44,
                        child: const _PinMarker(
                          color: AppTheme.primaryRed,
                          label: 'B',
                        ),
                      ),
                  ],
                ),

              // Alert markers
              if (_showAlerts)
                MarkerLayer(
                  markers: alertProvider.alerts
                      .take(10)
                      .map((a) {
                        final coords = LatLng(a.lat, a.lng);
                        final onRoute = routeAlertIds.contains(a.id);
                        final color = onRoute
                            ? AppTheme.criticalRed
                            : AppTheme.severityColor(a.severity);
                        final sz = onRoute ? 56.0 : 46.0;
                        return Marker(
                          point: coords,
                          width: sz,
                          height: sz,
                          child: GestureDetector(
                            onTap: () => _showAlertSheet(a, onRoute),
                            child: AnimatedBuilder(
                              animation: _pulseAnim,
                              builder: (_, child) => Stack(
                                alignment: Alignment.center,
                                children: [
                                  Container(
                                    width: sz * _pulseAnim.value,
                                    height: sz * _pulseAnim.value,
                                    decoration: BoxDecoration(
                                      color: color.withOpacity(
                                        (onRoute ? 0.4 : 0.2) *
                                            (1.3 - _pulseAnim.value),
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  child!,
                                ],
                              ),
                              child: Container(
                                width: onRoute ? 44 : 36,
                                height: onRoute ? 44 : 36,
                                decoration: BoxDecoration(
                                  color: color,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: onRoute ? 3 : 2.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: color.withOpacity(0.6),
                                      blurRadius: onRoute ? 18 : 8,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  onRoute
                                      ? Icons.warning_amber_rounded
                                      : Icons.warning_rounded,
                                  color: Colors.white,
                                  size: onRoute ? 22 : 18,
                                ),
                              ),
                            ),
                          ),
                        );
                      })
                      .whereType<Marker>()
                      .toList(),
                ),

              // Police markers
              if (_showPolice)
                MarkerLayer(
                  markers: policeProvider.activeAlerts
                      .map((p) {
                        final coords = LatLng(p.lat, p.lng);
                        return Marker(
                          point: coords,
                          width: 44,
                          height: 44,
                          child: GestureDetector(
                            onTap: () => _showSimpleDetail(
                              p.title,
                              p.description,
                              AppTheme.infoBlue,
                              Icons.local_police_rounded,
                            ),
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: AppTheme.infoBlue,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.infoBlue.withOpacity(0.5),
                                    blurRadius: 10,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.local_police_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        );
                      })
                      .whereType<Marker>()
                      .toList(),
                ),
            ],
          ),

          // ─── Bottom: route alerts banner or filter bar ───
          Positioned(
            bottom: 130,
            left: 12,
            right: 12,
            child: _isNavigating
                ? const SizedBox.shrink() // Navigation overlay will be shown instead
                : (routeProvider.routeAlerts.isNotEmpty
                      ? _RouteAlertsBanner(
                          alerts: routeProvider.routeAlerts,
                          onViewAlternates: _showAlternateRoutes,
                        )
                      : _FilterBar(
                          showAlerts: _showAlerts,
                          showPolice: _showPolice,
                          onToggleAlerts: () =>
                              setState(() => _showAlerts = !_showAlerts),
                          onTogglePolice: () =>
                              setState(() => _showPolice = !_showPolice),
                        )),
          ),

          // Legend
          if (!_isNavigating)
            const Positioned(top: 120, right: 14, child: _LegendCard()),

          // Re-center button
          Positioned(
            right: 16,
            bottom: _isNavigating ? 140 : 220,
            child: FloatingActionButton(
              onPressed: () {
                if (routeProvider.currentLocation != null) {
                  _mapCtrl.move(routeProvider.currentLocation!, 15);
                } else {
                  _mapCtrl.move(_islamabad, 12.5);
                }
              },
              backgroundColor: Colors.white,
              foregroundColor: AppTheme.infoBlue,
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.my_location_rounded),
            ),
          ),

          // Navigation Overlay
          if (_isNavigating) ...[
            // Current Step Indicator at Top
            Positioned(
              top: MediaQuery.of(context).padding.top + 70,
              left: 12,
              right: 12,
              child: _StepIndicator(routeProvider: routeProvider),
            ),

            Positioned(
              left: 0,
              right: 0,
              bottom: 120,
              child: _NavigationOverlay(
                routeProvider: routeProvider,
                onStop: () {
                  setState(() => _isNavigating = false);
                  _voice.stop();
                },
                onReroute: () => routeProvider.reroute(),
              ),
            ),
          ],

          // ─── Navigation search panel (isolated StatefulWidget) ───
          _NavPanel(
            voice: _voice,
            mapController: _mapCtrl,
            onRouteFound: _onRouteFound,
            onShowAlternates: _showAlternateRoutes,
            onShowLanguagePicker: _showLanguagePicker,
            onReCenter: () => _mapCtrl.move(_islamabad, 12.5),
            onNavigationToggle: (v) => setState(() => _isNavigating = v),
            onToggleNotifications: () {
              final rp = context.read<RouteProvider>();
              rp.toggleNotifications();
              NotificationService().setEnabled(rp.notificationsEnabled);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    rp.notificationsEnabled
                        ? '🔔 Alerts turned ON'
                        : '🔕 Alerts turned OFF',
                  ),
                  backgroundColor: rp.notificationsEnabled
                      ? AppTheme.successGreen
                      : Colors.grey.shade700,
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 2),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  margin: const EdgeInsets.all(16),
                ),
              );
            },
          ),

          // ─── Voice Alert Overlay (Premium Glassmorphism) ───
          ValueListenableBuilder<String?>(
            valueListenable: _voice.currentSpeakingText,
            builder: (context, text, child) {
              if (text == null) return const SizedBox.shrink();
              return Positioned(
                top: MediaQuery.of(context).padding.top + 80,
                left: 16,
                right: 16,
                child: _VoiceAlertOverlay(text: text),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  _NavigationOverlay — simple UI for navigation mode
// ═══════════════════════════════════════════════════════════

class _NavigationOverlay extends StatelessWidget {
  final RouteProvider routeProvider;
  final VoidCallback onStop;
  final VoidCallback onReroute;

  const _NavigationOverlay({
    required this.routeProvider,
    required this.onStop,
    required this.onReroute,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 20,
            offset: Offset(0, -5),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.successGreen.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.navigation_rounded,
                  color: AppTheme.successGreen,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      routeProvider.to?.shortName ?? 'Destination',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textDark,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Row(
                      children: [
                        Text(
                          '${routeProvider.durationMins} min',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.successGreen,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${routeProvider.distanceKm.toStringAsFixed(1)} km',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.textGrey,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  RaastButton(
                    height: 44,
                    radius: 12,
                    colors: const [Color(0xFFE53935), Color(0xFFC62828)],
                    onPressed: onStop,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: const Text(
                      'Exit',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  RaastButton(
                    height: 40,
                    radius: 12,
                    colors: const [AppTheme.infoBlue, Color(0xFF1565C0)],
                    onPressed: onReroute,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.refresh_rounded, color: Colors.white, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'Reroute',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (routeProvider.routeAlerts.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.criticalRed.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.criticalRed.withOpacity(0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.warning_rounded,
                    color: AppTheme.criticalRed,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '${routeProvider.routeAlerts.length} blockages ahead! Tap to re-route.',
                      style: const TextStyle(
                        color: AppTheme.criticalRed,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  final RouteProvider routeProvider;
  const _StepIndicator({required this.routeProvider});

  @override
  Widget build(BuildContext context) {
    final step = routeProvider.currentStep;
    if (step == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF006E26),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          _StepIcon(type: step.maneuverType),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  step.instruction,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (step.distance > 0)
                  Text(
                    step.distance < 1000
                        ? "${step.distance.round()} m"
                        : "${(step.distance / 1000).toStringAsFixed(1)} km",
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StepIcon extends StatelessWidget {
  final String type;
  const _StepIcon({required this.type});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    switch (type) {
      case 'turn':
        icon = Icons.turn_right_rounded;
        break;
      case 'merge':
        icon = Icons.merge_rounded;
        break;
      case 'ramp':
        icon = Icons.ramp_right_rounded;
        break;
      case 'fork':
        icon = Icons.alt_route_rounded;
        break;
      case 'roundabout':
        icon = Icons.roundabout_right_rounded;
        break;
      default:
        icon = Icons.navigation_rounded;
    }

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: Colors.white, size: 28),
    );
  }
}

// ═══════════════════════════════════════════════════════════
//  _NavPanel — isolated StatefulWidget, owns all search state
//  Typing here never triggers MapScreen.setState
// ═══════════════════════════════════════════════════════════

class _NavPanel extends StatefulWidget {
  final VoiceService voice;
  final MapController mapController;
  final ValueChanged<RouteProvider> onRouteFound;
  final VoidCallback onShowAlternates;
  final VoidCallback onShowLanguagePicker;
  final VoidCallback onReCenter;
  final VoidCallback onToggleNotifications;
  final ValueChanged<bool> onNavigationToggle;

  const _NavPanel({
    required this.voice,
    required this.mapController,
    required this.onRouteFound,
    required this.onShowAlternates,
    required this.onShowLanguagePicker,
    required this.onReCenter,
    required this.onToggleNotifications,
    required this.onNavigationToggle,
  });

  @override
  State<_NavPanel> createState() => _NavPanelState();
}

class _NavPanelState extends State<_NavPanel>
    with SingleTickerProviderStateMixin {
  bool _expanded = false;
  String _activeField = 'to'; // track which field is active

  final _fromCtrl = TextEditingController();
  final _toCtrl = TextEditingController();

  // Persistent FocusNodes prevent the keyboard from dismissing on rebuilds
  final _fromFocus = FocusNode();
  final _toFocus = FocusNode();

  // ValueNotifiers for clear-button visibility — no setState on every keystroke
  late final ValueNotifier<bool> _fromHasText = ValueNotifier(false);
  late final ValueNotifier<bool> _toHasText = ValueNotifier(false);

  Timer? _debounce;

  late AnimationController _animCtrl;
  late Animation<double> _anim;

  late RouteProvider _routeProvider;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _anim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic);

    _fromCtrl.addListener(() => _fromHasText.value = _fromCtrl.text.isNotEmpty);
    _toCtrl.addListener(() => _toHasText.value = _toCtrl.text.isNotEmpty);

    _fromFocus.addListener(() {
      if (_fromFocus.hasFocus) setState(() => _activeField = 'from');
    });
    _toFocus.addListener(() {
      if (_toFocus.hasFocus) setState(() => _activeField = 'to');
    });

    // Sync controllers with provider
    _routeProvider = context.read<RouteProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        if (_routeProvider.from != null)
          _fromCtrl.text = _routeProvider.from!.shortName;
        if (_routeProvider.to != null)
          _toCtrl.text = _routeProvider.to!.shortName;

        _routeProvider.addListener(_syncControllers);
      }
    });
  }

  void _syncControllers() {
    if (!mounted) return;
    final rp = context.read<RouteProvider>();
    if (rp.from != null &&
        _fromCtrl.text != rp.from!.shortName &&
        !_fromFocus.hasFocus) {
      _fromCtrl.text = rp.from!.shortName;
    }
    if (rp.to != null &&
        _toCtrl.text != rp.to!.shortName &&
        !_toFocus.hasFocus) {
      _toCtrl.text = rp.to!.shortName;
    }
  }

  @override
  void dispose() {
    _routeProvider.removeListener(_syncControllers);
    _animCtrl.dispose();
    _fromCtrl.dispose();
    _toCtrl.dispose();
    _fromFocus.dispose();
    _toFocus.dispose();
    _fromHasText.dispose();
    _toHasText.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _open() {
    setState(() => _expanded = true);
    _animCtrl.forward();
    // Auto-focus the 'to' field when panel opens
    Future.delayed(const Duration(milliseconds: 350), () {
      if (mounted) _toFocus.requestFocus();
    });
  }

  void _close() {
    FocusScope.of(context).unfocus();
    setState(() => _expanded = false);
    _animCtrl.reverse();
    _routeProvider.clearAll();
    _routeProvider.clearSuggestions();
    _fromCtrl.clear();
    _toCtrl.clear();
    _fromHasText.value = false;
    _toHasText.value = false;
  }

  // Called on every keystroke — does NOT call setState
  void _onChanged(String value) {
    _debounce?.cancel();
    final q = value.trim();
    if (q.length >= 3) {
      _debounce = Timer(const Duration(milliseconds: 500), () {
        if (mounted) _routeProvider.searchSuggestions(q);
      });
    } else {
      if (mounted) _routeProvider.clearSuggestions();
    }
  }

  void _pickSuggestion(GeocodeSuggestion s) {
    FocusScope.of(context).unfocus();
    final rp = _routeProvider;
    if (_activeField == 'from') {
      _fromCtrl.text = s.shortName;
      rp.setFrom(s);
    } else {
      _toCtrl.text = s.shortName;
      rp.setTo(s);
    }
    rp.clearSuggestions();

    // After route computes, notify parent map (OSRM can take 2-4 s)
    final provider = _routeProvider; // Capture provider
    Future.delayed(const Duration(milliseconds: 4000), () {
      if (!mounted) return;
      if (provider.status == RouteStatus.found) widget.onRouteFound(provider);
    });
  }

  @override
  Widget build(BuildContext context) {
    // Top safe-area padding — works on real devices AND web (viewport-fit=cover)
    final topPad = MediaQuery.of(context).viewPadding.top;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.black.withOpacity(0.6), Colors.transparent],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Status-bar spacer (safe area)
            SizedBox(height: topPad + 8),

            // ── Top icon row ──
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 0),
              child: Row(
                children: [
                  Expanded(
                    child: _expanded
                        ? const SizedBox.shrink()
                        : GestureDetector(
                            onTap: _open,
                            child: Container(
                              height: 50,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.14),
                                    blurRadius: 14,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.search_rounded,
                                    color: AppTheme.textGrey,
                                    size: 22,
                                  ),
                                  SizedBox(width: 10),
                                  Flexible(
                                    child: Text(
                                      'Where do you want to go?',
                                      style: TextStyle(
                                        color: AppTheme.textGrey,
                                        fontSize: 15,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                      maxLines: 1,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                  ),
                  const SizedBox(width: 8),
                  _IconBtn(
                    icon: Icons.record_voice_over_rounded,
                    color: AppTheme.infoBlue,
                    bg: Colors.white,
                    badge: widget.voice.currentLanguage.toUpperCase(),
                    onTap: widget.onShowLanguagePicker,
                  ),
                  const SizedBox(width: 8),
                  Consumer<RouteProvider>(
                    builder: (_, rp2, __) => _IconBtn(
                      icon: rp2.notificationsEnabled
                          ? Icons.notifications_active_rounded
                          : Icons.notifications_off_rounded,
                      color: rp2.notificationsEnabled
                          ? AppTheme.primaryRed
                          : Colors.grey,
                      bg: Colors.white,
                      onTap: widget.onToggleNotifications,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _IconBtn(
                    icon: Icons.my_location_rounded,
                    color: AppTheme.primaryRed,
                    bg: Colors.white,
                    onTap: widget.onReCenter,
                  ),
                ],
              ),
            ),

            // ── Expandable search panel ──
            SizeTransition(
              sizeFactor: _anim,
              child: FadeTransition(
                opacity: _anim,
                child: Container(
                  margin: const EdgeInsets.fromLTRB(14, 10, 14, 0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.14),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Padding(
                            padding: EdgeInsets.fromLTRB(20, 16, 0, 8),
                            child: Row(
                              children: [
                                Text(
                                  'Route Planner',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.textDark,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(0, 8, 8, 0),
                            child: IconButton(
                              icon: const Icon(
                                Icons.close_rounded,
                                color: AppTheme.textGrey,
                              ),
                              onPressed: _close,
                            ),
                          ),
                        ],
                      ),
                      // Inputs Layout
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Visual connection (Dot, Line, Pin)
                              Padding(
                                padding: const EdgeInsets.only(
                                  right: 14,
                                  top: 16,
                                  bottom: 16,
                                ),
                                child: Column(
                                  children: [
                                    Container(
                                      width: 12,
                                      height: 12,
                                      decoration: BoxDecoration(
                                        color: Colors.transparent,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: AppTheme.successGreen,
                                          width: 3,
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: CustomPaint(
                                        painter: _DashedLinePainter(),
                                        size: const Size(12, double.infinity),
                                      ),
                                    ),
                                    const Icon(
                                      Icons.location_on_rounded,
                                      color: AppTheme.primaryRed,
                                      size: 16,
                                    ),
                                  ],
                                ),
                              ),
                              // Input fields
                              Expanded(
                                child: Column(
                                  children: [
                                    _NavFieldBox(
                                      controller: _fromCtrl,
                                      focusNode: _fromFocus,
                                      hasTextNotifier: _fromHasText,
                                      label: 'Starting from',
                                      hint: 'Your location',
                                      isActive: _activeField == 'from',
                                      onTap: () =>
                                          setState(() => _activeField = 'from'),
                                      onChanged: _onChanged,
                                      onClear: () {
                                        _fromCtrl.clear();
                                        context.read<RouteProvider>()
                                          ..clearFrom()
                                          ..clearSuggestions();
                                        _fromFocus.requestFocus();
                                      },
                                      onMyLocation: () {
                                        final rp = context.read<RouteProvider>();
                                        rp.useCurrentLocationAsStart();
                                        _fromCtrl.text = rp.from?.shortName ?? 'My Location';
                                        _fromFocus.unfocus();
                                      },
                                    ),
                                    _NavFieldBox(
                                      controller: _toCtrl,
                                      focusNode: _toFocus,
                                      hasTextNotifier: _toHasText,
                                      label: 'Destination',
                                      hint: 'Where to?',
                                      isActive: _activeField == 'to',
                                      onTap: () =>
                                          setState(() => _activeField = 'to'),
                                      onChanged: _onChanged,
                                      onClear: () {
                                        _toCtrl.clear();
                                        context.read<RouteProvider>()
                                          ..clearTo()
                                          ..clearSuggestions();
                                        _toFocus.requestFocus();
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // ── Suggestions — only this Consumer rebuilds on search results ──
                      Consumer<RouteProvider>(
                        builder: (_, rp, __) {
                          if (!_expanded || rp.suggestions.isEmpty) {
                            return const SizedBox.shrink();
                          }
                          final isFrom = _activeField == 'from';
                          final col = isFrom
                              ? AppTheme.successGreen
                              : AppTheme.primaryRed;
                          return Container(
                            margin: const EdgeInsets.fromLTRB(14, 4, 14, 0),
                            constraints: const BoxConstraints(maxHeight: 220),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.12),
                                  blurRadius: 16,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: ListView.separated(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 4,
                                ),
                                shrinkWrap: true,
                                itemCount: rp.suggestions.length,
                                separatorBuilder: (_, __) =>
                                    const Divider(height: 1, indent: 54),
                                itemBuilder: (_, i) {
                                  final s = rp.suggestions[i];
                                  return ListTile(
                                    leading: Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: col.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        Icons.location_on_rounded,
                                        size: 18,
                                        color: col,
                                      ),
                                    ),
                                    title: Text(
                                      s.shortName,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.textDark,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    subtitle: Text(
                                      s.displayName,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.textGrey,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    onTap: () => _pickSuggestion(s),
                                    dense: true,
                                  );
                                },
                              ),
                            ),
                          );
                        },
                      ),
                      // Route Summaries and Action Button
                      Consumer<RouteProvider>(
                        builder: (_, rp, __) {
                          if (rp.status == RouteStatus.loadingRoute) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 24),
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: AppTheme.primaryRed,
                                ),
                              ),
                            );
                          } else if (rp.status == RouteStatus.found) {
                            return Padding(
                              padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                              child: Column(
                                children: [
                                  // Route Card
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF006E26),
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(
                                            0xFF006E26,
                                          ).withOpacity(0.2),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              rp.recommendedIsAlternative
                                                  ? 'Safer Alternative'
                                                  : 'Optimal Route',
                                              style: const TextStyle(
                                                color: Colors.white70,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const Icon(
                                              Icons.navigation_rounded,
                                              color: Colors.white,
                                              size: 20,
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.baseline,
                                          textBaseline: TextBaseline.alphabetic,
                                          children: [
                                            Text(
                                              '${rp.durationMins}',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 32,
                                                fontWeight: FontWeight.w900,
                                              ),
                                            ),
                                            const SizedBox(width: 4),
                                            const Text(
                                              'min',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontSize: 16,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${rp.distanceKm.toStringAsFixed(1)} km · ${rp.routeAlerts.isNotEmpty ? "${rp.routeAlerts.length} Alerts" : "Clear route"}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  // Action Button
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(
                                          0xFF006E26,
                                        ),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 16,
                                        ),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(
                                            16,
                                          ),
                                        ),
                                        elevation: 0,
                                      ),
                                      onPressed: () {
                                        // Collapse panel but KEEP route data so polylines remain on map
                                        FocusScope.of(context).unfocus();
                                        setState(() => _expanded = false);
                                        _animCtrl.reverse();
                                        widget.onNavigationToggle(true);

                                        // Move camera to actual route start, not GPS dot
                                        if (rp.routeOrigin != null) {
                                          Future.delayed(
                                            const Duration(milliseconds: 300),
                                            () {
                                              widget.mapController.move(
                                                rp.routeOrigin!,
                                                15.5,
                                              );
                                            },
                                          );
                                        }
                                      },
                                      child: const Text(
                                        'Start navigation',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  if (rp.betweenEndpointsAlert != null)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Text(
                                        rp.betweenEndpointsAlert!,
                                        style: const TextStyle(
                                          color: Color(0xFFB45309),
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                  if (rp.textSuggestions.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Text(
                                        rp.textSuggestions.take(3).join(' · '),
                                        style: const TextStyle(
                                          color: AppTheme.textMed,
                                          fontSize: 11,
                                          height: 1.4,
                                        ),
                                      ),
                                    ),
                                  Text(
                                    'Engine: ${rp.routingBackend == 'openrouteservice' ? 'OpenRouteService (avoid blockages)' : 'OSRM (best-effort)'}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppTheme.textGrey,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            );
                          } else if (rp.status == RouteStatus.idle ||
                              rp.status == RouteStatus.error) {
                            final canPlan = rp.from != null && rp.to != null;
                            return Padding(
                              padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (rp.error != null)
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 12,
                                      ),
                                      child: Text(
                                        rp.error!,
                                        style: const TextStyle(
                                          color: AppTheme.criticalRed,
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF006E26),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 16,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      elevation: 0,
                                      disabledBackgroundColor: const Color(
                                        0xFFE0E0E0,
                                      ),
                                      disabledForegroundColor: const Color(
                                        0xFFA0A0A0,
                                      ),
                                    ),
                                    onPressed: canPlan
                                        ? () {
                                            FocusScope.of(context).unfocus();
                                            rp.planSafeRoute();
                                          }
                                        : null,
                                    child: const Text(
                                      'Plan safe route',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }
}

// ─── Refactored Nav Field Box (Matches RN RoutePlannerCard) ───
class _NavFieldBox extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueNotifier<bool> hasTextNotifier;
  final String label, hint;
  final bool isActive;
  final VoidCallback onTap, onClear;
  final VoidCallback? onMyLocation; // NEW
  final ValueChanged<String> onChanged;

  const _NavFieldBox({
    required this.controller,
    required this.focusNode,
    required this.hasTextNotifier,
    required this.label,
    required this.hint,
    required this.isActive,
    required this.onTap,
    required this.onClear,
    required this.onChanged,
    this.onMyLocation, // NEW
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F3F8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textGrey,
                  ),
                ),
                const SizedBox(height: 2),
                TextField(
                  controller: controller,
                  focusNode: focusNode,
                  onTap: onTap,
                  onChanged: onChanged,
                  textInputAction: TextInputAction.search,
                  style: const TextStyle(
                    fontSize: 15,
                    color: AppTheme.textDark,
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    hintText: hint,
                    hintStyle: const TextStyle(
                      color: Color(0xFFA1A1AA),
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ),
          // Action button — only rebuilds this tiny part via ValueListenableBuilder
          ValueListenableBuilder<bool>(
            valueListenable: hasTextNotifier,
            builder: (_, has, __) {
              if (has) {
                return GestureDetector(
                  onTap: onClear,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.06),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      size: 14,
                      color: AppTheme.textDark,
                    ),
                  ),
                );
              }
              if (onMyLocation != null) {
                return GestureDetector(
                  onTap: onMyLocation,
                  child: const Icon(
                    Icons.my_location_rounded,
                    size: 18,
                    color: AppTheme.infoBlue,
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
    );
  }
}

// ─── Route option card ───
class _RouteOptionCard extends StatelessWidget {
  final RouteAlternative alt;
  final bool isSelected;
  final VoidCallback onTap;
  const _RouteOptionCard({
    required this.alt,
    required this.isSelected,
    required this.onTap,
  });

  static const _colors = {
    RouteType.fastest: Color(0xFF1565C0),
    RouteType.cleanest: Color(0xFF2E7D32),
    RouteType.avoidBlockages: Color(0xFFE65100),
    RouteType.balanced: Color(0xFF4A148C),
  };
  static const _icons = {
    RouteType.fastest: Icons.flash_on_rounded,
    RouteType.cleanest: Icons.eco_rounded,
    RouteType.avoidBlockages: Icons.alt_route_rounded,
    RouteType.balanced: Icons.balance_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final color = _colors[alt.type] ?? AppTheme.infoBlue;
    final icon = _icons[alt.type] ?? Icons.route_rounded;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.06) : Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? color : const Color(0xFFEEEEEE),
            width: isSelected ? 2.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.2),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: isSelected ? color : const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                icon,
                color: isSelected ? Colors.white : color,
                size: 26,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        alt.label,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: isSelected ? color : AppTheme.textDark,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'ACTIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    alt.extraInfo,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textGrey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _Chip(
                          Icons.route_rounded,
                          '${alt.distanceKm.toStringAsFixed(1)} km',
                          AppTheme.infoBlue,
                        ),
                        const SizedBox(width: 8),
                        _Chip(
                          Icons.access_time_rounded,
                          '${alt.durationMins} min',
                          AppTheme.successGreen,
                        ),
                        const SizedBox(width: 8),
                        _Chip(
                          alt.alertCount == 0
                              ? Icons.check_circle_rounded
                              : Icons.warning_rounded,
                          alt.alertCount == 0
                              ? 'Clear'
                              : '${alt.alertCount} alert${alt.alertCount > 1 ? 's' : ''}',
                          alt.alertCount == 0
                              ? AppTheme.successGreen
                              : AppTheme.criticalRed,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              isSelected
                  ? Icons.radio_button_checked_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: isSelected ? color : const Color(0xFFBDBDBD),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _Chip(this.icon, this.label, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.09),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );
}

// ─── Route alerts banner ───
class _RouteAlertsBanner extends StatelessWidget {
  final List<TrafficAlert> alerts;
  final VoidCallback onViewAlternates;
  const _RouteAlertsBanner({
    required this.alerts,
    required this.onViewAlternates,
  });

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(
        color: AppTheme.criticalRed.withOpacity(0.25),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: AppTheme.criticalRed.withOpacity(0.12),
          blurRadius: 20,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Row(
            children: [
              const LiveDot(color: AppTheme.criticalRed),
              const SizedBox(width: 8),
              Text(
                '${alerts.length} blockage${alerts.length > 1 ? 's' : ''} on route',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                  color: AppTheme.textDark,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: onViewAlternates,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.infoBlue,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.alt_route_rounded,
                        color: Colors.white,
                        size: 14,
                      ),
                      SizedBox(width: 5),
                      Text(
                        'Alternates',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        ...alerts
            .take(2)
            .map(
              (a) => Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppTheme.severityColor(a.severity),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        a.title,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textDark,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      a.area,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.textGrey,
                      ),
                    ),
                  ],
                ),
              ),
            ),
      ],
    ),
  );
}

// ─── Small helpers ───
class _PinMarker extends StatelessWidget {
  final Color color;
  final String label;
  const _PinMarker({required this.color, required this.label});
  @override
  Widget build(BuildContext context) => Container(
    width: 44,
    height: 44,
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
      border: Border.all(color: Colors.white, width: 3),
      boxShadow: [
        BoxShadow(
          color: color.withOpacity(0.5),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Center(
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w900,
          fontSize: 16,
        ),
      ),
    ),
  );
}

class _IconBtn extends StatelessWidget {
  final IconData icon;
  final Color color, bg;
  final VoidCallback onTap;
  final String? badge;
  const _IconBtn({
    required this.icon,
    required this.color,
    required this.bg,
    required this.onTap,
    this.badge,
  });
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 12),
        ],
      ),
      child: badge != null
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 18),
                Text(
                  badge!,
                  style: TextStyle(
                    color: color,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            )
          : Icon(icon, color: color, size: 22),
    ),
  );
}

class _FilterBar extends StatelessWidget {
  final bool showAlerts, showPolice;
  final VoidCallback onToggleAlerts, onTogglePolice;
  const _FilterBar({
    required this.showAlerts,
    required this.showPolice,
    required this.onToggleAlerts,
    required this.onTogglePolice,
  });

  Widget _chip(
    String label,
    bool selected,
    Color color,
    IconData icon,
    VoidCallback onTap,
  ) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: selected ? color : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: selected ? Colors.white : AppTheme.textGrey,
            size: 15,
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : AppTheme.textGrey,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.08),
          blurRadius: 20,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _chip(
          'Alerts',
          showAlerts,
          AppTheme.criticalRed,
          Icons.warning_rounded,
          onToggleAlerts,
        ),
        _chip(
          'Police',
          showPolice,
          AppTheme.infoBlue,
          Icons.local_police_rounded,
          onTogglePolice,
        ),
      ],
    ),
  );
}

class _LegendCard extends StatelessWidget {
  const _LegendCard();
  Widget _item(Color color, String label) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textMed),
        ),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12),
      ],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Legend',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 11,
            color: AppTheme.textDark,
          ),
        ),
        const SizedBox(height: 8),
        _item(AppTheme.criticalRed, 'On Route'),
        _item(AppTheme.highOrange, 'High Alert'),
        _item(AppTheme.infoBlue, 'Police/VIP'),
      ],
    ),
  );
}

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    double dashHeight = 4, dashSpace = 3, startY = 0;
    final paint = Paint()
      ..color = const Color(0xFFC0C9BE)
      ..strokeWidth = 1.5;
    while (startY < size.height) {
      canvas.drawLine(
        Offset(size.width / 2, startY),
        Offset(size.width / 2, startY + dashHeight),
        paint,
      );
      startY += dashHeight + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _VoiceAlertOverlay extends StatelessWidget {
  final String text;
  const _VoiceAlertOverlay({required this.text});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutBack,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 20 * (1 - value)),
          child: Opacity(
            opacity: value.clamp(0.0, 1.0),
            child: child,
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.12),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.85),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: Colors.white.withOpacity(0.5),
                  width: 1.5,
                ),
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withOpacity(0.9),
                    Colors.white.withOpacity(0.7),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.infoBlue.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.campaign_rounded,
                      color: AppTheme.infoBlue,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'VOICE ALERT',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.infoBlue,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          text,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.textDark,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
