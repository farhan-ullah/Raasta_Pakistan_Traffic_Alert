import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class BusinessScreen extends StatelessWidget {
  const BusinessScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().currentUser!;
    final isPremium = user.subscriptionTier == 'premium';

    return Scaffold(
      appBar: AppBar(
        title: Text(user.businessName ?? 'Business Dashboard'),
      ),
      body: _PlanTab(user: user, isPremium: isPremium),
    );
  }
}

class _PlanTab extends StatelessWidget {
  final dynamic user;
  final bool isPremium;
  const _PlanTab({required this.user, required this.isPremium});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(children: [
      Container(width: double.infinity, padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(gradient: LinearGradient(colors: isPremium ? [const Color(0xFFFF6F00), const Color(0xFFF57C00)] : [AppTheme.textGrey, const Color(0xFF424242)]), borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Icon(isPremium ? Icons.star : Icons.star_border, color: Colors.white, size: 32), const SizedBox(width: 12), Text(isPremium ? 'Premium Plan' : 'Free Plan', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold))]),
          const SizedBox(height: 8),
          Text(isPremium ? 'You have full access to all features' : 'Upgrade to unlock all features', style: const TextStyle(color: Colors.white70)),
        ])),
      const SizedBox(height: 24),
      const Text('Plan Comparison', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      const SizedBox(height: 12),
      _comparisonTable(),
      const SizedBox(height: 24),
      if (!isPremium) ...[
        const Text('Upgrade to Premium', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        ...['Rs. 2,999/mo - Basic Premium', 'Rs. 5,999/mo - Pro Premium', 'Rs. 9,999/mo - Enterprise'].map((plan) => Card(
          child: ListTile(
            leading: const Icon(Icons.star, color: AppTheme.highOrange),
            title: Text(plan.split(' - ')[1]), subtitle: Text(plan.split(' - ')[0]),
            trailing: ElevatedButton(onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment integration coming soon!'))), child: const Text('Select', style: TextStyle(fontSize: 12))),
          ),
        )),
      ],
    ]));
  }

  Widget _comparisonTable() => Table(
    border: TableBorder.all(color: AppTheme.borderGrey, borderRadius: BorderRadius.circular(8)),
    columnWidths: const {0: FlexColumnWidth(2), 1: FlexColumnWidth(1), 2: FlexColumnWidth(1)},
    children: [
      _tableRow(['Feature', 'Free', 'Premium'], isHeader: true),
      _tableRow(['Max Offers', '3', 'Unlimited']),
      _tableRow(['Offer Radius', '2km', '10km']),
      _tableRow(['Analytics', 'Basic', 'Advanced']),
      _tableRow(['Priority Placement', '✗', '✓']),
      _tableRow(['Custom Promo Codes', '✓', '✓']),
      _tableRow(['Push Notifications', '✗', '✓']),
    ],
  );

  TableRow _tableRow(List<String> cells, {bool isHeader = false}) => TableRow(
    decoration: isHeader ? const BoxDecoration(color: AppTheme.primaryRed) : null,
    children: cells.map((c) => Padding(padding: const EdgeInsets.all(8), child: Text(c, style: TextStyle(fontWeight: isHeader ? FontWeight.bold : FontWeight.normal, color: isHeader ? Colors.white : AppTheme.textDark, fontSize: 12), textAlign: TextAlign.center))).toList(),
  );
}
