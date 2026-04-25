class TrafficAlert {
  final String id;
  final String title;
  final String description;
  final String severity;
  final String city;
  final String location;
  final String area;
  final String type;
  final int upvotes;
  final int views;
  final bool isActive;
  final DateTime createdAt;
  final String reportedBy;
  final double lat;
  final double lng;

  const TrafficAlert({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.city,
    required this.location,
    required this.area,
    required this.type,
    this.upvotes = 0,
    this.views = 0,
    this.isActive = true,
    required this.createdAt,
    required this.reportedBy,
    required this.lat,
    required this.lng,
  });

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  factory TrafficAlert.fromJson(Map<String, dynamic> json) {
    return TrafficAlert(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      severity: json['severity'] ?? 'low',
      city: json['city'] ?? 'Islamabad',
      location: json['location'] ?? '',
      area: json['area'] ?? '',
      type: json['type'] ?? 'other',
      upvotes: json['upvotes'] ?? 0,
      views: json['views'] ?? 0,
      isActive: json['status'] == 'active',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      reportedBy: json['reportedBy'] ?? 'user',
      lat: (json['lat'] as num?)?.toDouble() ?? 33.6844,
      lng: (json['lng'] as num?)?.toDouble() ?? 73.0479,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'severity': severity.toLowerCase(),
      'city': city,
      'location': location,
      'area': area,
      'type': type == 'user_report' ? 'congestion' : type,
      'reportedBy': reportedBy,
      'lat': lat,
      'lng': lng,
    };
  }
}
