import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:raasta/screens/admin/admin_screen.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';
import '../police/police_screen.dart';
import '../city_admin/city_admin_screen.dart';
import '../business/business_screen.dart';
import '../../services/api_service.dart';
import '../settings/notifications_screen.dart';
import '../settings/privacy_security_screen.dart';
import '../settings/help_support_screen.dart';
import '../settings/about_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _alertsRead = 0;
  int _reportsSubmitted = 0;
  int _offersRedeemed = 0;
  bool _isLoadingStats = true;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final res = await ApiService.get('/users/me/activity-stats');
      if (res != null) {
        if (mounted) {
          setState(() {
            _alertsRead = res['alertsRead'] ?? 0;
            _reportsSubmitted = res['reportsSubmitted'] ?? 0;
            _offersRedeemed = res['offersRedeemed'] ?? 0;
            _isLoadingStats = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingStats = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;
    if (user == null) return const SizedBox.shrink();
    final roleColor = AppTheme.roleColor(user.roleKey);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: CustomScrollView(
        slivers: [
          _ProfileHeader(
            user: user,
            roleColor: roleColor,
            onLogout: () => _logout(context),
          ),
          SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 700),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Contact card
                      _ContactCard(user: user, roleColor: roleColor),
                      const SizedBox(height: 20),
                      // Stats row
                      const SectionLabel('Activity'),
                      _isLoadingStats
                          ? const Center(child: CircularProgressIndicator())
                          : Row(
                              children: [
                                Expanded(
                                  child: _StatCard(
                                    '$_alertsRead',
                                    'Alerts Read',
                                    Icons.notifications_rounded,
                                    AppTheme.primaryRed,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _StatCard(
                                    '$_reportsSubmitted',
                                    'Reports',
                                    Icons.add_alert_rounded,
                                    AppTheme.highOrange,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _StatCard(
                                    '$_offersRedeemed',
                                    'Redeemed',
                                    Icons.local_offer_rounded,
                                    AppTheme.successGreen,
                                  ),
                                ),
                              ],
                            ),
                      const SizedBox(height: 24),
                      // Role dashboard
                      if (user.role != UserRole.user) ...[
                        const SectionLabel('Role Dashboard'),
                        _RoleDashboardCard(user: user, roleColor: roleColor),
                        const SizedBox(height: 24),
                      ],
                      // Settings
                      const SectionLabel('Settings'),
                      PressCard(
                        margin: EdgeInsets.zero,
                        radius: 18,
                        child: Column(
                          children: [
                            _SettingsRow(
                              Icons.notifications_rounded,
                              'Notifications',
                              roleColor,
                              () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const NotificationsScreen(),
                                ),
                              ),
                            ),
                            _SettingsDivider(),
                            _SettingsRow(
                              Icons.shield_rounded,
                              'Privacy & Security',
                              roleColor,
                              () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const PrivacySecurityScreen(),
                                ),
                              ),
                            ),
                            _SettingsDivider(),
                            _SettingsRow(
                              Icons.help_rounded,
                              'Help & Support',
                              roleColor,
                              () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const HelpSupportScreen(),
                                ),
                              ),
                            ),
                            _SettingsDivider(),
                            _SettingsRow(
                              Icons.info_rounded,
                              'About Raasta',
                              roleColor,
                              () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const AboutScreen(),
                                ),
                              ),
                              trailing: 'v1.0.0',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Logout
                      RaastButton(
                        height: 56,
                        outlined: true,
                        colors: [AppTheme.criticalRed, AppTheme.criticalRed],
                        onPressed: () => _logout(context),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(
                              Icons.logout_rounded,
                              color: AppTheme.criticalRed,
                              size: 20,
                            ),
                            SizedBox(width: 10),
                            Text(
                              'Sign Out',
                              style: TextStyle(
                                color: AppTheme.criticalRed,
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _logout(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => RaastSheet(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xFFFFEBEE),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(
                Icons.logout_rounded,
                color: AppTheme.criticalRed,
                size: 36,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Sign Out?',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'You\'ll need to sign in again to access Raasta.',
              style: TextStyle(color: AppTheme.textGrey, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            RaastButton(
              colors: [const Color(0xFFC62828), AppTheme.criticalRed],
              onPressed: () {
                Navigator.pop(context);
                context.read<AuthProvider>().logout();
              },
              child: const Text(
                'Yes, Sign Out',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text(
                'Cancel',
                style: TextStyle(color: AppTheme.textGrey, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final AppUser user;
  final Color roleColor;
  final VoidCallback onLogout;
  const _ProfileHeader({
    required this.user,
    required this.roleColor,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 260,
      pinned: true,
      backgroundColor: roleColor,
      elevation: 0,
      title: const Text(
        'My Profile',
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          fontSize: 22,
        ),
      ),
      actions: [
        IconButton(
          onPressed: onLogout,
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.logout_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
        const SizedBox(width: 8),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Color.lerp(roleColor, Colors.black, 0.4)!, roleColor],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -30,
                right: -30,
                child: Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                bottom: -20,
                left: -20,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.04),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                bottom: 80,
                left: 0,
                right: 0,
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 700),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Row(
                            children: [
                              // Avatar
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.white.withOpacity(0.3),
                                      Colors.white.withOpacity(0.15),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 3,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.15),
                                      blurRadius: 16,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    user.fullName.isNotEmpty
                                        ? user.fullName[0].toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                      fontSize: 34,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      user.fullName,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '@${user.username}',
                                      style: const TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withOpacity(
                                              0.2,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              20,
                                            ),
                                            border: Border.all(
                                              color: Colors.white30,
                                            ),
                                          ),
                                          child: Text(
                                            user.roleLabel,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        if (user.isVerified) ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: Colors.greenAccent
                                                  .withOpacity(0.2),
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  Icons.verified_rounded,
                                                  size: 13,
                                                  color: Colors.greenAccent,
                                                ),
                                                SizedBox(width: 3),
                                                Text(
                                                  'Verified',
                                                  style: TextStyle(
                                                    color: Colors.greenAccent,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.w800,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final AppUser user;
  final Color roleColor;
  const _ContactCard({required this.user, required this.roleColor});

  @override
  Widget build(BuildContext context) {
    return PressCard(
      margin: EdgeInsets.zero,
      radius: 18,
      child: Column(
        children: [
          _InfoTile(Icons.email_rounded, 'Email', user.email, roleColor),
          _RowDivider(),
          _InfoTile(Icons.phone_rounded, 'Phone', user.phone, roleColor),
          if (user.businessName != null) ...[
            _RowDivider(),
            _InfoTile(
              Icons.store_rounded,
              'Business',
              user.businessName!,
              roleColor,
            ),
          ],
          if (user.subscriptionTier != null) ...[
            _RowDivider(),
            _InfoTile(
              Icons.star_rounded,
              'Plan',
              '${user.subscriptionTier![0].toUpperCase()}${user.subscriptionTier!.substring(1)} Plan',
              const Color(0xFFFFB300),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label, value;
  final Color color;
  const _InfoTile(this.icon, this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppTheme.textGrey,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RoleDashboardCard extends StatelessWidget {
  final AppUser user;
  final Color roleColor;
  const _RoleDashboardCard({required this.user, required this.roleColor});

  @override
  Widget build(BuildContext context) {
    IconData icon;
    String title, subtitle;
    Widget screen;
    switch (user.role) {
      case UserRole.superAdmin:
        icon = Icons.admin_panel_settings_rounded;
        title = 'Super Admin Panel';
        subtitle = 'Manage users, businesses & permissions';
        screen = const AdminScreen();
        break;
      case UserRole.police:
        icon = Icons.local_police_rounded;
        title = 'Police Dashboard';
        subtitle = 'VIP movements & road blockages';
        screen = const PoliceScreen();
        break;
      case UserRole.cityAdmin:
        icon = Icons.account_balance_rounded;
        title = 'City Admin Portal';
        subtitle = 'Publish announcements & alerts';
        screen = const CityAdminScreen();
        break;
      case UserRole.business:
        icon = Icons.storefront_rounded;
        title = 'Business Dashboard';
        subtitle = 'Manage offers & view analytics';
        screen = const BusinessScreen();
        break;
      default:
        return const SizedBox.shrink();
    }
    return GestureDetector(
      onTap: () => Navigator.push(context, _slideRoute(screen)),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Color.lerp(roleColor, Colors.black, 0.25)!, roleColor],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: roleColor.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: roleColor.withOpacity(0.15),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(icon, color: Colors.white, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }

  PageRoute _slideRoute(Widget screen) {
    return PageRouteBuilder(
      pageBuilder: (_, __, ___) => screen,
      transitionsBuilder: (_, anim, __, child) => SlideTransition(
        position: Tween(
          begin: const Offset(1, 0),
          end: Offset.zero,
        ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
        child: child,
      ),
      transitionDuration: const Duration(milliseconds: 350),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String value, label;
  final IconData icon;
  final Color color;
  const _StatCard(this.value, this.label, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.12), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.textGrey,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final String? trailing;
  const _SettingsRow(
    this.icon,
    this.label,
    this.color,
    this.onTap, {
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(0.10),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  color: AppTheme.textDark,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            if (trailing != null)
              Text(
                trailing!,
                style: const TextStyle(fontSize: 12, color: AppTheme.textGrey),
              ),
            const SizedBox(width: 6),
            const Icon(
              Icons.chevron_right_rounded,
              size: 22,
              color: AppTheme.textGrey,
            ),
          ],
        ),
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, indent: 70, endIndent: 16);
}

class _SettingsDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, indent: 72, endIndent: 16);
}
