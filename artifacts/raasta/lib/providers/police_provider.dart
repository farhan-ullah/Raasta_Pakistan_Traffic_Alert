import 'package:flutter/material.dart';
import '../models/police_alert.dart';
import '../models/traffic_alert.dart';
import '../services/api_service.dart';

class PoliceProvider extends ChangeNotifier {
  List<PoliceAlert> _alerts = [];
  List<TrafficAlert> _pendingUserReports = [];
  bool _isLoading = false;

  bool get isLoading => _isLoading;
  List<PoliceAlert> get allAlerts => List.from(_alerts);
  List<PoliceAlert> get vipMovements =>
      _alerts.where((a) => a.type == PoliceAlertType.vipMovement).toList();
  List<PoliceAlert> get roadBlockages =>
      _alerts.where((a) => a.type == PoliceAlertType.roadBlockage).toList();
  List<PoliceAlert> get activeAlerts =>
      _alerts.where((a) => a.isActive).toList();
  List<TrafficAlert> get pendingUserReports => List.from(_pendingUserReports);

  PoliceProvider() {
    fetchAlerts();
  }

  Future<void> fetchAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final results = await Future.wait([
        ApiService.get('/incidents?reportedBy=police'),
        ApiService.get('/incidents?status=pending'),
      ]);
      final policeData = results[0];
      final pendingData = results[1];

      if (policeData is List) {
        _alerts = policeData
            .where((json) => json['reportedBy'] == 'police')
            .map((json) => PoliceAlert.fromJson(json))
            .toList();
      }
      if (pendingData is List) {
        _pendingUserReports = pendingData
            .where((json) => json['reportedBy'] != 'police')
            .map((json) => TrafficAlert.fromJson(json))
            .toList();
      }
    } catch (e) {
      debugPrint('Error fetching police alerts: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addAlert(PoliceAlert alert) async {
    _alerts.insert(0, alert);
    notifyListeners();
    try {
      await ApiService.post('/incidents', alert.toJson());
      await fetchAlerts();
    } catch (e) {
      debugPrint('Error posting police alert: $e');
      _alerts.remove(alert);
      notifyListeners();
      throw Exception('Failed to post police alert');
    }
  }

  Future<void> approveUserReport(String id) async {
    try {
      await ApiService.patch('/incidents/$id', {
        'status': 'active',
        'isVerifiedByPolice': true,
      });
      await fetchAlerts();
    } catch (e) {
      debugPrint('Error approving user report: $e');
      rethrow;
    }
  }

  Future<void> rejectUserReport(String id) async {
    try {
      await ApiService.patch('/incidents/$id', {
        'status': 'resolved',
        'isVerifiedByPolice': false,
      });
      await fetchAlerts();
    } catch (e) {
      debugPrint('Error rejecting user report: $e');
      rethrow;
    }
  }

  Future<void> clearAlert(String id) async {
    final idx = _alerts.indexWhere((a) => a.id == id);
    if (idx != -1) {
      _alerts[idx] = _alerts[idx].copyWith(isActive: false);
      notifyListeners();
      try {
        await ApiService.patch('/incidents/$id', {'status': 'resolved'});
        await fetchAlerts();
      } catch (e) {
        debugPrint('Error resolving police alert: $e');
        _alerts[idx] = _alerts[idx].copyWith(isActive: true);
        notifyListeners();
        throw Exception('Failed to resolve alert');
      }
    }
  }
}
