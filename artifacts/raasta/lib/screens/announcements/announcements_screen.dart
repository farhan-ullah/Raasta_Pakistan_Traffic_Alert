import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/city_admin_provider.dart';
import '../../models/announcement.dart';
import '../../theme/app_theme.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});
  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  String _category = 'All';
  static const _cats = [
    'All',
    'Holiday',
    'Road Closure',
    'Event',
    'Emergency',
    'Maintenance',
    'Weather',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CityAdminProvider>().fetchAnnouncements();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CityAdminProvider>(
      builder: (ctx, provider, _) {
        final items = provider.getByCategory(_category);
        final unpinned = items.where((a) => !a.isPinned).toList();
        return Scaffold(
          backgroundColor: AppTheme.background,
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 140,
                pinned: true,
                backgroundColor: const Color(0xFF1B5E20),
                elevation: 0,
                flexibleSpace: FlexibleSpaceBar(
                  background: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF1B5E20), Color(0xFF388E3C)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          top: -20,
                          right: -20,
                          child: Container(
                            width: 140,
                            height: 140,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                        const Positioned(
                          top: 40,
                          left: 20,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.campaign_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'City Announcements',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Official notices from CDA & authorities',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(54),
                  child: Container(
                    color: const Color(0xFF2E7D32),
                    child: SizedBox(
                      height: 54,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        itemCount: _cats.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final sel = _cats[i] == _category;
                          return GestureDetector(
                            onTap: () => setState(() => _category = _cats[i]),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: sel
                                    ? Colors.white
                                    : Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _cats[i],
                                style: TextStyle(
                                  color: sel
                                      ? const Color(0xFF2E7D32)
                                      : Colors.white,
                                  fontSize: 13,
                                  fontWeight: sel
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ),
              if (provider.pinned.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.push_pin_rounded,
                          size: 16,
                          color: AppTheme.primaryRed,
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'Pinned',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primaryRed,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _AnnouncementCard(
                      ann: provider.pinned[i],
                      pinned: true,
                    ),
                    childCount: provider.pinned.length,
                  ),
                ),
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Divider(),
                  ),
                ),
              ],
              SliverPadding(
                padding: const EdgeInsets.only(bottom: 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => _AnnouncementCard(ann: unpinned[i]),
                    childCount: unpinned.length,
                  ),
                ),
              ),
            ],
          ),
          floatingActionButton: context.watch<AuthProvider>().isCityAdmin || context.watch<AuthProvider>().isSuperAdmin
              ? FloatingActionButton.extended(
                  onPressed: () => _addAnnouncement(context),
                  icon: const Icon(Icons.add),
                  label: const Text('Add Announcement'),
                  backgroundColor: const Color(0xFF1B5E20),
                )
              : null,
        );
      },
    );
  }

  void _addAnnouncement(BuildContext context) {
    final titleCtrl = TextEditingController();
    final bodyCtrl = TextEditingController();
    final deptCtrl = TextEditingController(text: 'CDA');
    final areaCtrl = TextEditingController();
    String category = 'Public Notice';
    String priority = 'Medium';
    bool isPinned = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, ss) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Post City Announcement',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: category,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                  ),
                  items: _cats
                      .where((c) => c != 'All')
                      .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                      .toList(),
                  onChanged: (v) => ss(() => category = v!),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: priority,
                  decoration: const InputDecoration(
                    labelText: 'Priority',
                    border: OutlineInputBorder(),
                  ),
                  items: ['Low', 'Medium', 'High', 'Critical']
                      .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                      .toList(),
                  onChanged: (v) => ss(() => priority = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Title',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: bodyCtrl,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'Message Body',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: deptCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Department',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: areaCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Affected Areas (comma separated)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('Pin Announcement'),
                  value: isPinned,
                  onChanged: (v) => ss(() => isPinned = v),
                ),
                const SizedBox(height: 16),
                StatefulBuilder(
                  builder: (ctx, btnSs) {
                    bool posting = false;
                    return ElevatedButton(
                      onPressed: posting
                          ? null
                          : () async {
                              if (titleCtrl.text.isEmpty || bodyCtrl.text.isEmpty) {
                                return;
                              }
                              btnSs(() => posting = true);
                              try {
                                await context.read<CityAdminProvider>().addAnnouncement(
                                  CityAnnouncement(
                                    id: '',
                                    title: titleCtrl.text,
                                    body: bodyCtrl.text,
                                    category: category,
                                    priority: priority,
                                    city: 'Islamabad',
                                    department: deptCtrl.text,
                                    affectedAreas: areaCtrl.text
                                        .split(',')
                                        .map((e) => e.trim())
                                        .toList(),
                                    isPinned: isPinned,
                                    views: 0,
                                    createdAt: DateTime.now(),
                                  ),
                                );
                                if (ctx.mounted) Navigator.pop(ctx);
                              } catch (e) {
                                btnSs(() => posting = false);
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(ctx).showSnackBar(
                                    SnackBar(content: Text('Error: $e')),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B5E20),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: posting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Post Announcement'),
                    );
                  },
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final CityAnnouncement ann;
  final bool pinned;
  const _AnnouncementCard({required this.ann, this.pinned = false});

  static const _catIcons = {
    'Holiday': Icons.celebration_rounded,
    'Road Closure': Icons.block_rounded,
    'Event': Icons.event_rounded,
    'Emergency': Icons.emergency_rounded,
    'Maintenance': Icons.build_rounded,
    'Diversion': Icons.alt_route_rounded,
    'Weather': Icons.cloud_rounded,
    'Public Notice': Icons.info_rounded,
  };

  static const _priorityColors = {
    'Critical': AppTheme.criticalRed,
    'High': AppTheme.highOrange,
    'Medium': AppTheme.mediumYellow,
    'Low': AppTheme.lowGreen,
  };

  @override
  Widget build(BuildContext context) {
    final color = _priorityColors[ann.priority] ?? AppTheme.textGrey;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: AppTheme.cardDecoration(
        borderColor: pinned ? AppTheme.primaryRed.withOpacity(0.2) : null,
      ),
      clipBehavior: Clip.hardEdge,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showDetail(context),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (pinned)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                color: AppTheme.primaryRed.withOpacity(0.06),
                child: Row(
                  children: [
                    const Icon(
                      Icons.push_pin_rounded,
                      size: 12,
                      color: AppTheme.primaryRed,
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Pinned Announcement',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.primaryRed,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _catIcons[ann.category] ?? Icons.announcement_rounded,
                          color: color,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: color,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    ann.priority.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    ann.category,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.textGrey,
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  ann.timeAgo,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppTheme.textGrey,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              ann.title,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: AppTheme.textDark,
                                height: 1.2,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    ann.body,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textMed,
                      height: 1.5,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(
                        Icons.account_balance_rounded,
                        size: 13,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          ann.department,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textGrey,
                          ),
                        ),
                      ),
                      Icon(
                        Icons.location_city_rounded,
                        size: 13,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        ann.city,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.textGrey,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 18,
                        color: AppTheme.textGrey,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(BuildContext context) {
    final color = (_priorityColors[ann.priority] ?? AppTheme.textGrey);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        margin: const EdgeInsets.only(top: 48),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: DraggableScrollableSheet(
          initialChildSize: 1.0,
          maxChildSize: 1.0,
          minChildSize: 0.5,
          expand: false,
          builder: (_, ctrl) => ListView(
            controller: ctrl,
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        _catIcons[ann.category] ?? Icons.announcement_rounded,
                        color: color,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: color,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  ann.priority.toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                ann.category,
                                style: TextStyle(
                                  color: color,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            ann.city,
                            style: const TextStyle(
                              color: AppTheme.textGrey,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Text(
                ann.title,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textDark,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                ann.body,
                style: const TextStyle(
                  fontSize: 15,
                  color: AppTheme.textMed,
                  height: 1.7,
                ),
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              _row(Icons.account_balance_rounded, 'Department', ann.department),
              _row(
                Icons.location_on_rounded,
                'Affected Areas',
                ann.affectedAreas.join(', '),
              ),
              _row(Icons.visibility_rounded, 'Views', '${ann.views}'),
              _row(Icons.schedule_rounded, 'Published', ann.timeAgo),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 17, color: AppTheme.textGrey),
        const SizedBox(width: 10),
        Text(
          '$label: ',
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 13,
            color: AppTheme.textDark,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, color: AppTheme.textGrey),
          ),
        ),
      ],
    ),
  );
}
