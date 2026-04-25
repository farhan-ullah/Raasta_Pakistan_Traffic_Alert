import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'alerts/alerts_screen.dart';
import 'map/map_screen.dart';
import 'announcements/announcements_screen.dart';
import 'report/report_screen.dart';
import 'profile/profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with TickerProviderStateMixin {
  int _index = 3;

  static const _screens = [
    AlertsScreen(),
    AnnouncementsScreen(),
    ReportScreen(),
    MapScreen(),
    ProfileScreen(),
  ];

  static const _navItems = [
    _NavItem(
      Icons.notifications_none_rounded,
      Icons.notifications_rounded,
      'Alerts',
      false,
    ),
    _NavItem(
      Icons.bar_chart_rounded,
      Icons.bar_chart_rounded,
      'Updates',
      false,
    ),
    _NavItem(
      Icons.add_circle_outline_rounded,
      Icons.add_circle_rounded,
      'Report',
      true,
    ),
    _NavItem(Icons.explore_outlined, Icons.explore_rounded, 'Map', false),
    _NavItem(
      Icons.person_outline_rounded,
      Icons.person_rounded,
      'Profile',
      false,
    ),
  ];

  void _onTap(int i) {
    if (i != _index) setState(() => _index = i);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          IndexedStack(index: _index, children: _screens),
          Positioned(
            left: 0,
            right: 0,
            bottom: MediaQuery.of(context).padding.bottom > 0
                ? MediaQuery.of(context).padding.bottom
                : 12,
            child: _RaastNavBar(
              selected: _index,
              items: _navItems,
              onTap: _onTap,
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem {
  final IconData icon, activeIcon;
  final String label;
  final bool isCenter;
  const _NavItem(this.icon, this.activeIcon, this.label, this.isCenter);
}

class _RaastNavBar extends StatelessWidget {
  final int selected;
  final List<_NavItem> items;
  final ValueChanged<int> onTap;
  const _RaastNavBar({
    required this.selected,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.88),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: Colors.black.withOpacity(0.06),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: const SizedBox.expand(),
              ),
            ),
          ),
        ),
        SizedBox(
          height: 72,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: List.generate(
                items.length,
                (i) => Expanded(
                  child: items[i].isCenter
                      ? _CenterNavTab(
                          item: items[i],
                          selected: i == selected,
                          onTap: () => onTap(i),
                        )
                      : _NavTab(
                          item: items[i],
                          selected: i == selected,
                          onTap: () => onTap(i),
                        ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CenterNavTab extends StatelessWidget {
  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;
  const _CenterNavTab({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Positioned(
            top: -22,
            child: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: const Color(0xFF006E26),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF006E26).withOpacity(0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.add_rounded,
                color: Colors.white,
                size: 30,
              ),
            ),
          ),
          Positioned(
            bottom: -2,
            child: Text(
              item.label,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: Color(0xFF006E26),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavTab extends StatefulWidget {
  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;
  const _NavTab({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  @override
  State<_NavTab> createState() => _NavTabState();
}

class _NavTabState extends State<_NavTab> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _scaleAnim = Tween(
      begin: 0.85,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    if (widget.selected) _ctrl.value = 1.0;
  }

  @override
  void didUpdateWidget(_NavTab old) {
    super.didUpdateWidget(old);
    if (widget.selected != old.selected) {
      widget.selected ? _ctrl.forward() : _ctrl.reverse();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = const Color(0xFF006E26);
    final inactiveColor = const Color(0xFFA1A1AA);

    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, child) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Transform.scale(
              scale: widget.selected ? _scaleAnim.value : 1.0,
              child: Icon(
                widget.selected ? widget.item.activeIcon : widget.item.icon,
                color: widget.selected ? activeColor : inactiveColor,
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: widget.selected ? FontWeight.w800 : FontWeight.w600,
                color: widget.selected ? activeColor : inactiveColor,
              ),
              child: Text(widget.item.label),
            ),
          ],
        ),
      ),
    );
  }
}
