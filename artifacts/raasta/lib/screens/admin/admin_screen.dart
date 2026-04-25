import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> with SingleTickerProviderStateMixin {
  late final TabController _tab = TabController(length: 5, vsync: this);
  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final pending = context.watch<AuthProvider>().pendingApprovals.length;
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.primaryRed,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text('Super Admin Panel', style: TextStyle(fontWeight: FontWeight.w800)),
        bottom: TabBar(
          controller: _tab,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          isScrollable: true,
          tabs: [
            Tab(child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Text('Approvals'),
              if (pending > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                  child: Text('$pending', style: TextStyle(color: AppTheme.primaryRed, fontSize: 11, fontWeight: FontWeight.w900)),
                ),
              ],
            ])),
            const Tab(text: 'Overview'),
            const Tab(text: 'Businesses'),
            const Tab(text: 'All Users'),
            const Tab(text: 'Roles'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: const [_ApprovalsTab(), _OverviewTab(), _BusinessesTab(), _AllUsersTab(), _RolesTab()],
      ),
    );
  }
}

// ─────────────────────────── APPROVALS TAB ───────────────────────────
class _ApprovalsTab extends StatelessWidget {
  const _ApprovalsTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final pending = auth.pendingApprovals;

    if (pending.isEmpty) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(color: AppTheme.successGreen.withOpacity(0.1), shape: BoxShape.circle),
            child: const Icon(Icons.verified_rounded, color: AppTheme.successGreen, size: 36),
          ),
          const SizedBox(height: 16),
          const Text('All caught up!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppTheme.textDark)),
          const SizedBox(height: 6),
          const Text('No pending approvals at this time.', style: TextStyle(color: AppTheme.textGrey, fontSize: 13)),
        ]),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pending.length,
      itemBuilder: (_, i) => _ApprovalCard(user: pending[i]),
    );
  }
}

class _ApprovalCard extends StatelessWidget {
  final AppUser user;
  const _ApprovalCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final isPolice = user.role == UserRole.police;
    final color = isPolice ? const Color(0xFF0D47A1) : AppTheme.successGreen;
    final icon = isPolice ? Icons.local_police_rounded : Icons.account_balance_rounded;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.orange.withOpacity(0.3), width: 1.5),
        boxShadow: [BoxShadow(color: Colors.orange.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Header
          Row(children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppTheme.textDark)),
              const SizedBox(height: 3),
              Text('@${user.username}', style: const TextStyle(color: AppTheme.textGrey, fontSize: 12)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.orange.withOpacity(0.3))),
              child: const Text('PENDING', style: TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ),
          ]),
          const SizedBox(height: 12),
          // Info row
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFF5F5F5), borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              _infoRow(Icons.badge_rounded, 'Role', user.roleLabel, color),
              const SizedBox(height: 6),
              _infoRow(Icons.email_outlined, 'Email', user.email, AppTheme.textGrey),
              const SizedBox(height: 6),
              _infoRow(Icons.phone_outlined, 'Phone', user.phone, AppTheme.textGrey),
            ]),
          ),
          const SizedBox(height: 14),
          // Action buttons
          Row(children: [
            Expanded(
              child: _ActionBtn(
                label: 'Reject',
                icon: Icons.close_rounded,
                color: AppTheme.primaryRed,
                onTap: () => _confirm(context, 'Reject "${user.fullName}"?', 'This will deny their access to the platform.', 'Reject', AppTheme.primaryRed, () => auth.rejectUser(user.id)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _ActionBtn(
                label: 'Approve',
                icon: Icons.check_rounded,
                color: AppTheme.successGreen,
                filled: true,
                onTap: () {
                  auth.approveUser(user.id);
                  ScaffoldMessenger.of(context).showSnackBar(_snack('${user.fullName} approved!', AppTheme.successGreen));
                },
              ),
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, Color color) => Row(children: [
    Icon(icon, size: 14, color: color),
    const SizedBox(width: 6),
    Text('$label: ', style: const TextStyle(fontSize: 12, color: AppTheme.textGrey)),
    Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textDark), overflow: TextOverflow.ellipsis)),
  ]);

  void _confirm(BuildContext ctx, String title, String msg, String action, Color color, VoidCallback onConfirm) {
    showDialog(context: ctx, builder: (_) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      content: Text(msg, style: const TextStyle(color: AppTheme.textGrey)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        TextButton(
          onPressed: () { Navigator.pop(ctx); onConfirm(); ScaffoldMessenger.of(ctx).showSnackBar(_snack('$action applied.', color)); },
          child: Text(action, style: TextStyle(color: color, fontWeight: FontWeight.w800)),
        ),
      ],
    ));
  }
}

