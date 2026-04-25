import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';

class PrivacySecurityScreen extends StatelessWidget {
  const PrivacySecurityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Privacy & Security', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textDark,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          _buildSectionHeader('Security'),
          _buildActionItem(context, Icons.lock_outline_rounded, 'Change Password', 'Update your account password', () {}),
          _buildActionItem(context, Icons.fingerprint_rounded, 'Biometric Login', 'Use Face ID or Fingerprint', () {}),
          const SizedBox(height: 24),
          _buildSectionHeader('Data Privacy'),
          _buildActionItem(context, Icons.location_on_outlined, 'Location Services', 'Manage location tracking permissions', () {}),
          _buildActionItem(context, Icons.analytics_outlined, 'Data Analytics', 'Share usage data to improve Raasta', () {}),
          const SizedBox(height: 24),
          _buildSectionHeader('Account Management'),
          _buildActionItem(context, Icons.download_rounded, 'Download Data', 'Get a copy of your personal data', () {}),
          _buildActionItem(context, Icons.delete_outline_rounded, 'Delete Account', 'Permanently remove your account & data', () {}, isDestructive: true),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppTheme.textGrey, letterSpacing: 1),
      ),
    );
  }

  Widget _buildActionItem(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap, {bool isDestructive = false}) {
    final color = isDestructive ? AppTheme.criticalRed : AppTheme.textDark;
    final iconColor = isDestructive ? AppTheme.criticalRed : AppTheme.textGrey;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
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
        title: Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: color, fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.textGrey, fontSize: 12)),
        trailing: Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400, size: 20),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
