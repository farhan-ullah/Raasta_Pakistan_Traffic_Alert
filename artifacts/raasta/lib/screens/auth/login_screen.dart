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
    final size = MediaQuery.sizeOf(context);
    final viewInsets = MediaQuery.viewInsetsOf(context);
    final keyboardOpen = viewInsets.bottom > 0;
    final navBarClearance = widget.showAsModal ? 88.0 : 0.0;
    final scrollBottomPad = viewInsets.bottom + navBarClearance + 16;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: const Color(0xFF2A0000),
      body: Stack(
        children: [
          // Full background gradient
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFF1A0000),
                  Color(0xFF5C0005),
                  Color(0xFF8B0007),
                  Color(0xFFB71C1C),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                stops: [0.0, 0.35, 0.7, 1.0],
              ),
            ),
          ),
          // Ambient orbs
          Positioned(top: -60, right: -70, child: _Orb(200, 0.07)),
          Positioned(top: 80, right: 40, child: _Orb(100, 0.10)),
          Positioned(top: 160, left: -50, child: _Orb(150, 0.06)),
          Positioned(
            bottom: size.height * 0.35,
            right: -20,
            child: _Orb(90, 0.05),
          ),
          // Subtle traffic icons in header
          Positioned(
            top: 40,
            left: 24,
            child: Icon(
              Icons.traffic_rounded,
              size: 48,
              color: Colors.white.withOpacity(0.06),
            ),
          ),
          Positioned(
            top: 100,
            right: 28,
            child: Icon(
              Icons.route_rounded,
              size: 36,
              color: Colors.white.withOpacity(0.05),
            ),
          ),
          // Main content
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: FadeTransition(
                  opacity: _fadeAnim,
                  child: SlideTransition(
                    position: _slideAnim,
                    child: Column(
                      children: [
                        // Logo area — collapse when keyboard is open
                        AnimatedCrossFade(
                          duration: const Duration(milliseconds: 250),
                          crossFadeState: keyboardOpen
                              ? CrossFadeState.showSecond
                              : CrossFadeState.showFirst,
                          firstChild: Container(
                            constraints: BoxConstraints(
                              minHeight: widget.showAsModal ? 120 : 170,
                              maxHeight: size.height * 0.28,
                            ),
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
                                    width: 96,
                                    height: 96,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.white.withOpacity(0.15),
                                          blurRadius: 24,
                                          spreadRadius: 2,
                                        ),
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.25),
                                          blurRadius: 32,
                                          offset: const Offset(0, 12),
                                        ),
                                      ],
                                    ),
                                    child: Container(
                                      margin: const EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        gradient: LinearGradient(
                                          colors: [
                                            Colors.white.withOpacity(0.35),
                                            Colors.white.withOpacity(0.08),
                                          ],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        ),
                                        border: Border.all(
                                          color: Colors.white.withOpacity(0.55),
                                          width: 2.5,
                                        ),
                                      ),
                                      child: ClipOval(
                                        child: Padding(
                                          padding: const EdgeInsets.all(6),
                                          child: Image.asset(
                                            'assets/images/icon.png',
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 18),
                                ShaderMask(
                                  shaderCallback: (bounds) =>
                                      const LinearGradient(
                                        colors: [
                                          Colors.white,
                                          Color(0xFFFFCDD2),
                                        ],
                                      ).createShader(bounds),
                                  child: const Text(
                                    'Raasta',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 40,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 4,
                                      height: 1,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(24),
                                    border: Border.all(
                                      color: Colors.white.withOpacity(0.22),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        Icons.location_on_rounded,
                                        size: 13,
                                        color: Colors.white.withOpacity(0.9),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'راستہ  ·  Pakistan Traffic',
                                        style: TextStyle(
                                          color: Colors.white.withOpacity(0.95),
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          letterSpacing: 0.8,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          secondChild: const SizedBox(height: 8),
                        ),
                        // Floating form card
                        Expanded(
                          child: Container(
                            margin: EdgeInsets.fromLTRB(
                              16,
                              0,
                              16,
                              keyboardOpen ? 8 : 16,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.18),
                                  blurRadius: 40,
                                  offset: const Offset(0, -8),
                                ),
                                BoxShadow(
                                  color: AppTheme.primaryRed.withOpacity(0.08),
                                  blurRadius: 24,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(28),
                              child: SingleChildScrollView(
                                keyboardDismissBehavior:
                                    ScrollViewKeyboardDismissBehavior.onDrag,
                                padding: EdgeInsets.fromLTRB(
                                  24,
                                  keyboardOpen ? 8 : 12,
                                  24,
                                  scrollBottomPad,
                                ),
                                child: Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Center(
                                        child: Container(
                                          width: 40,
                                          height: 4,
                                          margin: const EdgeInsets.only(
                                            bottom: 20,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.grey.shade200,
                                            borderRadius: BorderRadius.circular(
                                              2,
                                            ),
                                          ),
                                        ),
                                      ),
                                      Row(
                                        children: [
                                          Container(
                                            width: 4,
                                            height: 44,
                                            decoration: BoxDecoration(
                                              gradient:
                                                  AppTheme.primaryGradient,
                                              borderRadius:
                                                  BorderRadius.circular(2),
                                            ),
                                          ),
                                          const SizedBox(width: 14),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Welcome Back',
                                                  style: TextStyle(
                                                    fontSize: 26,
                                                    fontWeight: FontWeight.w900,
                                                    color: AppTheme.textDark,
                                                    letterSpacing: -0.5,
                                                  ),
                                                ),
                                                const SizedBox(height: 3),
                                                Text(
                                                  'Sign in to stay on the right road',
                                                  style: TextStyle(
                                                    color: AppTheme.textGrey
                                                        .withOpacity(0.9),
                                                    fontSize: 14,
                                                    height: 1.3,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Text(
                                            '👋',
                                            style: TextStyle(fontSize: 28),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 26),
                                      _Field(
                                        controller: _userCtrl,
                                        label: 'Username',
                                        hint: 'Enter your username',
                                        icon: Icons.person_outline_rounded,
                                        scrollPadding: scrollBottomPad + 80,
                                        validator: (v) => v!.isEmpty
                                            ? 'Enter your username'
                                            : null,
                                      ),
                                      const SizedBox(height: 14),
                                      _Field(
                                        controller: _passCtrl,
                                        label: 'Password',
                                        hint: 'Enter your password',
                                        icon: Icons.lock_outline_rounded,
                                        scrollPadding: scrollBottomPad + 80,
                                        obscure: _obscure,
                                        suffixIcon: IconButton(
                                          icon: Icon(
                                            _obscure
                                                ? Icons.visibility_outlined
                                                : Icons.visibility_off_outlined,
                                            color: AppTheme.textGrey,
                                          ),
                                          onPressed: () => setState(
                                            () => _obscure = !_obscure,
                                          ),
                                        ),
                                        validator: (v) => v!.isEmpty
                                            ? 'Enter your password'
                                            : null,
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
                                            builder: (_) =>
                                                const RegisterScreen(),
                                          ),
                                        ),
                                        child: const Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.person_add_outlined,
                                              color: AppTheme.primaryRed,
                                              size: 20,
                                            ),
                                            SizedBox(width: 8),
                                            Text(
                                              'Create New Account',
                                              style: TextStyle(
                                                color: AppTheme.primaryRed,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 15,
                                              ),
                                            ),
                                          ],
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
                        ),
                      ],
                    ),
                  ),
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
            color: const Color(0xFFFAFAFA),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.borderGrey, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryRed.withOpacity(0.04),
                blurRadius: 12,
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
  final double scrollPadding;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;

  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.obscure = false,
    this.scrollPadding = 120,
    this.suffixIcon,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppTheme.textDark,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscure,
          validator: validator,
          scrollPadding: EdgeInsets.only(bottom: scrollPadding),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: AppTheme.textDark,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: AppTheme.textGrey.withOpacity(0.7),
              fontWeight: FontWeight.w400,
            ),
            prefixIcon: Padding(
              padding: const EdgeInsets.only(left: 14, right: 8),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppTheme.primaryRed.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppTheme.primaryRed, size: 20),
              ),
            ),
            prefixIconConstraints: const BoxConstraints(
              minWidth: 62,
              minHeight: 48,
            ),
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: const Color(0xFFFAFAFA),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(
                color: AppTheme.borderGrey,
                width: 1.5,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(
                color: AppTheme.primaryRed,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppTheme.criticalRed),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(
                color: AppTheme.criticalRed,
                width: 2,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 18,
            ),
          ),
        ),
      ],
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
      shape: BoxShape.circle,
      gradient: RadialGradient(
        colors: [
          Colors.white.withOpacity(opacity * 2.5),
          Colors.white.withOpacity(opacity * 0.3),
          Colors.transparent,
        ],
        stops: const [0.0, 0.5, 1.0],
      ),
    ),
  );
}
