import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/police_alert.dart';
import '../../providers/police_provider.dart';
import '../../theme/app_theme.dart';

class PoliceScreen extends StatefulWidget {
  const PoliceScreen({super.key});
  @override
  State<PoliceScreen> createState() => _PoliceScreenState();
}

class _PoliceScreenState extends State<PoliceScreen> with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 2, vsync: this);

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Police Dashboard'),
        bottom: TabBar(controller: _tab, labelColor: Colors.white, unselectedLabelColor: Colors.white60, indicatorColor: Colors.white, tabs: const [
          Tab(icon: Icon(Icons.security), text: 'VIP Movement'),
          Tab(icon: Icon(Icons.block), text: 'Road Blockage'),
        ]),
      ),
      body: TabBarView(controller: _tab, children: const [_VipTab(), _BlockageTab()]),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _tab.index == 0 ? _addVip(context) : _addBlockage(context),
        icon: const Icon(Icons.add),
        label: const Text('New Alert'),
        backgroundColor: AppTheme.primaryRed,
      ),
    );
  }

  void _addVip(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final routeCtrl = TextEditingController();
    final startCtrl = TextEditingController();
    final endCtrl = TextEditingController();
    String vipLevel = 'Minister';
    showModalBottomSheet(context: context, isScrollControlled: true, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Register VIP Movement', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(value: vipLevel, decoration: const InputDecoration(labelText: 'VIP Level', border: OutlineInputBorder()), items: ['President', 'Prime Minister', 'Federal Minister', 'General', 'Ambassador', 'Governor', 'Chief Minister'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => ss(() => vipLevel = v!)),
          const SizedBox(height: 12),
          TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Movement Title', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: startCtrl, decoration: const InputDecoration(labelText: 'From', border: OutlineInputBorder()))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: endCtrl, decoration: const InputDecoration(labelText: 'To', border: OutlineInputBorder()))),
          ]),
          const SizedBox(height: 12),
          TextField(controller: routeCtrl, decoration: const InputDecoration(labelText: 'Route Description', border: OutlineInputBorder())),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: () {
            if (titleCtrl.text.isEmpty) return;
            context.read<PoliceProvider>().addAlert(PoliceAlert(
              id: 'pa${DateTime.now().millisecondsSinceEpoch}', type: PoliceAlertType.vipMovement,
              title: titleCtrl.text, description: descCtrl.text,
              route: routeCtrl.text, startPoint: startCtrl.text, endPoint: endCtrl.text,
              affectedRoads: [routeCtrl.text], alternateRoutes: ['See alternate routes'],
              severity: 'High', vipLevel: vipLevel, isActive: true,
              createdAt: DateTime.now(), createdBy: 'Police Officer',
              lat: 33.6844, lng: 73.0479,
            ));
            Navigator.pop(ctx);
          }, child: const Text('Post VIP Alert')),
          const SizedBox(height: 16),
        ])),
      )),
    );
  }

  void _addBlockage(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final startCtrl = TextEditingController();
    final endCtrl = TextEditingController();
    final altCtrl = TextEditingController();
    String severity = 'Medium';
    showModalBottomSheet(context: context, isScrollControlled: true, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Report Road Blockage', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Blockage Title', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description / Reason', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: startCtrl, decoration: const InputDecoration(labelText: 'Start Point', border: OutlineInputBorder()))),
            const SizedBox(width: 12),
            Expanded(child: TextField(controller: endCtrl, decoration: const InputDecoration(labelText: 'End Point', border: OutlineInputBorder()))),
          ]),
          const SizedBox(height: 12),
          TextField(controller: altCtrl, decoration: const InputDecoration(labelText: 'Alternate Route', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(value: severity, decoration: const InputDecoration(labelText: 'Severity', border: OutlineInputBorder()), items: ['Low', 'Medium', 'High', 'Critical'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => ss(() => severity = v!)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: () {
            if (titleCtrl.text.isEmpty) return;
            context.read<PoliceProvider>().addAlert(PoliceAlert(
              id: 'pa${DateTime.now().millisecondsSinceEpoch}', type: PoliceAlertType.roadBlockage,
              title: titleCtrl.text, description: descCtrl.text,
              route: '${startCtrl.text} → ${endCtrl.text}', startPoint: startCtrl.text, endPoint: endCtrl.text,
              affectedRoads: [startCtrl.text], alternateRoutes: [altCtrl.text],
              severity: severity, vipLevel: 'N/A', isActive: true,
              createdAt: DateTime.now(), createdBy: 'Police Officer',
              lat: 33.6844, lng: 73.0479,
            ));
            Navigator.pop(ctx);
          }, child: const Text('Post Blockage Alert')),
          const SizedBox(height: 16),
        ])),
      )),
    );
  }
}

