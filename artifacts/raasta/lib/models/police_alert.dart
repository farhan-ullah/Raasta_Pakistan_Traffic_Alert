enum PoliceAlertType { vipMovement, roadBlockage }

class PoliceAlert {
  final String id;
  final PoliceAlertType type;
  final String title;
  final String description;
  final String route;
  final String startPoint;
  final String endPoint;
  final List<String> affectedRoads;
  final List<String> alternateRoutes;
  final String severity;
  final String vipLevel;
  final bool isActive;
  final DateTime createdAt;
  final String createdBy;
  final DateTime? expectedClearTime;
  final double lat;
  final double lng;

  const PoliceAlert({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.route,
    required this.startPoint,
    required this.endPoint,
    required this.affectedRoads,
    required this.alternateRoutes,
    required this.severity,
    required this.vipLevel,
    required this.isActive,
    required this.createdAt,
    required this.createdBy,
    this.expectedClearTime,
    required this.lat,
    required this.lng,
  });

  String get typeLabel =>
      type == PoliceAlertType.vipMovement ? 'VIP Movement' : 'Road Blockage';

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  PoliceAlert copyWith({bool? isActive}) {
    return PoliceAlert(
      id: id,
      type: type,
      title: title,
      description: description,
      route: route,
      startPoint: startPoint,
      endPoint: endPoint,
      affectedRoads: affectedRoads,
      alternateRoutes: alternateRoutes,
      severity: severity,
      vipLevel: vipLevel,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt,
      createdBy: createdBy,
      expectedClearTime: expectedClearTime,
      lat: lat,
      lng: lng,
    );
  }

  static ({String start, String end, String route}) _routeFieldsFromJson(
    Map<String, dynamic> json,
  ) {
    final location = (json['location'] as String? ?? '').trim();
    final area = (json['area'] as String? ?? '').trim();
    final affected = (json['affectedRoads'] as List<dynamic>?)
            ?.map((e) => e.toString().trim())
            .where((s) => s.isNotEmpty)
            .toList() ??
        [];

    if (area.isNotEmpty) {
      return (
        start: location,
        end: area,
        route: affected.isNotEmpty ? affected.first : location,
      );
    }

    if (location.contains(' → ')) {
      final parts = location.split(' → ');
      return (
        start: parts.first.trim(),
        end: parts.sublist(1).join(' → ').trim(),
        route: location,
      );
    }

    return (
      start: location,
      end: '',
      route: affected.isNotEmpty ? affected.first : location,
    );
  }

  factory PoliceAlert.fromJson(Map<String, dynamic> json) {
    final routeFields = _routeFieldsFromJson(json);
    return PoliceAlert(
      id: json['id']?.toString() ?? '',
      type: json['type'] == 'vip_movement' ? PoliceAlertType.vipMovement : PoliceAlertType.roadBlockage,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      route: routeFields.route,
      startPoint: routeFields.start,
      endPoint: routeFields.end,
      affectedRoads: (json['affectedRoads'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      alternateRoutes: (json['alternateRoutes'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      severity: json['severity'] ?? 'High',
      vipLevel: 'N/A',
      isActive: json['status'] == 'active',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      createdBy: json['reportedBy'] ?? 'police',
      expectedClearTime: json['endTime'] != null ? DateTime.parse(json['endTime']) : null,
      lat: (json['lat'] as num?)?.toDouble() ?? 33.6844,
      lng: (json['lng'] as num?)?.toDouble() ?? 73.0479,
    );
  }

  Map<String, dynamic> toJson() {
    final roads = <String>[
      if (route.trim().isNotEmpty) route.trim(),
      ...affectedRoads.map((r) => r.trim()).where((r) => r.isNotEmpty && r != route.trim()),
    ];
    return {
      'title': title,
      'description': description,
      'type': type == PoliceAlertType.vipMovement ? 'vip_movement' : 'blockage',
      'location': startPoint.trim().isNotEmpty ? startPoint.trim() : route.trim(),
      if (endPoint.trim().isNotEmpty) 'area': endPoint.trim(),
      if (roads.isNotEmpty) 'affectedRoads': roads,
      'alternateRoutes': alternateRoutes,
      'severity': severity.toLowerCase(),
      'reportedBy': 'police',
      'vipLevel': vipLevel,
      'status': isActive ? 'active' : 'resolved',
      'lat': lat,
      'lng': lng,
    };
  }
}
