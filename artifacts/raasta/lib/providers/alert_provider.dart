import 'package:flutter/material.dart';
import '../models/traffic_alert.dart';
import '../services/api_service.dart';

class AlertProvider extends ChangeNotifier {
  List<TrafficAlert> _alerts = [];
  bool _isLoading = false;
  String _selectedSeverity = 'All';
  String _selectedCity = 'All Cities';

  bool get isLoading => _isLoading;
  List<TrafficAlert> get alerts => _filtered;
  String get selectedSeverity => _selectedSeverity;
  String get selectedCity => _selectedCity;

  List<TrafficAlert> get _filtered {
    return _alerts.where((a) {
      final severityMatch = _selectedSeverity == 'All' || a.severity.toLowerCase() == _selectedSeverity.toLowerCase();
      final cityMatch = _selectedCity == 'All Cities' || a.city == _selectedCity;
      return severityMatch && cityMatch;
    }).toList();
  }

  AlertProvider() {
    fetchAlerts();
  }

  void setSeverity(String s) { _selectedSeverity = s; notifyListeners(); }
  void setCity(String c) { _selectedCity = c; notifyListeners(); }

  Future<void> fetchAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/incidents');
      if (data is List) {
        _alerts = data.map((json) => TrafficAlert.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('Error fetching alerts: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addAlert(TrafficAlert alert) async {
    // Add locally for optimistic UI
    _alerts.insert(0, alert);
    notifyListeners();
    
    try {
      await ApiService.post('/incidents', alert.toJson());
      // Refresh to get actual ID and data
      await fetchAlerts();
    } catch (e) {
      debugPrint('Error posting alert: $e');
      _alerts.remove(alert); // Revert on failure
      notifyListeners();
      throw Exception('Failed to post alert');
    }
  }
}
