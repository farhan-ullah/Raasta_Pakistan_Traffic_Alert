import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/raasta_widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _bizNameCtrl = TextEditingController();
  UserRole _role = UserRole.user;
  String? _bizCategory;
  bool _loading = false;
  bool _obscure = true;
  int _step = 0;
  String? _error;

  late AnimationController _stepCtrl;
  late Animation<double> _stepAnim;

  final List<String> _bizCategories = [
    'Restaurant',
    'Fast Food',
    'Shopping Mall',
    'Pharmacy',
    'Petrol Station',
    'Hotel',
    'Bank / ATM',
    'Hospital / Clinic',
    'Auto Workshop',
    'Grocery Store',
    'Bakery',
    'Café',
    'Salon / Spa',
    'Electronics',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    _stepCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _stepAnim = CurvedAnimation(parent: _stepCtrl, curve: Curves.easeInOut);
    _stepCtrl.forward();
  }

  @override
  void dispose() {
    _stepCtrl.dispose();
    for (final c in [
      _userCtrl,
      _passCtrl,
      _nameCtrl,
      _emailCtrl,
      _phoneCtrl,
      _bizNameCtrl,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _next() {
    if (_formKey.currentState!.validate()) {
      setState(() {
        _step = 1;
      });
      _stepCtrl.forward(from: 0);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    final err = await context.read<AuthProvider>().register(
      username: _userCtrl.text.trim(),
      password: _passCtrl.text,
      fullName: _nameCtrl.text.trim(),
      email: _emailCtrl.text.trim(),
      phone: _phoneCtrl.text.trim(),
      role: _role,
      businessName: _role == UserRole.business
          ? _bizNameCtrl.text.trim()
          : null,
      businessCategory: _role == UserRole.business ? _bizCategory : null,
    );
    if (!mounted) return;
    setState(() {
      _loading = false;
      _error = err;
    });
    if (err == null) {
      if (_role == UserRole.business) {
        _showSuccess();
      } else {
        Navigator.pop(context);
      }
    }
  }

  void _showSuccess() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      builder: (_) => Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.successGreen.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppTheme.successGreen,
                size: 44,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Application Submitted!',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Your business account is pending admin review. You\'ll be notified once approved.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.textGrey,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            RaastButton(
              colors: [AppTheme.successGreen, const Color(0xFF1B5E20)],
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text(
                'Got it!',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: Column(
        children: [
          // Header
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF4A0000), Color(0xFFD32F2F)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
            ),
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: () => Navigator.pop(context),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          'Create Account',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _StepIndicator(
                      steps: _role == UserRole.business ? 2 : 1,
                      current: _step,
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Form
          Expanded(
            child: Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 350),
                  transitionBuilder: (child, anim) => FadeTransition(
                    opacity: anim,
                    child: SlideTransition(
                      position: Tween(
                        begin: const Offset(0.1, 0),
                        end: Offset.zero,
                      ).animate(anim),
                      child: child,
                    ),
                  ),
                  child: _step == 0
                      ? Column(
                          key: const ValueKey('step0'),
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: _step0(),
                        )
                      : Column(
                          key: const ValueKey('step1'),
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: _step1(),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _step0() => [
    const SizedBox(height: 8),
    const Text(
      'Personal Info',
      style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: AppTheme.textDark,
      ),
    ),
    const Text(
      'Tell us about yourself',
      style: TextStyle(color: AppTheme.textGrey, fontSize: 14),
    ),
    const SizedBox(height: 22),
    _RegField(
      controller: _nameCtrl,
      label: 'Full Name',
      icon: Icons.person_rounded,
      validator: (v) => v!.isEmpty ? 'Required' : null,
    ),
    const SizedBox(height: 12),
    _RegField(
      controller: _emailCtrl,
      label: 'Email Address',
      icon: Icons.email_rounded,
      keyboard: TextInputType.emailAddress,
      validator: (v) => v!.isEmpty ? 'Required' : null,
    ),
    const SizedBox(height: 12),
    _RegField(
      controller: _phoneCtrl,
      label: 'Phone Number',
      icon: Icons.phone_rounded,
      keyboard: TextInputType.phone,
      validator: (v) => v!.isEmpty ? 'Required' : null,
    ),
    const SizedBox(height: 12),
    _RegField(
      controller: _userCtrl,
      label: 'Username',
      icon: Icons.alternate_email_rounded,
      validator: (v) => v!.isEmpty ? 'Required' : null,
    ),
    const SizedBox(height: 12),
    _RegField(
      controller: _passCtrl,
      label: 'Password',
      icon: Icons.lock_rounded,
      obscure: _obscure,
      suffix: IconButton(
        icon: Icon(
          _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
          color: AppTheme.textGrey,
        ),
        onPressed: () => setState(() => _obscure = !_obscure),
      ),
      validator: (v) => v!.length < 6 ? 'Min 6 characters' : null,
    ),
    const SizedBox(height: 24),
    const Text(
      'Account Type',
      style: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        color: AppTheme.textDark,
      ),
    ),
    const SizedBox(height: 4),
    const Text(
      'Choose how you\'ll use Raasta',
      style: TextStyle(color: AppTheme.textGrey, fontSize: 13),
    ),
    const SizedBox(height: 14),
    RoleCard(
      icon: Icons.directions_car_rounded,
      title: 'Commuter',
      subtitle: 'Get traffic alerts & offers on the go',
      color: const Color(0xFF546E7A),
      selected: _role == UserRole.user,
      onTap: () => setState(() => _role = UserRole.user),
    ),
    const SizedBox(height: 10),
    RoleCard(
      icon: Icons.storefront_rounded,
      title: 'Business',
      subtitle: 'Post exclusive offers to nearby commuters',
      color: AppTheme.roleColor('business'),
      selected: _role == UserRole.business,
      onTap: () => setState(() => _role = UserRole.business),
    ),
    const SizedBox(height: 10),
    RoleCard(
      icon: Icons.local_police_rounded,
      title: 'Police Officer',
      subtitle: 'Report VIP movements & road blockages',
      color: AppTheme.roleColor('police'),
      selected: _role == UserRole.police,
      onTap: () => setState(() => _role = UserRole.police),
    ),
    if (_error != null) ...[const SizedBox(height: 16), _ErrorBox(_error!)],
    const SizedBox(height: 24),
    RaastLoadingButton(
      label: _role == UserRole.business ? 'Continue →' : 'Create Account',
      loading: _loading,
      onPressed: _role == UserRole.business ? _next : _submit,
    ),
  ];

  List<Widget> _step1() => [
    const SizedBox(height: 8),
    const Text(
      'Business Info',
      style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: AppTheme.textDark,
      ),
    ),
    const Text(
      'Almost there — just a few more details',
      style: TextStyle(color: AppTheme.textGrey, fontSize: 14),
    ),
    const SizedBox(height: 22),
    _RegField(
      controller: _bizNameCtrl,
      label: 'Business Name',
      icon: Icons.store_rounded,
      validator: (v) => v!.isEmpty ? 'Required' : null,
    ),
    const SizedBox(height: 14),
    Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE), width: 1.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: DropdownButtonFormField<String>(
        value: _bizCategory,
        decoration: const InputDecoration(
          labelText: 'Business Category',
          prefixIcon: Icon(Icons.category_rounded),
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(vertical: 16),
        ),
        items: _bizCategories
            .map(
              (c) => DropdownMenuItem(
                value: c,
                child: Text(c, style: const TextStyle(fontSize: 15)),
              ),
            )
            .toList(),
        onChanged: (v) => setState(() => _bizCategory = v),
        validator: (v) => v == null ? 'Select a category' : null,
        isExpanded: true,
        dropdownColor: Colors.white,
      ),
    ),
    const SizedBox(height: 20),
    // Plans comparison
    Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFF8E1), Color(0xFFFFF3E0)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFCC02).withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.info_outline_rounded,
                color: Color(0xFFE65100),
                size: 18,
              ),
              SizedBox(width: 8),
              Text(
                'Plan Options',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFE65100),
                  fontSize: 15,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _PlanRow('Free Plan', [
            'Up to 3 offers',
            '2 km commuter radius',
            'Basic analytics',
          ]),
          const SizedBox(height: 10),
          _PlanRow('Premium Plan', [
            'Unlimited offers',
            '10 km commuter radius',
            'Full analytics & insights',
          ], premium: true),
        ],
      ),
    ),
    if (_error != null) ...[const SizedBox(height: 16), _ErrorBox(_error!)],
    const SizedBox(height: 24),
    Row(
      children: [
        Expanded(
          child: RaastButton(
            height: 54,
            outlined: true,
            colors: [AppTheme.primaryRed, AppTheme.primaryRed],
            onPressed: () => setState(() {
              _step = 0;
              _stepCtrl.forward(from: 0);
            }),
            child: const Text(
              '← Back',
              style: TextStyle(
                color: AppTheme.primaryRed,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: RaastLoadingButton(
            label: 'Register',
            loading: _loading,
            onPressed: _submit,
          ),
        ),
      ],
    ),
  ];
}

class _StepIndicator extends StatelessWidget {
  final int steps, current;
  const _StepIndicator({required this.steps, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (int i = 0; i < steps; i++) ...[
          Expanded(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              height: 4,
              decoration: BoxDecoration(
                color: i <= current
                    ? Colors.white
                    : Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          if (i < steps - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }
}

class _RegField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final TextInputType? keyboard;
  final String? Function(String?)? validator;

  const _RegField({
    required this.controller,
    required this.label,
    required this.icon,
    this.obscure = false,
    this.suffix,
    this.keyboard,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      validator: validator,
      keyboardType: keyboard,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppTheme.textDark,
      ),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20, color: AppTheme.textGrey),
        suffixIcon: suffix,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFEEEEEE), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.primaryRed, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.criticalRed),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 18,
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;
  const _ErrorBox(this.message);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEBEE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFEF9A9A)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppTheme.criticalRed,
            size: 18,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppTheme.criticalRed, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanRow extends StatelessWidget {
  final String title;
  final List<String> features;
  final bool premium;
  const _PlanRow(this.title, this.features, {this.premium = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: premium ? const Color(0xFFE65100) : Colors.grey.shade400,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: features
                .map(
                  (f) => Row(
                    children: [
                      Icon(
                        Icons.check_rounded,
                        size: 14,
                        color: premium
                            ? const Color(0xFFE65100)
                            : Colors.grey.shade500,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        f,
                        style: TextStyle(
                          fontSize: 12,
                          color: premium
                              ? const Color(0xFFE65100)
                              : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }
}
