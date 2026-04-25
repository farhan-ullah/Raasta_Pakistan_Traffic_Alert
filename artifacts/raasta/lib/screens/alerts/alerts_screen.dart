import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/traffic_alert.dart';
import '../../providers/alert_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> with SingleTickerProviderStateMixin {
  static const _severities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  static const _cities = ['All Cities', 'Islamabad', 'Rawalpindi'];

  @override
  Widget build(BuildContext context) {
    return Consumer<AlertProvider>(
      builder: (context, provider, _) {
        final alerts = provider.alerts;
        return Scaffold(
          backgroundColor: AppTheme.background,
          body: NestedScrollView(
            headerSliverBuilder: (_, __) => [_buildAppBar(context, provider)],
            body: Column(
              children: [
                _buildStats(alerts),
                Expanded(
                  child: alerts.isEmpty
                      ? const EmptyState(
                          icon: Icons.check_circle_outline_rounded,
                          title: 'All Clear!',
                          subtitle: 'No traffic alerts in the selected area',
                          color: AppTheme.successGreen,
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.only(top: 4, bottom: 120),
                          itemCount: alerts.length,
                          itemBuilder: (ctx, i) => _AlertCard(
                            alert: alerts[i],
                            index: i,
                          ),
                        ),
                ),
              ],
            ),
          ),
          floatingActionButton: _ReportFAB(onPressed: () => _showReport(context, provider)),
        );
      },
    );
  }

  Widget _buildAppBar(BuildContext context, AlertProvider provider) {
    return SliverAppBar(
      pinned: true,
      floating: false,
      expandedHeight: 160,
      backgroundColor: AppTheme.primaryRed,
      elevation: 0,
      title: Row(children: [
        const LiveDot(),
        const SizedBox(width: 8),
        const Text('Raasta Alerts', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20)),
      ]),
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 12),
          child: IconButton(
            icon: const Icon(Icons.search_rounded, color: Colors.white, size: 26),
            style: IconButton.styleFrom(backgroundColor: Colors.white.withOpacity(0.15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () {},
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF6A0000), Color(0xFFD32F2F)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Stack(children: [
            Positioned(top: -20, right: -20, child: Container(width: 160, height: 160, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle))),
            Positioned(bottom: 55, left: 16, right: 16, child: Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                child: const Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.location_on_rounded, color: Colors.white70, size: 14),
                  SizedBox(width: 4),
                  Text('Islamabad · Rawalpindi', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                ]),
              ),
            ])),
          ]),
        ),
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(96),
        child: Container(
          color: AppTheme.primaryRed,
          child: Column(children: [
            _FilterRow(options: _severities, selected: provider.selectedSeverity, onSelect: provider.setSeverity),
            _FilterRow(options: _cities, selected: provider.selectedCity, onSelect: provider.setCity),
          ]),
        ),
      ),
    );
  }

  Widget _buildStats(List<TrafficAlert> alerts) {
    final critical = alerts.where((a) => a.severity == 'Critical').length;
    final high = alerts.where((a) => a.severity == 'High').length;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          _StatPill('${alerts.length} Total', AppTheme.infoBlue, Icons.notifications_rounded),
          const SizedBox(width: 8),
          if (critical > 0) _StatPill('$critical Critical', AppTheme.criticalRed, Icons.warning_rounded),
          if (critical > 0) const SizedBox(width: 8),
          if (high > 0) _StatPill('$high High', AppTheme.highOrange, Icons.priority_high_rounded),
        ]),
      ),
    );
  }

  void _showReport(BuildContext context, AlertProvider provider) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String severity = 'Medium';
    String city = 'Islamabad';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(builder: (ctx, ss) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: RaastSheet(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              IconBadge(icon: Icons.add_alert_rounded, color: AppTheme.primaryRed, size: 52),
              const SizedBox(width: 14),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Report Alert', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textDark)),
                Text('Help commuters avoid problems', style: TextStyle(fontSize: 13, color: AppTheme.textGrey)),
              ]),
            ]),
            const SizedBox(height: 22),
            RaastTextField(controller: titleCtrl, labelText: 'Alert Title', hintText: 'e.g. Road blocked at Faiz Ahmed Faiz'),
            const SizedBox(height: 12),
            RaastTextField(controller: descCtrl, labelText: 'Description', hintText: 'Describe the situation...', maxLines: 3),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _StyledDropdown<String>(
                value: severity,
                label: 'Severity',
                items: ['Low', 'Medium', 'High', 'Critical'],
                onChanged: (v) => ss(() => severity = v!),
              )),
              const SizedBox(width: 12),
              Expanded(child: _StyledDropdown<String>(
                value: city,
                label: 'City',
                items: ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'],
                onChanged: (v) => ss(() => city = v!),
              )),
            ]),
            const SizedBox(height: 24),
            RaastButton(
              onPressed: () {
                if (titleCtrl.text.isEmpty) return;
                provider.addAlert(TrafficAlert(
                  id: 'u${DateTime.now().millisecondsSinceEpoch}', title: titleCtrl.text,
                  description: descCtrl.text.isEmpty ? 'User reported alert' : descCtrl.text,
                  severity: severity, city: city, location: 'User Reported', area: city,
                  type: 'user_report', createdAt: DateTime.now(), reportedBy: 'You',
                  lat: 33.6844, lng: 73.0479,
                ));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: const Row(children: [Icon(Icons.check_circle, color: Colors.white), SizedBox(width: 8), Text('Alert reported!')]),
                  backgroundColor: AppTheme.successGreen,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ));
              },
              child: const Text('Submit Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
            ),
          ]),
        ),
      )),
    );
  }
}

