import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/sign_in_screen.dart';
import '../../features/auth/screens/sign_up_screen.dart';
import '../../features/auth/screens/permission_screen.dart';
import '../../features/map/screens/home_map_screen.dart';
import '../../features/circles/screens/circles_screen.dart';
import '../../features/circles/screens/circle_detail_screen.dart';
import '../../features/circles/screens/create_circle_screen.dart';
import '../../features/geofence/screens/geofence_screen.dart';
import '../../features/sos/screens/sos_screen.dart';
import '../../features/privacy/screens/privacy_dashboard_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isOnAuthPath = state.matchedLocation.startsWith('/auth') ||
          state.matchedLocation == '/splash' ||
          state.matchedLocation == '/onboarding';

      if (!isLoggedIn && !isOnAuthPath) return '/auth/sign-in';
      if (isLoggedIn && isOnAuthPath &&
          state.matchedLocation != '/splash') return '/map';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/permissions', builder: (_, __) => const PermissionScreen()),

      // Auth
      GoRoute(path: '/auth/sign-in', builder: (_, __) => const SignInScreen()),
      GoRoute(path: '/auth/sign-up', builder: (_, __) => const SignUpScreen()),

      // Main shell with bottom nav
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/map', builder: (_, __) => const HomeMapScreen()),
          GoRoute(
            path: '/circles',
            builder: (_, __) => const CirclesScreen(),
            routes: [
              GoRoute(
                path: ':circleId',
                builder: (_, s) => CircleDetailScreen(
                  circleId: s.pathParameters['circleId']!,
                ),
              ),
              GoRoute(
                path: 'new',
                builder: (_, __) => const CreateCircleScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),

      // Full-screen overlays (no bottom nav)
      GoRoute(path: '/sos', builder: (_, __) => const SosScreen()),
      GoRoute(
        path: '/privacy',
        builder: (_, __) => const PrivacyDashboardScreen(),
      ),
      GoRoute(
        path: '/geofences/:circleId',
        builder: (_, s) => GeofenceScreen(
          circleId: s.pathParameters['circleId']!,
        ),
      ),
    ],
  );
});

/// Bottom navigation shell shared by the main app tabs.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  static const _tabs = ['/map', '/circles', '/notifications', '/profile'];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    int _activeIndex() {
      for (int i = 0; i < _tabs.length; i++) {
        if (location.startsWith(_tabs[i])) return i;
      }
      return 0;
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _activeIndex(),
        onTap: (i) => context.go(_tabs[i]),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'Map'),
          BottomNavigationBarItem(icon: Icon(Icons.group_outlined), activeIcon: Icon(Icons.group), label: 'Circles'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications), label: 'Alerts'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
