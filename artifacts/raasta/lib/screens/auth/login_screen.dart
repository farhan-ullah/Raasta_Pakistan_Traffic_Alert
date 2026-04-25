import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:raasta/models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  final bool showAsModal;
  const LoginScreen({super.key, this.showAsModal = false});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;
  UserRole _selectedRole = UserRole.user;

  late AnimationController _iconCtrl;
  late AnimationController _slideCtrl;
  late Animation<double> _iconFloat;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _iconCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
    _iconFloat = Tween(
      begin: -10.0,
      end: 10.0,
    ).animate(CurvedAnimation(parent: _iconCtrl, curve: Curves.easeInOut));

    _slideCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _slideAnim = Tween(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOutCubic));
    _fadeAnim = Tween(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _slideCtrl, curve: Curves.easeOut));
    _slideCtrl.forward();
  }

  @override
  void dispose() {
    _iconCtrl.dispose();
    _slideCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      final err = await context.read<AuthProvider>().login(
        _userCtrl.text.trim(),
        _passCtrl.text,
        _selectedRole,
      );
      if (!mounted) return;
      setState(() {
        _error = err;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _fillDemo(String user, String pass) {
    setState(() {
      _userCtrl.text = user;
      _passCtrl.text = pass;
    });
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      body: Stack(
        children: [
          // Background gradient
          Container(
            height: size.height * 0.50,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFF3A0000),
                  Color(0xFF8B0007),
                  Color(0xFFC62828),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          // Circle decorations
          Positioned(top: -40, right: -50, child: _Orb(140, 0.06)),
          Positioned(top: 60, right: 60, child: _Orb(80, 0.09)),
          Positioned(top: 120, left: -30, child: _Orb(120, 0.05)),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              height: size.height * 0.46,
              color: const Color(0xFFF8F9FA),
            ),
          ),
          // Main content
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: Column(
                  children: [
                    // Logo area
                    SizedBox(
                      height: size.height * 0.24,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AnimatedBuilder(
                            animation: _iconFloat,
                            builder: (_, child) => Transform.translate(
                              offset: Offset(0, _iconFloat.value),
                              child: child,
                            ),
                            child: Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white.withOpacity(0.5),
                                  width: 2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 30,
                                    spreadRadius: 5,
                                  ),
                                ],
                              ),
                              child: ClipOval(
                                child: Padding(
                                  padding: const EdgeInsets.all(4.0),
                                  child: Image.asset(
                                    'assets/images/icon.png',
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Raasta',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 36,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 3,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'راستہ  ·  Pakistan Traffic',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Form card
                    Expanded(
                      child: Container(
                        decoration: const BoxDecoration(
                          color: Color(0xFFF8F9FA),
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(32),
                          ),
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Text(
                                  'Welcome Back 👋',
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.textDark,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Sign in to stay on the right road',
                                  style: TextStyle(
                                    color: AppTheme.textGrey,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                _Field(
                                  controller: _userCtrl,
                                  label: 'Username',
                                  hint: 'Enter your username',
                                  icon: Icons.person_outline_rounded,
                                  validator: (v) =>
                                      v!.isEmpty ? 'Enter your username' : null,
                                ),
                                const SizedBox(height: 14),
                                _Field(
                                  controller: _passCtrl,
                                  label: 'Password',
                                  hint: 'Enter your password',
                                  icon: Icons.lock_outline_rounded,
                                  obscure: _obscure,
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscure
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                      color: AppTheme.textGrey,
                                    ),
                                    onPressed: () =>
                                        setState(() => _obscure = !_obscure),
                                  ),
                                  validator: (v) =>
                                      v!.isEmpty ? 'Enter your password' : null,
                                ),
                                const SizedBox(height: 14),
                                _RoleDropdown(
                                  value: _selectedRole,
                                  onChanged: (v) =>
                                      setState(() => _selectedRole = v!),
                                ),
                                const SizedBox(height: 12),
                                if (_error != null) ...[
                                  _ErrorBanner(_error!),
                                  const SizedBox(height: 16),
                                ],
                                const SizedBox(height: 16),
                                RaastLoadingButton(
                                  label: 'Sign In',
                                  loading: _loading,
                                  onPressed: _login,
                                ),
                                const SizedBox(height: 16),
                                RaastButton(
                                  height: 54,
                                  outlined: true,
                                  colors: [
                                    AppTheme.primaryRed,
                                    AppTheme.primaryRed,
                                  ],
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const RegisterScreen(),
                                    ),
                                  ),
                                  child: const Text(
                                    'Create New Account',
                                    style: TextStyle(
                                      color: AppTheme.primaryRed,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                                if (kDebugMode) ...[
                                  const SizedBox(height: 28),
                                  _DividerLabel('Quick Demo Login'),
                                  const SizedBox(height: 14),
                                  _demoGrid(),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _demoGrid() {
    final demos = [
      _Demo(
        'Super Admin',
        'admin',
        'admin123',
        AppTheme.roleColor('super_admin'),
        Icons.admin_panel_settings_rounded,
      ),
      _Demo(
        'Police',
        'inspector_ali',
        'police123',
        AppTheme.roleColor('police'),
        Icons.local_police_rounded,
      ),
      _Demo(
        'City Admin',
        'cda_official',
        'city123',
        AppTheme.roleColor('city_admin'),
        Icons.account_balance_rounded,
      ),
      _Demo(
        'Business',
        'monal_restaurant',
        'biz123',
        AppTheme.roleColor('business'),
        Icons.storefront_rounded,
      ),
      _Demo(
        'Commuter',
        'sara_commuter',
        'user123',
        const Color(0xFF546E7A),
        Icons.directions_car_rounded,
      ),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: demos
          .map(
            (d) => _DemoChip(demo: d, onTap: () => _fillDemo(d.user, d.pass)),
          )
          .toList(),
    );
  }
}

class _Demo {
  final String label, user, pass;
  final Color color;
  final IconData icon;
  const _Demo(this.label, this.user, this.pass, this.color, this.icon);
}

class _DemoChip extends StatefulWidget {
  final _Demo demo;
  final VoidCallback onTap;
  const _DemoChip({required this.demo, required this.onTap});

  @override
  State<_DemoChip> createState() => _DemoChipState();
}

class _DemoChipState extends State<_DemoChip>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scale = Tween(begin: 1.0, end: 0.92).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.demo;
    return GestureDetector(
      onTapDown: (_) => _ctrl.forward(),
      onTapUp: (_) {
        _ctrl.reverse();
        widget.onTap();
      },
      onTapCancel: () => _ctrl.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) =>
            Transform.scale(scale: _scale.value, child: child),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: d.color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: d.color.withOpacity(0.3), width: 1.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(d.icon, color: d.color, size: 16),
              const SizedBox(width: 7),
              Text(
                d.label,
                style: TextStyle(
                  color: d.color,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleDropdown extends StatelessWidget {
  final UserRole value;
  final ValueChanged<UserRole?> onChanged;

  const _RoleDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Login As',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppTheme.textDark,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: DropdownButtonFormField<UserRole>(
            value: value,
            onChanged: onChanged,
            decoration: const InputDecoration(
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16),
              prefixIcon: Icon(
                Icons.badge_outlined,
                color: AppTheme.primaryRed,
                size: 20,
              ),
            ),
            items: const [
              DropdownMenuItem(
                value: UserRole.user,
                child: Text('Commuter (User)'),
              ),
              DropdownMenuItem(
                value: UserRole.police,
                child: Text('Traffic Police'),
              ),
              DropdownMenuItem(
                value: UserRole.business,
                child: Text('Business Owner'),
              ),
              DropdownMenuItem(
                value: UserRole.cityAdmin,
                child: Text('City Admin'),
              ),
              DropdownMenuItem(
                value: UserRole.superAdmin,
                child: Text('Super Admin'),
              ),
            ],
            icon: const Icon(
              Icons.arrow_drop_down_rounded,
              color: AppTheme.textGrey,
            ),
            dropdownColor: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String label, hint;
  final IconData icon;
  final bool obscure;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;

  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.suffixIcon,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      validator: validator,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: AppTheme.textDark,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon, color: AppTheme.textGrey),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFEEEEEE), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppTheme.primaryRed, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppTheme.criticalRed),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppTheme.criticalRed, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 20,
          vertical: 20,
        ),
        labelStyle: const TextStyle(color: AppTheme.textGrey),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner(this.message);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEBEE),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEF9A9A), width: 1.5),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppTheme.criticalRed,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: AppTheme.criticalRed,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DividerLabel extends StatelessWidget {
  final String label;
  const _DividerLabel(this.label);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1.5)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            label,
            style: TextStyle(
              color: Colors.grey.shade500,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ),
        Expanded(child: Divider(color: Colors.grey.shade300, thickness: 1.5)),
      ],
    );
  }
}

class _Orb extends StatelessWidget {
  final double size;
  final double opacity;
  const _Orb(this.size, this.opacity);

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(opacity),
      shape: BoxShape.circle,
    ),
  );
}
