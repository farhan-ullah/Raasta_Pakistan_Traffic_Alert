enum UserRole { superAdmin, police, cityAdmin, business, user }

class AppUser {
  final String id;
  final String username;
  final String password;
  final String fullName;
  final String email;
  final String phone;
  final UserRole role;
  final bool isVerified;
  final bool isActive;
  final bool isApproved;
  final DateTime createdAt;
  final String? businessName;
  final String? businessCategory;
  final String? badge;
  final String? subscriptionTier;

  const AppUser({
    required this.id,
    required this.username,
    required this.password,
    required this.fullName,
    required this.email,
    required this.phone,
    required this.role,
    this.isVerified = true,
    this.isActive = true,
    this.isApproved = true,
    required this.createdAt,
    this.businessName,
    this.businessCategory,
    this.badge,
    this.subscriptionTier,
  });

  bool get needsApproval => role == UserRole.police || role == UserRole.cityAdmin;

  String get roleLabel {
    switch (role) {
      case UserRole.superAdmin: return 'Super Admin';
      case UserRole.police:    return 'Police';
      case UserRole.cityAdmin: return 'City Admin';
      case UserRole.business:  return 'Business';
      case UserRole.user:      return 'User';
    }
  }

  String get roleKey {
    switch (role) {
      case UserRole.superAdmin: return 'super_admin';
      case UserRole.police:    return 'police';
      case UserRole.cityAdmin: return 'city_admin';
      case UserRole.business:  return 'business';
      case UserRole.user:      return 'user';
    }
  }

  AppUser copyWith({
    bool? isVerified,
    bool? isActive,
    bool? isApproved,
    String? subscriptionTier,
  }) {
    return AppUser(
      id: id, username: username, password: password,
      fullName: fullName, email: email, phone: phone, role: role,
      isVerified: isVerified ?? this.isVerified,
      isActive: isActive ?? this.isActive,
      isApproved: isApproved ?? this.isApproved,
      createdAt: createdAt,
      businessName: businessName, businessCategory: businessCategory,
      badge: badge,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
    );
  }
}