// ─────────────────────────── OVERVIEW TAB ───────────────────────────
class _OverviewTab extends StatelessWidget {
  const _OverviewTab();
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final users = auth.allUsers;
    final biz = users.where((u) => u.role == UserRole.business).toList();
    final pending = auth.pendingApprovals.length;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (pending > 0) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.orange.withOpacity(0.08), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.orange.withOpacity(0.3))),
            child: Row(children: [
              const Icon(Icons.pending_actions_rounded, color: Colors.orange, size: 22),
              const SizedBox(width: 10),
              Expanded(child: Text('$pending account${pending > 1 ? 's' : ''} awaiting your approval', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.w700, fontSize: 13))),
            ]),
          ),
          const SizedBox(height: 14),
        ],
        const Text('Platform Statistics', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppTheme.textDark)),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.8,
          children: [
            _statCard('${users.length}', 'Total Users', Icons.people_outline, AppTheme.infoBlue),
            _statCard('${biz.length}', 'Businesses', Icons.store_outlined, AppTheme.highOrange),
            _statCard('${users.where((u) => u.role == UserRole.police).length}', 'Police', Icons.local_police_outlined, const Color(0xFF0D47A1)),
            _statCard('${users.where((u) => u.role == UserRole.cityAdmin).length}', 'City Admins', Icons.account_balance_outlined, AppTheme.successGreen),
            _statCard('${users.where((u) => u.isActive).length}', 'Active', Icons.check_circle_outline, AppTheme.successGreen),
            _statCard('$pending', 'Pending', Icons.pending_outlined, Colors.orange),
            _statCard('${users.where((u) => !u.isActive).length}', 'Banned', Icons.block_outlined, AppTheme.primaryRed),
            _statCard('${biz.where((u) => u.subscriptionTier == 'premium').length}', 'Premium Biz', Icons.star_outline, AppTheme.highOrange),
          ],
        ),
        const SizedBox(height: 20),
        const Text('All Accounts', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        const SizedBox(height: 10),
        ...users.map((u) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(backgroundColor: AppTheme.roleColor(u.roleKey).withOpacity(0.15), child: Text(u.fullName[0], style: TextStyle(color: AppTheme.roleColor(u.roleKey), fontWeight: FontWeight.bold))),
            title: Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            subtitle: Text('${u.roleLabel} • @${u.username}', style: const TextStyle(fontSize: 11)),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              if (!u.isApproved && u.needsApproval) _chip('Pending', Colors.orange),
              if (!u.isActive) _chip('Banned', AppTheme.primaryRed),
              const SizedBox(width: 4),
              Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: AppTheme.roleColor(u.roleKey).withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Text(u.roleLabel, style: TextStyle(fontSize: 10, color: AppTheme.roleColor(u.roleKey), fontWeight: FontWeight.bold))),
            ]),
          ),
        )),
      ]),
    );
  }

  Widget _chip(String label, Color color) => Container(margin: const EdgeInsets.only(right: 4), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)), child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w800)));

  Widget _statCard(String value, String label, IconData icon, Color color) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.2))),
    child: Row(children: [
      Icon(icon, color: color, size: 26),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textGrey)),
      ]),
    ]),
  );
}