class _FilterRow extends StatelessWidget {
  final List<String> options;
  final String selected;
  final Function(String) onSelect;
  const _FilterRow({required this.options, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
        itemCount: options.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final opt = options[i];
          final sel = opt == selected;
          return GestureDetector(
            onTap: () => onSelect(opt),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: sel ? Colors.white : Colors.white.withOpacity(0.18),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: sel ? Colors.white : Colors.white30, width: 1.5),
                boxShadow: sel ? [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 8)] : [],
              ),
              child: Text(opt, style: TextStyle(
                color: sel ? AppTheme.primaryRed : Colors.white,
                fontSize: 13,
                fontWeight: sel ? FontWeight.w800 : FontWeight.w500,
              )),
            ),
          );
        },
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  const _StatPill(this.label, this.color, this.icon);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

class _ReportFAB extends StatefulWidget {
  final VoidCallback onPressed;
  const _ReportFAB({required this.onPressed});

  @override
  State<_ReportFAB> createState() => _ReportFABState();
}

class _ReportFABState extends State<_ReportFAB> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 100));
    _scale = Tween(begin: 1.0, end: 0.92).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _ctrl.forward(),
      onTapUp: (_) { _ctrl.reverse(); widget.onPressed(); },
      onTapCancel: () => _ctrl.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(scale: _scale.value, child: child),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF9A0007), Color(0xFFD32F2F)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: AppTheme.primaryRed.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8)),
              BoxShadow(color: AppTheme.primaryRed.withOpacity(0.15), blurRadius: 6, offset: const Offset(0, 2)),
            ],
          ),
          child: const Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.add_alert_rounded, color: Colors.white, size: 22),
            SizedBox(width: 10),
            Text('Report Alert', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15, letterSpacing: 0.2)),
          ]),
        ),
      ),
    );
  }
}

// Alert card with animation
class _AlertCard extends StatefulWidget {
  final TrafficAlert alert;
  final int index;
  const _AlertCard({required this.alert, required this.index});

