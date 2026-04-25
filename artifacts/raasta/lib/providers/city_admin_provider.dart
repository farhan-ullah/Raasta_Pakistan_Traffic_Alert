import 'package:flutter/material.dart';
import '../models/announcement.dart';
import '../services/api_service.dart';

class CityAdminProvider extends ChangeNotifier {
  List<CityAnnouncement> _announcements = [];
  bool _isLoading = false;

  List<CityAnnouncement> get announcements => List.from(_announcements);
  List<CityAnnouncement> get pinned => _announcements.where((a) => a.isPinned).toList();
  bool get isLoading => _isLoading;

  List<CityAnnouncement> getByCategory(String category) =>
      category == 'All' ? _announcements : _announcements.where((a) => a.category == category).toList();

  Future<void> fetchAnnouncements({String? category}) async {
    _isLoading = true;
    notifyListeners();
    try {
      final path = category != null && category != 'All' ? '/announcements?category=$category' : '/announcements';
      final response = await ApiService.get(path);
      if (response != null && response is List) {
        _announcements = response.map((json) => CityAnnouncement.fromJson(json)).toList();
      }
    } catch (e) {
      debugPrint('Error fetching announcements: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addAnnouncement(CityAnnouncement ann) async {
    try {
      final data = ann.toJson();
      final response = await ApiService.post('/announcements', data);
      if (response != null && response['id'] != null) {
        _announcements.insert(0, CityAnnouncement.fromJson(response));
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error creating announcement: $e');
    }
  }

  void deleteAnnouncement(String id) {
    _announcements.removeWhere((a) => a.id == id);
    notifyListeners();
  }
}
