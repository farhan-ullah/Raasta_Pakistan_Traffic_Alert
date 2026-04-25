import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/route_provider.dart';
import '../theme/app_theme.dart';

/// Pressable animated button with gradient, shadow, and scale feedback
class RaastButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final List<Color>? colors;
  final double height;
  final double radius;
  final bool outlined;
  final EdgeInsets? padding;

  const RaastButton({
    super.key,
    required this.child,
    this.onPressed,
    this.colors,
    this.height = 58,
    this.radius = 18,
    this.outlined = false,
    this.padding,
  });

  @override
  State<RaastButton> createState() => _RaastButtonState();
}

class _RaastButtonState extends State<RaastButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;
  late Animation<double> _glow;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 120));
    _scale = Tween(begin: 1.0, end: 0.93).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _glow = Tween(begin: 0.4, end: 0.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  final List<Color> _defaultColors = const [Color(0xFF7F0000), Color(0xFFD32F2F)];

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onPressed == null;
    final colors = disabled
        ? [Colors.grey.shade400, Colors.grey.shade300]
        : (widget.colors ?? _defaultColors);

    return GestureDetector(
      onTapDown: disabled ? null : (_) => _ctrl.forward(),
      onTapUp: disabled ? null : (_) { _ctrl.reverse(); widget.onPressed?.call(); },
      onTapCancel: disabled ? null : () => _ctrl.reverse(),
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, child) => Transform.scale(
          scale: _scale.value,
          child: Container(
            height: widget.height,
            padding: widget.padding,
            decoration: widget.outlined
                ? BoxDecoration(
                    border: Border.all(color: colors.first, width: 2),
                    borderRadius: BorderRadius.circular(widget.radius),
                    color: colors.first.withOpacity(0.05),
                  )
                : BoxDecoration(
                    gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                    borderRadius: BorderRadius.circular(widget.radius),
                    boxShadow: disabled ? [] : [
                      BoxShadow(color: colors.last.withOpacity(_glow.value + 0.05), blurRadius: 18, offset: const Offset(0, 8)),
                      BoxShadow(color: colors.last.withOpacity(0.15), blurRadius: 6, offset: const Offset(0, 2)),
                    ],
                  ),
            child: Center(child: child),
          ),
        ),
        child: widget.child,
      ),
    );
  }
}

/// Loading-aware button that shows spinner when busy
class RaastLoadingButton extends StatelessWidget {
  final bool loading;
  final VoidCallback? onPressed;
  final String label;
  final List<Color>? colors;
  final double height;

  const RaastLoadingButton({
    super.key,
    required this.label,
    this.loading = false,
    this.onPressed,
    this.colors,
    this.height = 58,
  });

  @override
  Widget build(BuildContext context) {
    return RaastButton(
      onPressed: loading ? null : onPressed,
      colors: colors,
      height: height,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: loading
            ? const SizedBox(
                key: ValueKey('loading'),
                width: 24, height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
              )
            : Text(key: ValueKey('label'), label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 0.3)),
      ),
    );
  }
}

/// Press-animated card that scales on touch
class PressCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? margin;
  final double radius;
  final Color? borderColor;

  const PressCard({
    super.key,
    required this.child,
    this.onTap,
    this.margin,
    this.radius = 16,
    this.borderColor,
  });

  @override
  State<PressCard> createState() => _PressCardState();
}

class _PressCardState extends State<PressCard> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 100));
    _scale = Tween(begin: 1.0, end: 0.97).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.onTap != null ? (_) => _ctrl.forward() : null,
      onTapUp: widget.onTap != null ? (_) { _ctrl.reverse(); widget.onTap?.call(); } : null,
      onTapCancel: widget.onTap != null ? () => _ctrl.reverse() : null,
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(scale: _scale.value, child: child),
        child: Container(
          margin: widget.margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(widget.radius),
            border: Border.all(color: widget.borderColor ?? const Color(0xFFF0F0F0), width: 1),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 16, offset: const Offset(0, 3)),
              BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 1)),
            ],
          ),
          child: widget.child,
        ),
      ),
    );
  }
}

/// Pulsing live indicator dot
class LiveDot extends StatefulWidget {
  final Color color;
  final double size;
  const LiveDot({super.key, this.color = Colors.greenAccent, this.size = 10});

