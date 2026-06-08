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
  List<TrafficAlert> get publishedIncidents =>
      _alerts.where((a) => a.isPublished).toList();
  String get selectedSeverity => _selectedSeverity;
  String get selectedCity => _selectedCity;

  List<TrafficAlert> get _filtered {
    return _alerts.where((a) {
      if (!a.isPublished) return false;
      final severityMatch = _selectedSeverity == 'All' ||
          a.severity.toLowerCase() == _selectedSeverity.toLowerCase();
      final cityMatch =
          _selectedCity == 'All Cities' || a.city == _selectedCity;
      return severityMatch && cityMatch;
    }).toList();
  }

  AlertProvider() {
    fetchAlerts();
  }

  void setSeverity(String s) {
    _selectedSeverity = s;
    notifyListeners();
  }

  void setCity(String c) {
    _selectedCity = c;
    notifyListeners();
  }

  Future<void> fetchAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final data = await ApiService.get('/incidents?status=active&published=true');
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

  Future<TrafficAlert> submitReport(TrafficAlert alert) async {
    try {
      final response = await ApiService.post('/incidents', alert.toJson());
      final created = TrafficAlert.fromJson(
        response is Map<String, dynamic> ? response : {},
      );
      if (created.isPublished) {
        _alerts.insert(0, created);
        notifyListeners();
        await fetchAlerts();
      }
      return created;
    } catch (e) {
      debugPrint('Error posting alert: $e');
      rethrow;
    }
  }

  Future<void> addAlert(TrafficAlert alert) async {
    _alerts.insert(0, alert);
    notifyListeners();

    try {
      await ApiService.post('/incidents', alert.toJson());
      await fetchAlerts();
    } catch (e) {
      debugPrint('Error posting alert: $e');
      _alerts.remove(alert);
      notifyListeners();
      throw Exception('Failed to post alert');
    }
  }
}