class _VipTab extends StatelessWidget {
  const _VipTab();
  @override
  Widget build(BuildContext context) {
    final alerts = context.watch<PoliceProvider>().vipMovements;
    return alerts.isEmpty ? const Center(child: Text('No VIP movements', style: TextStyle(color: AppTheme.textGrey))) : ListView.builder(
      padding: const EdgeInsets.only(bottom: 80, top: 8),
      itemCount: alerts.length,
      itemBuilder: (_, i) => _PoliceCard(alert: alerts[i]),
    );
  }
}

class _BlockageTab extends StatelessWidget {
  const _BlockageTab();
  @override
  Widget build(BuildContext context) {
    final alerts = context.watch<PoliceProvider>().roadBlockages;
    return alerts.isEmpty ? const Center(child: Text('No road blockages', style: TextStyle(color: AppTheme.textGrey))) : ListView.builder(
      padding: const EdgeInsets.only(bottom: 80, top: 8),
      itemCount: alerts.length,
      itemBuilder: (_, i) => _PoliceCard(alert: alerts[i]),
    );
  }
}

class _PoliceCard extends StatelessWidget {
  final PoliceAlert alert;
  const _PoliceCard({required this.alert});

  @override
  Widget build(BuildContext context) {
    final color = alert.isActive ? AppTheme.infoBlue : AppTheme.textGrey;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(alert.type == PoliceAlertType.vipMovement ? Icons.security : Icons.block, color: color, size: 20)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(alert.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
              Row(children: [
                Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: alert.isActive ? Colors.green : Colors.grey, borderRadius: BorderRadius.circular(4)),
                  child: Text(alert.isActive ? 'ACTIVE' : 'CLEARED', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
                const SizedBox(width: 6),
                Text(alert.vipLevel, style: const TextStyle(fontSize: 12, color: AppTheme.textGrey)),
              ]),
            ])),
          ]),
          const SizedBox(height: 8),
          Text(alert.description, style: const TextStyle(fontSize: 13, color: AppTheme.textGrey), maxLines: 2, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 8),
          Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: AppTheme.background, borderRadius: BorderRadius.circular(8)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _routeRow(Icons.my_location, 'From', alert.startPoint),
            _routeRow(Icons.location_on, 'To', alert.endPoint),
            _routeRow(Icons.alt_route, 'Alternate', alert.alternateRoutes.take(2).join(', ')),
          ])),
          if (alert.isActive) ...[
            const SizedBox(height: 8),
            Align(alignment: Alignment.centerRight, child: TextButton.icon(
              onPressed: () => context.read<PoliceProvider>().clearAlert(alert.id),
              icon: const Icon(Icons.check_circle_outline, size: 16),
              label: const Text('Mark Cleared', style: TextStyle(fontSize: 12)),
              style: TextButton.styleFrom(foregroundColor: AppTheme.successGreen),
            )),
          ],
        ]),
      ),
    );
  }

  Widget _routeRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(children: [
      Icon(icon, size: 13, color: AppTheme.textGrey), const SizedBox(width: 6),
      Text('$label: ', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textDark)),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 12, color: AppTheme.textGrey))),
    ]),
  );
}
