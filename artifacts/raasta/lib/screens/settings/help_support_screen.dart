import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textDark,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          _buildActionItem(context, Icons.help_outline_rounded, 'FAQs', 'Frequently asked questions', () {}),
          _buildActionItem(context, Icons.chat_bubble_outline_rounded, 'Contact Support', 'Chat with our support team', () {}),
          _buildActionItem(context, Icons.report_problem_outlined, 'Report an Issue', 'Report bugs or incorrect data', () {}),
          _buildActionItem(context, Icons.menu_book_rounded, 'User Guide', 'Learn how to use Raasta', () {}),
        ],
      ),
    );
  }

  Widget _buildActionItem(BuildContext context, IconData icon, String title, String subtitle, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
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
            color: AppTheme.primaryRed.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppTheme.primaryRed, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.textDark, fontSize: 15)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppTheme.textGrey, fontSize: 12)),
        trailing: Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400, size: 20),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}
