import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../models/traffic_alert.dart';

class GeocodeSuggestion {
  final String displayName;
  final String shortName;
  final LatLng coords;

  GeocodeSuggestion({
    required this.displayName,
    required this.shortName,
    required this.coords,
  });

  static String _shorten(String display) {
    final parts = display.split(', ');
    if (parts.length >= 2) return '${parts[0]}, ${parts[1]}';
    return display;
  }

  factory GeocodeSuggestion.fromJson(Map json) => GeocodeSuggestion(
    displayName: json['display_name'] as String,
    shortName: _shorten(json['display_name'] as String),
    coords: LatLng(double.parse(json['lat']), double.parse(json['lon'])),
  );
}

class RouteStep {
  final String instruction;
  final double distance;
  final double duration;
  final LatLng point;
  final String maneuverType;

  RouteStep({
    required this.instruction,
    required this.distance,
    required this.duration,
    required this.point,
    required this.maneuverType,
  });
}

enum RouteType { fastest, cleanest, avoidBlockages, balanced }

class RouteAlternative {
  final int index;
  final List<LatLng> points;
  final List<RouteStep> steps;
  final double distanceKm;
  final int durationMins;
  final List<TrafficAlert> alertsOnRoute;
  final RouteType type;

  RouteAlternative({
    required this.index,
    required this.points,
    required this.steps,
    required this.distanceKm,
    required this.durationMins,
    required this.alertsOnRoute,
    required this.type,
  });

  int get alertCount => alertsOnRoute.length;
  bool get isClean => alertCount == 0;

  String get label {
    switch (type) {
      case RouteType.fastest:
        return 'Fastest Route';
      case RouteType.cleanest:
        return 'Least Congested';
      case RouteType.avoidBlockages:
        return 'Avoid Blockages';
      case RouteType.balanced:
        return 'Balanced Route';
    }
  }

  String get description {
    if (alertCount == 0) return 'No blockages detected';
    if (alertCount == 1) return '1 blockage on route';
    return '$alertCount blockages on route';
  }

  String get extraInfo {
    switch (type) {
      case RouteType.fastest:
        return 'Shortest travel time';
      case RouteType.cleanest:
        return 'Smoothest traffic flow';
      case RouteType.avoidBlockages:
        return 'Avoids known blockages';
      case RouteType.balanced:
        return 'Good balance of time & traffic';
    }
  }
}

enum RouteStatus {
  idle,
  searchingFrom,
  searchingTo,
  loadingRoute,
  found,
  error,
}

class RouteProvider extends ChangeNotifier {
  RouteStatus _status = RouteStatus.idle;
  RouteStatus get status => _status;

  GeocodeSuggestion? _from;
  GeocodeSuggestion? _to;
  GeocodeSuggestion? get from => _from;
  GeocodeSuggestion? get to => _to;

  LatLng? _currentLocation;
  LatLng? get currentLocation => _currentLocation;

  void setCurrentLocation(LatLng loc) {
    _currentLocation = loc;
    if (_from == null) {
      _from = GeocodeSuggestion(
        displayName: 'Current Location',
        shortName: 'My Location',
        coords: loc,
      );
    }
    notifyListeners();
  }

  Future<void> updateCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      if (permission == LocationPermission.deniedForever) return;

