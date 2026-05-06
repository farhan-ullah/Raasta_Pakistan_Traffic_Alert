import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';

class PrivacySecurityScreen extends StatelessWidget {
  const PrivacySecurityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text(
          'Privacy & Security',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textDark,
        elevation: 0,
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 16),
            children: [
              _buildSectionHeader('Security'),
              _buildActionItem(
                context,
                Icons.lock_outline_rounded,
                'Change Password',
                'Update your account password',
                () {},
              ),
              _buildActionItem(
                context,
                Icons.fingerprint_rounded,
                'Biometric Login',
                'Use Face ID or Fingerprint',
                () {},
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Data Privacy'),
              _buildActionItem(
                context,
                Icons.location_on_outlined,
                'Location Services',
                'Manage location tracking permissions',
                () {},
              ),
              _buildActionItem(
                context,
                Icons.analytics_outlined,
                'Data Analytics',
                'Share usage data to improve Raasta',
                () {},
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Account Management'),
              _buildActionItem(
                context,
                Icons.download_rounded,
                'Download Data',
                'Get a copy of your personal data',
                () {},
              ),
              _buildActionItem(
                context,
                Icons.delete_outline_rounded,
                'Delete Account',
                'Permanently remove your account & data',
                () => _confirmDelete(context),
                isDestructive: true,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RaastSheet(
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
                Icons.delete_forever_rounded,
                color: AppTheme.criticalRed,
                size: 36,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Delete Account?',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'This action is permanent and cannot be undone. All your data will be removed.',
              style: TextStyle(color: AppTheme.textGrey, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            RaastButton(
              colors: [const Color(0xFFC62828), AppTheme.criticalRed],
              onPressed: () {
                Navigator.pop(ctx);
                context.read<AuthProvider>().deleteAccount();
                Navigator.pop(context); // Back to main screen
              },
              child: const Text(
                'Yes, Delete My Account',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
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

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: AppTheme.textGrey,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildActionItem(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    bool isDestructive = false,
  }) {
    final color = isDestructive ? AppTheme.criticalRed : AppTheme.textDark;
    final iconColor = isDestructive ? AppTheme.criticalRed : AppTheme.textGrey;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: color,
            fontSize: 15,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: AppTheme.textGrey, fontSize: 12),
        ),
        trailing: Icon(
          Icons.chevron_right_rounded,
          color: Colors.grey.shade400,
          size: 20,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