// ─────────────────────────── BUSINESSES TAB ───────────────────────────
class _BusinessesTab extends StatelessWidget {
  const _BusinessesTab();
  @override
  Widget build(BuildContext context) {
    final businesses = context.watch<AuthProvider>().businesses;
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: businesses.length,
      itemBuilder: (_, i) {
        final biz = businesses[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              CircleAvatar(backgroundColor: AppTheme.highOrange.withOpacity(0.1), child: const Icon(Icons.storefront, color: AppTheme.highOrange)),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(biz.businessName ?? biz.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('${biz.businessCategory ?? "N/A"} • @${biz.username}', style: const TextStyle(fontSize: 11, color: AppTheme.textGrey)),
              ])),
              _planBadge(biz.subscriptionTier ?? 'free'),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              _statusBadge(biz.isVerified, biz.isActive),
              const Spacer(),
              _actionButton('Verify', Icons.verified_outlined, AppTheme.successGreen, biz.isVerified ? null : () => context.read<AuthProvider>().updateUser(biz.id, isVerified: true)),
              const SizedBox(width: 6),
              _actionButton(biz.isActive ? 'Ban' : 'Unban', biz.isActive ? Icons.block_outlined : Icons.check_circle_outline, biz.isActive ? AppTheme.primaryRed : AppTheme.successGreen,
                () => biz.isActive ? context.read<AuthProvider>().banUser(biz.id) : context.read<AuthProvider>().unbanUser(biz.id)),
              const SizedBox(width: 6),
              PopupMenuButton<String>(
                onSelected: (tier) => context.read<AuthProvider>().updateUser(biz.id, subscriptionTier: tier),
                icon: const Icon(Icons.more_vert, size: 18),
                itemBuilder: (_) => ['free', 'basic', 'premium'].map((t) => PopupMenuItem(value: t, child: Text('Set ${t[0].toUpperCase()}${t.substring(1)}'))).toList(),
              ),
            ]),
          ])),
        );
      },
    );
  }

  Widget _planBadge(String tier) {
    final colors = {'free': AppTheme.textGrey, 'basic': AppTheme.infoBlue, 'premium': AppTheme.highOrange};
    final color = colors[tier] ?? AppTheme.textGrey;
    return Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.3))),
      child: Text('${tier[0].toUpperCase()}${tier.substring(1)}', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)));
  }

  Widget _statusBadge(bool isVerified, bool isActive) {
    if (!isActive) return _badge('Banned', AppTheme.primaryRed);
    if (!isVerified) return _badge('Unverified', Colors.orange);
    return _badge('Active & Verified', AppTheme.successGreen);
  }

  Widget _badge(String label, Color color) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)));

  Widget _actionButton(String label, IconData icon, Color color, VoidCallback? onTap) => GestureDetector(
    onTap: onTap,
    child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: (onTap == null ? Colors.grey : color).withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: (onTap == null ? Colors.grey : color).withOpacity(0.3))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 13, color: onTap == null ? Colors.grey : color), const SizedBox(width: 3), Text(label, style: TextStyle(fontSize: 11, color: onTap == null ? Colors.grey : color, fontWeight: FontWeight.w600))])),
  );
}

// ─────────────────────────── ALL USERS TAB ───────────────────────────
class _AllUsersTab extends StatefulWidget {
  const _AllUsersTab();
  @override
  State<_AllUsersTab> createState() => _AllUsersTabState();
}

class _AllUsersTabState extends State<_AllUsersTab> {
  UserRole? _filter;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final users = _filter == null ? auth.allUsers : auth.getUsersByRole(_filter!);
    return Column(children: [
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          _filterChip(null, 'All'),
          ...UserRole.values.map((r) => _filterChip(r, AppUser(id: '', username: '', password: '', fullName: '', email: '', phone: '', role: r, createdAt: DateTime.now()).roleLabel)),
        ]),
      ),
      Expanded(child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: users.length,
        itemBuilder: (_, i) {
          final user = users[i];
          final color = AppTheme.roleColor(user.roleKey);
          final isSuperAdmin = user.role == UserRole.superAdmin;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(children: [
                CircleAvatar(
                  backgroundColor: color.withOpacity(0.15),
                  child: Text(user.fullName[0], style: TextStyle(color: color, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppTheme.textDark)),
                  const SizedBox(height: 2),
                  Text('@${user.username} · ${user.email}', style: const TextStyle(fontSize: 11, color: AppTheme.textGrey), overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Row(children: [
                    _rolePill(user.roleLabel, color),
                    const SizedBox(width: 4),
                    if (!user.isApproved && user.needsApproval) _statusPill('Pending', Colors.orange),
                    if (!user.isActive) _statusPill('Banned', AppTheme.primaryRed),
                  ]),
                ])),
                // Actions
                if (!isSuperAdmin) Row(mainAxisSize: MainAxisSize.min, children: [
                  // Approve/Reject for pending police/cityAdmin
                  if (user.needsApproval && !user.isApproved) ...[
                    _iconBtn(Icons.check_circle_outline, AppTheme.successGreen, () => auth.approveUser(user.id), tooltip: 'Approve'),
                    _iconBtn(Icons.cancel_outlined, Colors.orange, () => auth.rejectUser(user.id), tooltip: 'Reject'),
                  ],
                  // Ban/Unban
                  _iconBtn(
                    user.isActive ? Icons.block_rounded : Icons.check_circle_rounded,
                    user.isActive ? Colors.orange : AppTheme.successGreen,
                    () => _confirmAction(context, user.isActive ? 'Ban ${user.fullName}?' : 'Unban ${user.fullName}?',
                      user.isActive ? 'They will lose access immediately.' : 'They will regain access.',
                      user.isActive ? 'Ban' : 'Unban',
                      user.isActive ? Colors.orange : AppTheme.successGreen,
                      () => user.isActive ? auth.banUser(user.id) : auth.unbanUser(user.id)),
                    tooltip: user.isActive ? 'Ban' : 'Unban',
                  ),
                  // Delete
                  _iconBtn(Icons.delete_rounded, AppTheme.primaryRed,
                    () => _confirmAction(context, 'Delete ${user.fullName}?', 'This action cannot be undone.', 'Delete', AppTheme.primaryRed, () => auth.deleteUser(user.id)),
                    tooltip: 'Delete'),
                ]),
              ]),
            ),
          );
        },
      )),
    ]);
  }

  Widget _rolePill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
    child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
  );

  Widget _statusPill(String label, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: color.withOpacity(0.3))),
    child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
  );

  Widget _filterChip(UserRole? role, String label) {
    final sel = _filter == role;
    return GestureDetector(
      onTap: () => setState(() => _filter = role),
      child: Container(margin: const EdgeInsets.only(right: 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: sel ? AppTheme.primaryRed : AppTheme.background, borderRadius: BorderRadius.circular(16), border: Border.all(color: sel ? AppTheme.primaryRed : AppTheme.borderGrey)),
        child: Text(label, style: TextStyle(color: sel ? Colors.white : AppTheme.textDark, fontSize: 12, fontWeight: sel ? FontWeight.bold : FontWeight.normal))),
    );
  }

  Widget _iconBtn(IconData icon, Color color, VoidCallback onTap, {String? tooltip}) => Tooltip(
    message: tooltip ?? '',
    child: InkWell(
      onTap: onTap, borderRadius: BorderRadius.circular(8),
      child: Container(margin: const EdgeInsets.only(left: 4), padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 18, color: color)),
    ),
  );

  void _confirmAction(BuildContext ctx, String title, String msg, String action, Color color, VoidCallback onConfirm) {
    showDialog(context: ctx, builder: (_) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      content: Text(msg, style: const TextStyle(color: AppTheme.textGrey)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        TextButton(
          onPressed: () { Navigator.pop(ctx); onConfirm(); ScaffoldMessenger.of(ctx).showSnackBar(_snack('$action applied.', color)); },
          child: Text(action, style: TextStyle(color: color, fontWeight: FontWeight.w800)),
        ),
      ],
    ));
  }
}

