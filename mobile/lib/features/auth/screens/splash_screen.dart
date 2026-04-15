import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/auth_provider.dart';

/// Shown at launch: checks auth state and redirects accordingly.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AsyncValue<dynamic>>(authStateProvider, (_, next) {
      next.whenData((user) {
        if (user != null) {
          context.go('/map');
        } else {
          context.go('/onboarding');
        }
      });
    });

    return const Scaffold(
      backgroundColor: Color(0xFF4F46E5),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _AppLogo(),
            SizedBox(height: 32),
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
              strokeWidth: 2,
            ),
          ],
        ),
      ),
    );
  }
}

class _AppLogo extends StatelessWidget {
  const _AppLogo();

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.location_on, size: 48, color: Colors.white),
          ),
          const SizedBox(height: 16),
          const Text(
            'SafeCircle',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 28,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Stay connected. Stay in control.',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 14,
              color: Colors.white.withOpacity(0.7),
            ),
          ),
        ],
      );
}
