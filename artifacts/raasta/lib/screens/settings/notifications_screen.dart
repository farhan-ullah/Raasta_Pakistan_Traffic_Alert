import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool pushEnabled = true;
  bool emailEnabled = false;
  bool trafficAlerts = true;
  bool adminAnnouncements = true;
  bool promotions = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textDark,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          _buildSectionHeader('Channels'),
          _buildSwitch('Push Notifications', 'Receive alerts on your device', pushEnabled, (v) => setState(() => pushEnabled = v)),
          _buildSwitch('Email Notifications', 'Weekly summaries & important updates', emailEnabled, (v) => setState(() => emailEnabled = v)),
          const SizedBox(height: 24),
          _buildSectionHeader('Preferences'),
          _buildSwitch('Traffic Alerts', 'Live updates on your routes', trafficAlerts, (v) => setState(() => trafficAlerts = v)),
          _buildSwitch('City Announcements', 'Official updates from authorities', adminAnnouncements, (v) => setState(() => adminAnnouncements = v)),
          _buildSwitch('Promotions & Offers', 'Exclusive deals from local businesses', promotions, (v) => setState(() => promotions = v)),
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

  Widget _buildSwitch(String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: SwitchListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textDark, fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.textGrey, fontSize: 12)),
        value: value,
        onChanged: onChanged,
        activeColor: AppTheme.primaryRed,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
