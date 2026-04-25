class CityAnnouncement {
  final String id;
  final String title;
  final String body;
  final String category;
  final String priority;
  final String city;
  final List<String> affectedAreas;
  final String department;
  final bool isPinned;
  final int views;
  final DateTime createdAt;
  final DateTime? validUntil;

  const CityAnnouncement({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.priority,
    required this.city,
    required this.affectedAreas,
    required this.department,
    required this.isPinned,
    required this.views,
    required this.createdAt,
    this.validUntil,
  });

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  factory CityAnnouncement.fromJson(Map<String, dynamic> json) {
    return CityAnnouncement(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      category: json['category'] ?? 'Holiday',
      priority: json['priority'] ?? 'Medium',
      city: json['city'] ?? 'Islamabad',
      affectedAreas: (json['affectedAreas'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      department: json['department'] ?? 'CDA',
      isPinned: json['isPinned'] ?? false,
      views: json['views'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      validUntil: json['validUntil'] != null ? DateTime.parse(json['validUntil']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'body': body,
      'category': category,
      'priority': priority,
      'city': city,
      'affectedAreas': affectedAreas,
      'department': department,
      'isPinned': isPinned,
    };
  }
}
