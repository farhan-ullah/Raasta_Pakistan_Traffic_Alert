import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryRed = Color(0xFFD32F2F);
  static const Color darkRed = Color(0xFF7F0000);
  static const Color deepRed = Color(0xFF9A0007);
  static const Color lightRed = Color(0xFFFF6659);
  static const Color background = Color(0xFFF8F9FA);
  static const Color surfaceCard = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF0D0D0D);
  static const Color textMed = Color(0xFF424242);
  static const Color textGrey = Color(0xFF9E9E9E);
  static const Color borderGrey = Color(0xFFEEEEEE);
  static const Color criticalRed = Color(0xFFD32F2F);
  static const Color highOrange = Color(0xFFF57C00);
  static const Color mediumYellow = Color(0xFFF9A825);
  static const Color lowGreen = Color(0xFF388E3C);
  static const Color successGreen = Color(0xFF2E7D32);
  static const Color infoBlue = Color(0xFF1565C0);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF7F0000), Color(0xFFD32F2F), Color(0xFFE53935)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF6A0000), Color(0xFFC62828)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static ThemeData getLightTheme(Color primaryColor) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: primaryColor,
        surface: surfaceCard,
        brightness: Brightness.light,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: const TextStyle(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
        toolbarHeight: 64,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: primaryColor.withOpacity(0.12),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: primaryColor, size: 26);
          }
          return const IconThemeData(color: Color(0xFF9E9E9E), size: 24);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(color: primaryColor, fontWeight: FontWeight.w600, fontSize: 12);
          }
          return const TextStyle(color: Color(0xFF9E9E9E), fontSize: 11);
        }),
        elevation: 16,
        shadowColor: Colors.black26,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        height: 72,
      ),
      cardTheme: CardThemeData(
        color: surfaceCard,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        shadowColor: Colors.black12,
        surfaceTintColor: Colors.transparent,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          minimumSize: const Size(double.infinity, 56),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: BorderSide(color: primaryColor, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          minimumSize: const Size(double.infinity, 54),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF5F5F5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: primaryColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: criticalRed),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        labelStyle: const TextStyle(color: Color(0xFF9E9E9E), fontSize: 15),
        hintStyle: const TextStyle(color: Color(0xFFBDBDBD), fontSize: 15),
        prefixIconColor: Color(0xFF9E9E9E),
        suffixIconColor: Color(0xFF9E9E9E),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFF5F5F5),
        selectedColor: primaryColor.withOpacity(0.15),
        labelStyle: const TextStyle(fontSize: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      scaffoldBackgroundColor: background,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: textDark, letterSpacing: -0.5),
        displayMedium: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: textDark),
        headlineLarge: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: textDark),
        headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: textDark),
        titleLarge: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: textDark),
        titleMedium: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: textDark),
        bodyLarge: TextStyle(fontSize: 15, color: textMed, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, color: textMed, height: 1.4),
        bodySmall: TextStyle(fontSize: 12, color: textGrey),
        labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: textDark),
      ),
    );
  }

  static Color severityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical': return criticalRed;
      case 'high': return highOrange;
      case 'medium': return mediumYellow;
      case 'low': return lowGreen;
      default: return textGrey;
    }
  }

  static Color roleColor(String role) {
    switch (role) {
      case 'super_admin': return const Color(0xFF4A148C);
      case 'police': return const Color(0xFF0D47A1);
      case 'city_admin': return const Color(0xFF1B5E20);
      case 'business': return const Color(0xFFE65100);
      default: return const Color(0xFF546E7A);
    }
  }

  static BoxDecoration cardDecoration({double radius = 16, Color? borderColor}) {
    return BoxDecoration(
      color: surfaceCard,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: borderColor ?? const Color(0xFFF0F0F0), width: 1),
      boxShadow: [
        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 2)),
        BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 1)),
      ],
    );
  }

  static BoxDecoration glassDecoration({double radius = 16, double opacity = 0.15}) {
    return BoxDecoration(
      color: Colors.white.withOpacity(opacity),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
    );
  }
}
