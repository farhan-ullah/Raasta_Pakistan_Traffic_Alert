import 'package:flutter/material.dart';
import '../models/police_alert.dart';
import '../services/api_service.dart';

class PoliceProvider extends ChangeNotifier {
  List<PoliceAlert> _alerts = [];
  bool _isLoading = false;

  bool get isLoading => _isLoading;
  List<PoliceAlert> get allAlerts => List.from(_alerts);
  List<PoliceAlert> get vipMovements => _alerts.where((a) => a.type == PoliceAlertType.vipMovement).toList();
  List<PoliceAlert> get roadBlockages => _alerts.where((a) => a.type == PoliceAlertType.roadBlockage).toList();
  List<PoliceAlert> get activeAlerts => _alerts.where((a) => a.isActive).toList();

  PoliceProvider() {
    fetchAlerts();
  }

  Future<void> fetchAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/incidents?reportedBy=police');
      if (data is List) {
        _alerts = data
            .where((json) => json['reportedBy'] == 'police')
            .map((json) => PoliceAlert.fromJson(json))
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
