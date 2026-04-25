import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  AppUser? _currentUser;
  final List<AppUser> _pendingApprovals = [];

  AppUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isSuperAdmin => _currentUser?.role == UserRole.superAdmin;
  bool get isPolice => _currentUser?.role == UserRole.police;
  bool get isCityAdmin => _currentUser?.role == UserRole.cityAdmin;
  bool get isBusiness => _currentUser?.role == UserRole.business;

  List<AppUser> get pendingApprovals => _pendingApprovals;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('auth_username');
    final roleKey = prefs.getString('auth_role');
    final token = prefs.getString('auth_token');

    if (username != null && roleKey != null) {
      UserRole role = UserRole.user;
      for (var r in UserRole.values) {
        if (r.toString().split('.').last == roleKey) {
          role = r;
          break;
        }
      }

      ApiService.authToken = token;
      _currentUser = AppUser(
        id: prefs.getString('auth_id') ?? 'saved_user',
        username: username,
        password: '',
        fullName: prefs.getString('auth_name') ?? 'Commuter',
        email: prefs.getString('auth_email') ?? 'user@raasta.pk',
        phone: prefs.getString('auth_phone') ?? '0000',
        role: role,
        isApproved: true,
        createdAt: DateTime.now(),
      );
      notifyListeners();
    }
  }

  Future<String?> login(String username, String password, UserRole role) async {
    try {
      if (role == UserRole.police) {
        final res = await ApiService.post('/auth/police/login', {'pin': password});
        ApiService.authToken = res['token'];
        _currentUser = AppUser(
          id: 'police_1', username: 'police', password: '', fullName: 'Traffic Police Officer',
          email: 'police@punjabpolice.gov.pk', phone: '1915', role: UserRole.police,
          badge: 'Traffic Officer', isApproved: true, createdAt: DateTime.now(),
        );
      } else {
        // Mock login for other roles
        _currentUser = AppUser(
          id: '${role.toString().split('.').last}_1', 
          username: username.isEmpty ? 'user' : username, 
          password: '', 
          fullName: role == UserRole.superAdmin ? 'System Admin' : (role == UserRole.business ? 'Business Owner' : 'Commuter'),
          email: '${username.isEmpty ? 'user' : username}@raasta.pk', 
          phone: '0000', 
          role: role,
          isApproved: true, 
          createdAt: DateTime.now(),
        );
      }

      // Save session
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_username', _currentUser!.username);
      await prefs.setString('auth_role', _currentUser!.role.toString().split('.').last);
      await prefs.setString('auth_id', _currentUser!.id);
      await prefs.setString('auth_name', _currentUser!.fullName);
      await prefs.setString('auth_email', _currentUser!.email);
      await prefs.setString('auth_phone', _currentUser!.phone);
      if (ApiService.authToken != null) {
        await prefs.setString('auth_token', ApiService.authToken!);
      }

      notifyListeners();
      return null;
    } catch (e) {
      return e.toString().replaceAll('Exception: ', '');
    }
  }

  Future<String?> register({
    required String username, required String password,
    required String fullName, required String email, required String phone,
    required UserRole role, String? businessName, String? businessCategory,
  }) async {
    // Dynamic register is not fully supported by backend for users, so we just mock the success locally.
    final needsApproval = role == UserRole.police || role == UserRole.cityAdmin;
    final user = AppUser(
      id: 'u_${DateTime.now().millisecondsSinceEpoch}', username: username, password: password,
      fullName: fullName, email: email, phone: phone, role: role,
      businessName: businessName, businessCategory: businessCategory,
      isVerified: role == UserRole.user,
      isApproved: !needsApproval,
      subscriptionTier: role == UserRole.business ? 'free' : null,
      createdAt: DateTime.now(),
    );

    if (needsApproval) {
      _pendingApprovals.add(user);
    } else {
      _currentUser = user;
    }
    notifyListeners();
    return null;
  }

  void logout() async {
    _currentUser = null;
    ApiService.authToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }

  // Admin features (mocked for now as backend has no users table)
  void approveUser(String id) {
    _pendingApprovals.removeWhere((u) => u.id == id);
    notifyListeners();
  }
  void rejectUser(String id) {
    _pendingApprovals.removeWhere((u) => u.id == id);
    notifyListeners();
  }
  void banUser(String id) {}
  void unbanUser(String id) {}
  void updateUser(String id, {bool? isVerified, bool? isActive, bool? isApproved, String? subscriptionTier}) {}
  void deleteUser(String id) {}
  List<AppUser> get allUsers => [];
  List<AppUser> getUsersByRole(UserRole role) => [];
  List<AppUser> get businesses => [];
  List<AppUser> get policeUsers => [];
  List<AppUser> get cityAdmins => [];
}