  @override
  State<LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<LiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _anim = Tween(begin: 0.4, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Stack(alignment: Alignment.center, children: [
        Container(
          width: widget.size * 2,
          height: widget.size * 2,
          decoration: BoxDecoration(
            color: widget.color.withOpacity(0.25 * _anim.value),
            shape: BoxShape.circle,
          ),
        ),
        Container(
          width: widget.size,
          height: widget.size,
          decoration: BoxDecoration(
            color: widget.color.withOpacity(0.7 + 0.3 * _anim.value),
            shape: BoxShape.circle,
          ),
        ),
      ]),
    );
  }
}

/// Slide-up animated bottom sheet container
class RaastSheet extends StatelessWidget {
  final Widget child;
  final double? height;
  final EdgeInsets padding;
  final bool scrollable;

  const RaastSheet({
    super.key,
    required this.child,
    this.height,
    this.padding = const EdgeInsets.fromLTRB(24, 12, 24, 32),
    this.scrollable = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: height == null ? MainAxisSize.min : MainAxisSize.max,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 8),
          Flexible(
            child: scrollable
                ? SingleChildScrollView(padding: padding, child: child)
                : Padding(padding: padding, child: child),
          ),
        ],
      ),
    );
  }
}

/// Consistent section header
class SectionLabel extends StatelessWidget {
  final String text;
  final Widget? trailing;
  final EdgeInsets padding;
  const SectionLabel(this.text, {super.key, this.trailing, this.padding = const EdgeInsets.fromLTRB(0, 8, 0, 10)});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(children: [
        Text(text, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppTheme.textDark, letterSpacing: -0.2)),
        if (trailing != null) ...[const Spacer(), trailing!],
      ]),
    );
  }
}

/// Premium icon badge container
class IconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;

  const IconBadge({super.key, required this.icon, required this.color, this.size = 48, this.iconSize = 24});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: Icon(icon, color: color, size: iconSize),
    );
  }
}

/// Empty state with icon and message
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color? color;

  const EmptyState({super.key, required this.icon, required this.title, required this.subtitle, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? Colors.grey.shade400;
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(
          width: 96, height: 96,
          decoration: BoxDecoration(color: c.withOpacity(0.08), shape: BoxShape.circle),
          child: Icon(icon, size: 44, color: c.withOpacity(0.5)),
        ),
        const SizedBox(height: 20),
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.textDark)),
        const SizedBox(height: 6),
        Text(subtitle, style: const TextStyle(fontSize: 14, color: AppTheme.textGrey), textAlign: TextAlign.center),
      ]),
    );
  }
}

/// Severity/status pill badge
class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  final bool large;
  const StatusBadge({super.key, required this.label, required this.color, this.large = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: large ? 12 : 8, vertical: large ? 5 : 3),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6)),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(color: Colors.white, fontSize: large ? 11 : 10, fontWeight: FontWeight.w800, letterSpacing: 0.5),
      ),
    );
  }
}

/// Horizontal info row for detail sheets
class InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? color;
  const InfoRow({super.key, required this.icon, required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: color ?? AppTheme.textGrey),
        const SizedBox(width: 12),
        Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppTheme.textDark)),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 14, color: AppTheme.textMed))),
      ]),
    );
  }
}

/// Role selector card (used in register)
class RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const RoleCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? color : const Color(0xFFEEEEEE),
            width: selected ? 2 : 1,
          ),
          boxShadow: selected
              ? [BoxShadow(color: color.withOpacity(0.15), blurRadius: 12, offset: const Offset(0, 4))]
              : [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: selected ? color : const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: selected ? Colors.white : AppTheme.textGrey, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: selected ? color : AppTheme.textDark)),
            const SizedBox(height: 2),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textGrey)),
          ])),
          if (selected) Icon(Icons.check_circle_rounded, color: color, size: 22)
          else const Icon(Icons.radio_button_unchecked, color: AppTheme.textGrey, size: 22),
        ]),
      ),
    );
  }
}

/// Animated gradient header for screens
class GradientHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final List<Color> colors;
  final Widget? action;

  const GradientHeader({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.colors,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(28)),
        boxShadow: [BoxShadow(color: colors.last.withOpacity(0.35), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: SafeArea(bottom: false, child: Row(children: [
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
          child: Icon(icon, color: Colors.white, size: 28),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
          Text(subtitle, style: const TextStyle(color: Colors.white70, fontSize: 13)),
        ])),
        if (action != null) action!,
      ])),
    );
  }
}

