import 'package:flutter/material.dart';

/// SafeCircle design-system tokens.
///
/// Primary palette: Deep Indigo (#4F46E5) + Emerald (#10B981) accents.
/// Semantic colours: danger (#EF4444), warning (#F59E0B), success (#22C55E).
abstract final class AppColors {
  // Brand
  static const primary = Color(0xFF4F46E5);
  static const primaryLight = Color(0xFF818CF8);
  static const primaryDark = Color(0xFF3730A3);

  // Accents
  static const emerald = Color(0xFF10B981);
  static const emeraldLight = Color(0xFF6EE7B7);

  // Semantic
  static const danger = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const success = Color(0xFF22C55E);
  static const info = Color(0xFF3B82F6);

  // Neutrals (light mode)
  static const surface = Color(0xFFFFFFFF);
  static const background = Color(0xFFF8F8FC);
  static const cardBackground = Color(0xFFFFFFFF);
  static const border = Color(0xFFE5E7EB);
  static const textPrimary = Color(0xFF111827);
  static const textSecondary = Color(0xFF6B7280);
  static const textDisabled = Color(0xFF9CA3AF);

  // Neutrals (dark mode)
  static const darkSurface = Color(0xFF1F2937);
  static const darkBackground = Color(0xFF111827);
  static const darkCard = Color(0xFF1F2937);
  static const darkBorder = Color(0xFF374151);
  static const darkTextPrimary = Color(0xFFF9FAFB);
  static const darkTextSecondary = Color(0xFF9CA3AF);

  // Map UI
  static const mapAccent = primary;
  static const markerSelf = emerald;
  static const sosRed = danger;
}

abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
}

abstract final class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double pill = 100;
}

/// Provides both light and dark [ThemeData] instances using Material 3.
abstract final class AppTheme {
  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
          surface: AppColors.surface,
          background: AppColors.background,
          error: AppColors.danger,
        ),
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Inter',
        textTheme: _textTheme(AppColors.textPrimary, AppColors.textSecondary),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.surface,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          scrolledUnderElevation: 1,
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        cardTheme: CardTheme(
          color: AppColors.cardBackground,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            side: const BorderSide(color: AppColors.border),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            textStyle: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            side: const BorderSide(color: AppColors.primary),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.background,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: const BorderSide(color: AppColors.primary, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            borderSide: const BorderSide(color: AppColors.danger),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.md,
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.border,
          thickness: 1,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textSecondary,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
      );

  static ThemeData get darkTheme => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.dark,
          surface: AppColors.darkSurface,
          background: AppColors.darkBackground,
          error: AppColors.danger,
        ),
        scaffoldBackgroundColor: AppColors.darkBackground,
        fontFamily: 'Inter',
        textTheme: _textTheme(AppColors.darkTextPrimary, AppColors.darkTextSecondary),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.darkBackground,
          foregroundColor: AppColors.darkTextPrimary,
          elevation: 0,
          scrolledUnderElevation: 1,
          centerTitle: true,
        ),
        cardTheme: CardTheme(
          color: AppColors.darkCard,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            side: const BorderSide(color: AppColors.darkBorder),
          ),
        ),
      );

  static TextTheme _textTheme(Color primary, Color secondary) => TextTheme(
        displayLarge: TextStyle(
          fontSize: 32, fontWeight: FontWeight.w700, color: primary, height: 1.2,
        ),
        displayMedium: TextStyle(
          fontSize: 28, fontWeight: FontWeight.w700, color: primary, height: 1.2,
        ),
        headlineLarge: TextStyle(
          fontSize: 24, fontWeight: FontWeight.w600, color: primary,
        ),
        headlineMedium: TextStyle(
          fontSize: 20, fontWeight: FontWeight.w600, color: primary,
        ),
        titleLarge: TextStyle(
          fontSize: 17, fontWeight: FontWeight.w600, color: primary,
        ),
        titleMedium: TextStyle(
          fontSize: 15, fontWeight: FontWeight.w500, color: primary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16, fontWeight: FontWeight.w400, color: primary, height: 1.5,
        ),
        bodyMedium: TextStyle(
          fontSize: 14, fontWeight: FontWeight.w400, color: secondary, height: 1.5,
        ),
        labelLarge: TextStyle(
          fontSize: 14, fontWeight: FontWeight.w600, color: primary,
        ),
        labelSmall: TextStyle(
          fontSize: 12, fontWeight: FontWeight.w500, color: secondary,
          letterSpacing: 0.4,
        ),
      );
}