// ─────────────────────────── ROLES TAB ───────────────────────────
class _RolesTab extends StatelessWidget {
  const _RolesTab();
  static const _roles = [
    ('Super Admin', UserRole.superAdmin, Icons.admin_panel_settings, ['Approve/reject police & city admin accounts', 'Ban or remove any user', 'Manage all businesses & subscriptions', 'View all platform alerts', 'System configuration & RBAC']),
    ('Police', UserRole.police, Icons.local_police, ['Requires admin approval to access', 'Post VIP movement alerts', 'Report road blockages', 'Mark alerts as cleared', 'View all city alerts']),
    ('City Admin', UserRole.cityAdmin, Icons.account_balance, ['Requires admin approval to access', 'Publish announcements', 'Post holidays & closures', 'Manage city events', 'Emergency notifications']),
    ('Business', UserRole.business, Icons.storefront, ['Create & manage offers', 'View offer analytics', 'Set offer radius', 'Manage promo codes', 'Subscription management']),
    ('User', UserRole.user, Icons.person, ['View all alerts', 'Browse offers nearby', 'Report traffic issues', 'Save favourite routes', 'Receive notifications']),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _roles.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final (name, role, icon, perms) = _roles[i];
        final color = AppTheme.roleColor(AppUser(id: '', username: '', password: '', fullName: '', email: '', phone: '', role: role, createdAt: DateTime.now()).roleKey);
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ExpansionTile(
            leading: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: color)),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('${perms.length} permissions', style: const TextStyle(fontSize: 12, color: AppTheme.textGrey)),
            children: perms.map((p) => ListTile(
              dense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 20),
              leading: Icon(p.startsWith('Requires') ? Icons.lock_rounded : Icons.check_circle, color: p.startsWith('Requires') ? Colors.orange : AppTheme.successGreen, size: 16),
              title: Text(p, style: const TextStyle(fontSize: 13)),
            )).toList(),
          ),
        );
      },
    );
  }
}

// ─────────────────────────── SHARED HELPERS ───────────────────────────
SnackBar _snack(String msg, Color color) => SnackBar(
  content: Row(children: [const Icon(Icons.check_circle, color: Colors.white, size: 18), const SizedBox(width: 8), Text(msg, style: const TextStyle(fontWeight: FontWeight.w600))]),
  backgroundColor: color,
  behavior: SnackBarBehavior.floating,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
);

class _ActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool filled;
  final VoidCallback onTap;
  const _ActionBtn({required this.label, required this.icon, required this.color, required this.onTap, this.filled = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: BoxDecoration(
          color: filled ? color : color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: filled ? color : color.withOpacity(0.3), width: 1.5),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, color: filled ? Colors.white : color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(color: filled ? Colors.white : color, fontWeight: FontWeight.w800, fontSize: 13)),
        ]),
      ),
    );
  }
}
