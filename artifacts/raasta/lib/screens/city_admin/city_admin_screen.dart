import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/announcement.dart';
import '../../providers/city_admin_provider.dart';
import '../../theme/app_theme.dart';

class CityAdminScreen extends StatelessWidget {
  const CityAdminScreen({super.key});

  static const _priorities = ['Low', 'Medium', 'High', 'Critical'];
  static const _categories = ['Holiday', 'Road Closure', 'Event', 'Emergency', 'Maintenance', 'Diversion', 'Public Notice', 'Weather'];
  static const _cities = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar'];

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CityAdminProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('City Admin Portal')),
      body: ListView.builder(
        padding: const EdgeInsets.only(bottom: 80, top: 8),
        itemCount: provider.announcements.length,
        itemBuilder: (_, i) {
          final a = provider.announcements[i];
          final color = {'Critical': AppTheme.criticalRed, 'High': AppTheme.highOrange, 'Medium': AppTheme.mediumYellow, 'Low': AppTheme.lowGreen}[a.priority] ?? AppTheme.textGrey;
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
            child: ListTile(
              leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Icon(Icons.campaign, color: color, size: 20)),
              title: Text(a.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const SizedBox(height: 2),
                Row(children: [
                  Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1), decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)), child: Text(a.priority.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
                  const SizedBox(width: 6),
                  Text(a.category, style: const TextStyle(fontSize: 11, color: AppTheme.textGrey)),
                  const Spacer(),
                  Text(a.city, style: const TextStyle(fontSize: 11, color: AppTheme.textGrey)),
                ]),
              ]),
              trailing: IconButton(icon: const Icon(Icons.delete_outline, color: AppTheme.primaryRed, size: 20), onPressed: () => _confirmDelete(context, provider, a.id)),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddForm(context),
        icon: const Icon(Icons.add),
        label: const Text('New Announcement'),
        backgroundColor: AppTheme.primaryRed,
      ),
    );
  }

  void _confirmDelete(BuildContext context, CityAdminProvider provider, String id) {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('Delete Announcement'),
      content: const Text('Are you sure you want to delete this announcement?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(onPressed: () { provider.deleteAnnouncement(id); Navigator.pop(context); }, style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryRed), child: const Text('Delete')),
      ],
    ));
  }

  void _showAddForm(BuildContext context) {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    final areaCtrl = TextEditingController();
    final deptCtrl = TextEditingController(text: 'Capital Development Authority (CDA)');
    String priority = 'Medium';
    String category = 'Public Notice';
    String city = 'Islamabad';
    bool pinned = false;
    showModalBottomSheet(context: context, isScrollControlled: true, shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('New Announcement', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: bodyCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Full Announcement Body', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: DropdownButtonFormField<String>(value: priority, decoration: const InputDecoration(labelText: 'Priority', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)), items: _priorities.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => ss(() => priority = v!))),
            const SizedBox(width: 12),
            Expanded(child: DropdownButtonFormField<String>(value: city, decoration: const InputDecoration(labelText: 'City', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)), items: _cities.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => ss(() => city = v!))),
          ]),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(value: category, decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder()), items: _categories.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => ss(() => category = v!)),
          const SizedBox(height: 12),
          TextField(controller: deptCtrl, decoration: const InputDecoration(labelText: 'Department', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: areaCtrl, decoration: const InputDecoration(labelText: 'Affected Areas (comma separated)', border: OutlineInputBorder())),
          const SizedBox(height: 8),
          SwitchListTile(value: pinned, onChanged: (v) => ss(() => pinned = v), title: const Text('Pin to top'), contentPadding: EdgeInsets.zero, activeColor: AppTheme.primaryRed),
          const SizedBox(height: 8),
          ElevatedButton(onPressed: () {
            if (titleCtrl.text.isEmpty || bodyCtrl.text.isEmpty) return;
            context.read<CityAdminProvider>().addAnnouncement(CityAnnouncement(
              id: 'ca${DateTime.now().millisecondsSinceEpoch}', title: titleCtrl.text, body: bodyCtrl.text,
              category: category, priority: priority, city: city,
              affectedAreas: areaCtrl.text.isEmpty ? ['N/A'] : areaCtrl.text.split(',').map((e) => e.trim()).toList(),
              department: deptCtrl.text, isPinned: pinned, views: 0, createdAt: DateTime.now(),
            ));
            Navigator.pop(ctx);
          }, child: const Text('Publish Announcement')),
          const SizedBox(height: 16),
        ])),
      )),
    );
  }
}