  @override
  State<_AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<_AlertCard> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 100));
    _scale = Tween(begin: 1.0, end: 0.97).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  static const _typeIcons = {
    'accident': Icons.car_crash_rounded,
    'closure': Icons.block_rounded,
    'flood': Icons.water_rounded,
    'vip': Icons.security_rounded,
    'construction': Icons.construction_rounded,
    'breakdown': Icons.car_repair_rounded,
    'congestion': Icons.traffic_rounded,
    'weather': Icons.cloud_rounded,
    'user_report': Icons.person_pin_circle_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final alert = widget.alert;
    final color = AppTheme.severityColor(alert.severity);
    return GestureDetector(
      onTapDown: (_) => _ctrl.forward(),
      onTapUp: (_) { _ctrl.reverse(); setState(() => _expanded = !_expanded); },
      onTapCancel: () => _ctrl.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(scale: _scale.value, child: child),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: color.withOpacity(0.18), width: 1.5),
            boxShadow: [
              BoxShadow(color: color.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 4)),
              BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 1)),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(width: 5, color: color),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Container(
                                width: 48, height: 48,
                                decoration: BoxDecoration(color: color.withOpacity(0.10), borderRadius: BorderRadius.circular(14)),
                                child: Icon(_typeIcons[alert.type] ?? Icons.warning_rounded, color: color, size: 24),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(alert.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.textDark, height: 1.2), maxLines: 2, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 6),
                                Row(children: [
                                  StatusBadge(label: alert.severity, color: color),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.location_on_rounded, size: 12, color: AppTheme.textGrey),
                                  const SizedBox(width: 2),
                                  Text(alert.city, style: const TextStyle(fontSize: 12, color: AppTheme.textGrey)),
                                ]),
                              ])),
                              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                Text(alert.timeAgo, style: const TextStyle(fontSize: 11, color: AppTheme.textGrey)),
                                const SizedBox(height: 4),
                                AnimatedRotation(
                                  turns: _expanded ? 0.5 : 0,
                                  duration: const Duration(milliseconds: 250),
                                  child: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.textGrey, size: 20),
                                ),
                              ]),
                            ]),
                            const SizedBox(height: 10),
                            Text(alert.description, style: const TextStyle(fontSize: 13, color: AppTheme.textMed, height: 1.5), maxLines: _expanded ? 10 : 2, overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis),
                            if (_expanded) ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: const Color(0xFFF5F5F5), borderRadius: BorderRadius.circular(10)),
                                child: Row(children: [
                                  Icon(Icons.navigation_rounded, size: 14, color: color),
                                  const SizedBox(width: 6),
                                  Expanded(child: Text(alert.location, style: const TextStyle(fontSize: 12, color: AppTheme.textMed))),
                                ]),
                              ),
                            ],
                          ]),
                        ),
                      ),
                    ],
                  ),
                ),
                // Footer stats bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: color.withOpacity(0.08), width: 1)),
                    color: color.withOpacity(0.02),
                  ),
                  child: Row(children: [
                    Icon(Icons.thumb_up_alt_outlined, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text('${alert.upvotes}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 14),
                    Icon(Icons.visibility_outlined, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text('${alert.views}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Text(_expanded ? 'Tap to collapse' : 'Tap for details', style: TextStyle(fontSize: 11, color: color.withOpacity(0.7), fontWeight: FontWeight.w600)),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


class _StyledDropdown<T> extends StatelessWidget {
  final T value;
  final String label;
  final List<T> items;
  final ValueChanged<T?> onChanged;
  const _StyledDropdown({required this.value, required this.label, required this.items, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: DropdownButtonFormField<T>(
        value: value,
        decoration: InputDecoration(labelText: label, border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 14)),
        items: items.map((s) => DropdownMenuItem<T>(value: s, child: Text(s.toString(), style: const TextStyle(fontSize: 14)))).toList(),
        onChanged: onChanged,
        dropdownColor: Colors.white,
        isExpanded: true,
      ),
    );
  }
}