      final pos = await Geolocator.getCurrentPosition();
      setCurrentLocation(LatLng(pos.latitude, pos.longitude));
    } catch (e) {
      debugPrint('❌ LOCATION ERROR: $e');
    }
  }

  void useCurrentLocationAsStart() {
    if (_currentLocation != null) {
      _from = GeocodeSuggestion(
        displayName: 'Current Location',
        shortName: 'My Location',
        coords: _currentLocation!,
      );
      notifyListeners();
      _tryGetRoute();
    }
  }

  List<RouteAlternative> _alternatives = [];
  List<RouteAlternative> get alternatives => _alternatives;

  int _selectedIndex = 0;
  int get selectedIndex => _selectedIndex;

  RouteAlternative? get selectedRoute =>
      _alternatives.isNotEmpty ? _alternatives[_selectedIndex] : null;

  List<LatLng> get routePoints => selectedRoute?.points ?? [];
  List<RouteStep> get routeSteps => selectedRoute?.steps ?? [];
  double get distanceKm => selectedRoute?.distanceKm ?? 0;
  int get durationMins => selectedRoute?.durationMins ?? 0;
  List<TrafficAlert> get routeAlerts => selectedRoute?.alertsOnRoute ?? [];

  int _currentStepIndex = 0;
  int get currentStepIndex => _currentStepIndex;

  RouteStep? get currentStep =>
      (selectedRoute != null && _currentStepIndex < selectedRoute!.steps.length)
      ? selectedRoute!.steps[_currentStepIndex]
      : null;

  RouteStep? get nextStep =>
      (selectedRoute != null &&
          _currentStepIndex + 1 < selectedRoute!.steps.length)
      ? selectedRoute!.steps[_currentStepIndex + 1]
      : null;

  void updateProgress(LatLng loc) {
    if (selectedRoute == null || selectedRoute!.steps.isEmpty) return;

    // Simple logic: if we are close to the NEXT step, increment index
    if (_currentStepIndex + 1 < selectedRoute!.steps.length) {
      final next = selectedRoute!.steps[_currentStepIndex + 1];
      if (_haversine(loc, next.point) < 0.05) {
        // 50 meters
        _currentStepIndex++;
        notifyListeners();
      }
    }
  }

  bool _notificationsEnabled = true;
  bool get notificationsEnabled => _notificationsEnabled;

  List<GeocodeSuggestion> _suggestions = [];
  List<GeocodeSuggestion> get suggestions => _suggestions;

  String? _error;
  String? get error => _error;

  void toggleNotifications() {
    _notificationsEnabled = !_notificationsEnabled;
    notifyListeners();
  }

  void clearSuggestions() {
    _suggestions = [];
    notifyListeners();
  }

  Future<void> searchSuggestions(String query) async {
    if (query.length < 3) {
      _suggestions = [];
      notifyListeners();
      return;
    }
    try {
      final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
        'q': query,
        'format': 'json',
        'limit': '6',
        'countrycodes': 'pk',
        'viewbox': '72.5,32.0,75.0,34.5',
        'bounded': '0',
      });
      debugPrint('🚀 GEOCODE REQ: $uri');
      final res = await http.get(
        uri,
        headers: {
          'User-Agent':
              'Raasta-Traffic-PK/2.0 (user_${DateTime.now().millisecondsSinceEpoch}@raasta.pk)',
        },
      );
      debugPrint('✅ GEOCODE RES [${res.statusCode}]');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as List;
        _suggestions = data
            .map((d) => GeocodeSuggestion.fromJson(d as Map))
            .toList();
      } else {
        _suggestions = [];
      }
    } catch (e) {
      debugPrint('❌ GEOCODE ERROR: $e');
      _suggestions = [];
    }
    notifyListeners();
  }

  void setFrom(GeocodeSuggestion s) {
    _from = s;
    _suggestions = [];
    notifyListeners();
    _tryGetRoute();
  }

  void setTo(GeocodeSuggestion s) {
    _to = s;
    _suggestions = [];
    notifyListeners();
    _tryGetRoute();
  }

  void clearFrom() {
    _from = null;
    _clearRoute();
    notifyListeners();
  }

  void clearTo() {
    _to = null;
    _clearRoute();
    notifyListeners();
  }

  void clearAll() {
    _from = null;
    _to = null;
    _clearRoute();
    notifyListeners();
  }

  void _clearRoute() {
    _alternatives = [];
    _selectedIndex = 0;
    _status = RouteStatus.idle;
  }

  /// Select one of the alternative routes
  void selectAlternative(int index) {
    if (index < 0 || index >= _alternatives.length) return;
    _selectedIndex = index;
    notifyListeners();
  }

  Future<void> _tryGetRoute() async {
    if (_from == null || _to == null) return;
    _status = RouteStatus.loadingRoute;
    _alternatives = [];
    _selectedIndex = 0;
    _error = null;
    notifyListeners();

    try {
      final from = _from!.coords;
      final to = _to!.coords;
      final url =
          'http://router.project-osrm.org/route/v1/driving/'
          '${from.longitude},${from.latitude};${to.longitude},${to.latitude}'
          '?geometries=geojson&overview=full&alternatives=true&steps=true';

      debugPrint('🚀 ROUTING REQ: $url');
      final res = await http
          .get(Uri.parse(url), headers: {'User-Agent': 'Raasta-Traffic-PK/1.0'})
          .timeout(const Duration(seconds: 12));
      debugPrint('✅ ROUTING RES [${res.statusCode}]');

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['code'] == 'Ok' && (data['routes'] as List).isNotEmpty) {
          final rawRoutes = data['routes'] as List;
          final parsed = <_RawRoute>[];
          for (final r in rawRoutes) {
            final coords = (r['geometry']['coordinates'] as List).map((c) {
              final lst = c as List;
              return LatLng(
                (lst[1] as num).toDouble(),
                (lst[0] as num).toDouble(),
              );
            }).toList();
            final steps = <RouteStep>[];
            final legs = r['legs'] as List;
            for (final leg in legs) {
              final rawSteps = leg['steps'] as List;
              for (final s in rawSteps) {
                final maneuver = s['maneuver'];
                final location = maneuver['location'] as List;
                steps.add(
                  RouteStep(
                    instruction: (maneuver['instruction'] ?? '').toString(),
                    distance: (s['distance'] as num).toDouble(),
                    duration: (s['duration'] as num).toDouble(),
                    point: LatLng(
                      (location[1] as num).toDouble(),
                      (location[0] as num).toDouble(),
                    ),
                    maneuverType: (maneuver['type'] ?? 'move').toString(),
                  ),
                );
              }
            }

            parsed.add(
              _RawRoute(
                points: coords,
                steps: steps,
                distanceKm: ((r['distance'] as num) / 1000),
                durationMins: ((r['duration'] as num) / 60).round(),
              ),
            );
          }

          // Sort raw routes: fastest first by duration
          parsed.sort((a, b) => a.durationMins.compareTo(b.durationMins));

          // Assign route types
          final types = [
            RouteType.fastest,
            RouteType.cleanest,
            RouteType.avoidBlockages,
            RouteType.balanced,
          ];
          _alternatives = List.generate(
            parsed.length,
            (i) => RouteAlternative(
              index: i,
              points: parsed[i].points,
              steps: parsed[i].steps,
              distanceKm: parsed[i].distanceKm,
              durationMins: parsed[i].durationMins,
              alertsOnRoute: [], // will be set by checkAlertsOnRoute
              type: types[i % types.length],
            ),
          );

          _status = RouteStatus.found;
          _needsInitialAlertCheck = true;
          notifyListeners();
          return;
        }
      }
    } catch (e) {
      debugPrint('❌ ROUTING ERROR: $e');
    }

    // Fallback: straight line only if OSRM fails completely
    final from = _from!.coords;
    final to = _to!.coords;
    final baseDist = _haversine(from, to);
    _alternatives = [
      RouteAlternative(
        index: 0,
        points: [from, to],
        steps: [],
        distanceKm: baseDist,
        durationMins: (baseDist / 30 * 60).round(),
        alertsOnRoute: [],
        type: RouteType.fastest,
      ),
    ];
    _status = RouteStatus.found;
    _needsInitialAlertCheck = true;
    notifyListeners();
  }

  bool _needsInitialAlertCheck = false;

  /// Check alerts on ALL alternatives, update them, and return new on-route alerts for the selected route.
  List<TrafficAlert> checkAlertsOnAllRoutes(List<TrafficAlert> allAlerts) {
    if (_alternatives.isEmpty) return [];
    
    // 200m threshold is more accurate for city streets to determine if a blockage is truly on the path.
    const thresholdKm = 0.2;

    // 1. Calculate alerts for each alternative
    final updatedAlts = <RouteAlternative>[];
    for (var alt in _alternatives) {
      final onRoute = <TrafficAlert>[];
      for (final alert in allAlerts) {
        final coords = LatLng(alert.lat, alert.lng);
        for (final pt in alt.points) {
          if (_haversine(pt, coords) <= thresholdKm) {
            onRoute.add(alert);
            break;
          }
        }
      }
      updatedAlts.add(RouteAlternative(
        index: alt.index,
        points: alt.points,
        steps: alt.steps,
        distanceKm: alt.distanceKm,
        durationMins: alt.durationMins,
        alertsOnRoute: onRoute,
        type: alt.type,
      ));
    }

    // 2. Sort alternatives: Safety First
    // Primary sort: fewest alerts (least blockages)
    // Secondary sort: shortest duration
    updatedAlts.sort((a, b) {
      if (a.alertCount != b.alertCount) {
        return a.alertCount.compareTo(b.alertCount);
      }
      return a.durationMins.compareTo(b.durationMins);
    });

    // 3. Re-assign types and indices based on the new sorted order
    _alternatives = List.generate(updatedAlts.length, (i) {
      final alt = updatedAlts[i];
      
      // Determine the label based on its new position/properties
      RouteType type = RouteType.balanced;
      if (i == 0) {
        type = alt.alertCount == 0 ? RouteType.avoidBlockages : RouteType.fastest;
      } else {
        // If it's not the first (best) route, check if it's the absolute fastest
        bool isAbsoluteFastest = true;
        for (var other in updatedAlts) {
          if (other.durationMins < alt.durationMins) {
            isAbsoluteFastest = false;
            break;
          }
        }
        if (isAbsoluteFastest) type = RouteType.fastest;
      }

      return RouteAlternative(
        index: i, // New stable index
        points: alt.points,
        steps: alt.steps,
        distanceKm: alt.distanceKm,
        durationMins: alt.durationMins,
        alertsOnRoute: alt.alertsOnRoute,
        type: type,
      );
    });

    // 4. Auto-select the safest route (Index 0) on initial search
    if (_needsInitialAlertCheck) {
      _needsInitialAlertCheck = false;
      _selectedIndex = 0; // Index 0 is now guaranteed to be the safest/best route
      debugPrint('🛡️ Safety First: Automatically selected and prioritized the cleanest route.');
    }

    notifyListeners();
    return _alternatives[_selectedIndex].alertsOnRoute;
  }

  static double _haversine(LatLng a, LatLng b) {
    const r = 6371.0;
    final dLat = _toRad(b.latitude - a.latitude);
    final dLon = _toRad(b.longitude - a.longitude);
    final h =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRad(a.latitude)) *
            math.cos(_toRad(b.latitude)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    return r * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h));
  }

  static double _toRad(double deg) => deg * math.pi / 180;
}

class _RawRoute {
  final List<LatLng> points;
  final List<RouteStep> steps;
  final double distanceKm;
  final int durationMins;
  _RawRoute({
    required this.points,
    required this.steps,
    required this.distanceKm,
    required this.durationMins,
  });
}
