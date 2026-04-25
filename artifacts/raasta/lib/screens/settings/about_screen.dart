import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('About Raasta', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
        backgroundColor: Colors.white,
        foregroundColor: AppTheme.textDark,
        elevation: 0,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.primaryRed.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.directions_car_rounded, size: 50, color: AppTheme.primaryRed),
            ),
            const SizedBox(height: 20),
            const Text(
              'Raasta Pakistan',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.textDark),
            ),
            const SizedBox(height: 8),
            const Text('Version 1.0.0', style: TextStyle(color: AppTheme.textGrey, fontSize: 14)),
            const SizedBox(height: 40),
            _buildLink(context, 'Terms of Service'),
            _buildLink(context, 'Privacy Policy'),
            _buildLink(context, 'Open Source Licenses'),
          ],
        ),
      ),
    );
  }

  Widget _buildLink(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        onTap: () {},
        child: Text(
          title,
          style: const TextStyle(
            color: AppTheme.primaryRed,
            fontWeight: FontWeight.w700,
            fontSize: 15,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }
}