/// Unified styled text field
class RaastTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? hintText;
  final String? labelText;
  final int maxLines;
  final TextInputType keyboardType;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final ValueChanged<String>? onChanged;
  final Color? fillColor;
  final TextStyle? textStyle;

  const RaastTextField({
    super.key,
    this.controller,
    this.hintText,
    this.labelText,
    this.maxLines = 1,
    this.keyboardType = TextInputType.text,
    this.prefixIcon,
    this.suffixIcon,
    this.onChanged,
    this.fillColor,
    this.textStyle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (labelText != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 6, left: 4),
            child: Text(
              labelText!,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF414941),
              ),
            ),
          ),
        TextField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          onChanged: onChanged,
          style: textStyle ?? const TextStyle(fontSize: 15, color: Color(0xFF1a1c1f)),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: const TextStyle(color: Color(0xFF717970), fontSize: 15),
            filled: true,
            fillColor: fillColor ?? const Color(0xFFe8e8ed), // matched RN `inputMuted`
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xFF006E26), width: 2), // matched RN active color
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: 16,
              vertical: maxLines > 1 ? 16 : 0, // adjust vertical padding for single vs multi line
            ),
            prefixIcon: prefixIcon,
            suffixIcon: suffixIcon,
          ),
        ),
      ],
    );
  }
}

/// Phone field with +92 prefix badge
class RaastPhoneField extends StatelessWidget {
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged;

  const RaastPhoneField({
    super.key,
    this.controller,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: const [
            Padding(
              padding: EdgeInsets.only(bottom: 6, left: 4),
              child: Text(
                'Your phone (optional)',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF414941),
                ),
              ),
            ),
            Padding(
              padding: EdgeInsets.only(bottom: 6, right: 4),
              child: Text(
                'For verification only',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF717970),
                ),
              ),
            ),
          ],
        ),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFe8e8ed),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: const Text(
                '+92',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF01411c),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: SizedBox(
                height: 52,
                child: TextField(
                  controller: controller,
                  keyboardType: TextInputType.phone,
                  onChanged: onChanged,
                  style: const TextStyle(fontSize: 15, color: Color(0xFF1a1c1f)),
                  decoration: InputDecoration(
                    hintText: '300 1234567',
                    hintStyle: const TextStyle(color: Color(0xFF717970), fontSize: 15),
                    filled: true,
                    fillColor: const Color(0xFFe8e8ed),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF006E26), width: 2),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Autocomplete field for location searches
class RaastAutocomplete extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final Function(GeocodeSuggestion)? onSelected;

  const RaastAutocomplete({
    super.key,
    required this.controller,
    required this.label,
    this.hint = 'Search location...',
    this.icon = Icons.location_on_rounded,
    this.onSelected,
  });

  @override
  State<RaastAutocomplete> createState() => _RaastAutocompleteState();
}

class _RaastAutocompleteState extends State<RaastAutocomplete> {
  final List<GeocodeSuggestion> _suggestions = [];
  bool _loading = false;
  bool _showSuggestions = false;

  Future<void> _onChanged(String val) async {
    if (val.length < 3) {
      if (_suggestions.isNotEmpty) setState(() => _suggestions.clear());
      return;
    }

    setState(() => _loading = true);
    try {
      final rp = context.read<RouteProvider>();
      await rp.searchSuggestions(val);
      if (mounted) {
        setState(() {
          _suggestions.clear();
          _suggestions.addAll(rp.suggestions);
          _loading = false;
          _showSuggestions = _suggestions.isNotEmpty;
        });
        rp.clearSuggestions();
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RaastTextField(
          controller: widget.controller,
          labelText: widget.label,
          hintText: widget.hint,
          prefixIcon: Icon(widget.icon, color: AppTheme.textGrey, size: 20),
          suffixIcon: _loading
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : widget.controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () {
                        widget.controller.clear();
                        setState(() {
                          _suggestions.clear();
                          _showSuggestions = false;
                        });
                      },
                    )
                  : null,
          onChanged: _onChanged,
        ),
        if (_showSuggestions && _suggestions.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
              ],
            ),
            constraints: const BoxConstraints(maxHeight: 200),
            child: ListView.separated(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              itemCount: _suggestions.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final s = _suggestions[i];
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.place_rounded, size: 18, color: AppTheme.textGrey),
                  title: Text(s.shortName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                  subtitle: Text(s.displayName, style: const TextStyle(fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                  onTap: () {
                    widget.controller.text = s.shortName;
                    setState(() {
                      _suggestions.clear();
                      _showSuggestions = false;
                    });
                    widget.onSelected?.call(s);
                  },
                );
              },
            ),
          ),
      ],
    );
  }
}
