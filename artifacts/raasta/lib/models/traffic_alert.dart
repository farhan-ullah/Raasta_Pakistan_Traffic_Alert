class TrafficAlert {
  final String id;
  final String title;
  final String description;
  final String severity;
  final String city;
  final String location;
  final String area;
  final String type;
  final String status;
  final int upvotes;
  final int views;
  final DateTime createdAt;
  final String reportedBy;
  final bool isVerifiedByPolice;
  final String? reporterPhone;
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
    required this.status,
    this.upvotes = 0,
    this.views = 0,
    required this.createdAt,
    required this.reportedBy,
    this.isVerifiedByPolice = false,
    this.reporterPhone,
    required this.lat,
    required this.lng,
  });

  bool get isActive => status == 'active';
  bool get isPending => status == 'pending';
  bool get isPublished =>
      isActive && (reportedBy == 'police' || isVerifiedByPolice);

  String get updateCategory {
    switch (type) {
      case 'blockage':
        return 'Road Closure';
      case 'construction':
        return 'Road Projects';
      case 'accident':
        return 'Emergency';
      case 'vip_movement':
        return 'Event';
      case 'congestion':
        return 'Maintenance';
      default:
        return 'Maintenance';
    }
  }

  String get typeLabel {
    switch (type) {
      case 'blockage':
        return 'Road Blocked';
      case 'accident':
        return 'Accident';
      case 'construction':
        return 'Construction';
      case 'congestion':
        return 'Traffic Jam';
      case 'vip_movement':
        return 'VIP Movement';
      default:
        return title;
    }
  }

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
      status: json['status'] ?? 'active',
      upvotes: json['upvotes'] ?? 0,
      views: json['views'] ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      reportedBy: json['reportedBy'] ?? 'user',
      isVerifiedByPolice: json['isVerifiedByPolice'] == true,
      reporterPhone: json['reporterPhone'] as String?,
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
      if (area.isNotEmpty) 'area': area,
      'type': type == 'user_report' ? 'congestion' : type,
      'reportedBy': reportedBy,
      'lat': lat,
      'lng': lng,
      if (reporterPhone != null && reporterPhone!.isNotEmpty)
        'reporterPhone': reporterPhone,
    };
  }
}
