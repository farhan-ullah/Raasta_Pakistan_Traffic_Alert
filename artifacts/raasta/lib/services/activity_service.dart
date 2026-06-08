import 'package:flutter/foundation.dart';
import 'api_service.dart';

class ActivityService {
  static Future<ActivityStats> fetchStats({
    required String userId,
    String? phone,
  }) async {
    final params = <String, String>{'userId': userId};
    if (phone != null && phone.isNotEmpty && phone != '0000') {
      params['phone'] = phone;
    }
    final query = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');

    final res = await ApiService.get('/users/me/activity-stats?$query');
    if (res is! Map) {
      return const ActivityStats();
    }
    return ActivityStats(
      alertsRead: (res['alertsRead'] as num?)?.toInt() ?? 0,
      reportsSubmitted: (res['reportsSubmitted'] as num?)?.toInt() ?? 0,
      offersRedeemed: (res['offersRedeemed'] as num?)?.toInt() ?? 0,
    );
  }

  static Future<void> markAlertRead({
    required String userId,
    required String alertId,
  }) async {
    if (alertId.isEmpty) return;
    try {
      await ApiService.post('/users/me/alert-reads', {
        'userId': userId,
        'alertId': alertId,
      });
    } catch (e) {
      debugPrint('Failed to record alert read: $e');
    }
  }
}

class ActivityStats {
  final int alertsRead;
  final int reportsSubmitted;
  final int offersRedeemed;

  const ActivityStats({
    this.alertsRead = 0,
    this.reportsSubmitted = 0,
    this.offersRedeemed = 0,
  });
}
