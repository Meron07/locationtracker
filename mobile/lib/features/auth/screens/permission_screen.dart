import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/theme/app_theme.dart';

class PermissionScreen extends ConsumerStatefulWidget {
  const PermissionScreen({super.key});

  @override
  ConsumerState<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends ConsumerState<PermissionScreen> {
  PermissionStatus _foreground = PermissionStatus.denied;
  PermissionStatus _background = PermissionStatus.denied;
  PermissionStatus _notifications = PermissionStatus.denied;

  @override
  void initState() {
    super.initState();
    _checkStatuses();
  }

  Future<void> _checkStatuses() async {
    final results = await Future.wait([
      Permission.locationWhenInUse.status,
      Permission.locationAlways.status,
      Permission.notification.status,
    ]);
    if (mounted) {
      setState(() {
        _foreground = results[0];
        _background = results[1];
        _notifications = results[2];
      });
    }
  }

  Future<void> _requestForeground() async {
    final status = await Permission.locationWhenInUse.request();
    setState(() => _foreground = status);
  }

  Future<void> _requestBackground() async {
    final status = await Permission.locationAlways.request();
    setState(() => _background = status);
  }

  Future<void> _requestNotifications() async {
    final status = await Permission.notification.request();
    setState(() => _notifications = status);
  }

  bool get _canProceed => _foreground.isGranted;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.shield_outlined, size: 48, color: AppColors.primary),
              const SizedBox(height: 24),
              Text(
                'Permissions needed',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'SafeCircle only shares your location with people you explicitly approve. '
                'You can change these at any time.',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 40),

              _PermissionRow(
                icon: Icons.location_on,
                title: 'Location (while using app)',
                subtitle: 'Required — see your position on the map.',
                status: _foreground,
                onRequest: _requestForeground,
              ),
              const SizedBox(height: 16),
              _PermissionRow(
                icon: Icons.location_searching,
                title: 'Background location',
                subtitle: 'Recommended — share location when the app is closed.',
                status: _background,
                onRequest: _requestBackground,
              ),
              const SizedBox(height: 16),
              _PermissionRow(
                icon: Icons.notifications_outlined,
                title: 'Notifications',
                subtitle: 'For geofence alerts and SOS messages.',
                status: _notifications,
                onRequest: _requestNotifications,
              ),

              const Spacer(),

              ElevatedButton(
                onPressed: _canProceed ? () => context.go('/map') : null,
                child: const Text('Continue'),
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/map'),
                  child: const Text(
                    'Skip for now',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.onRequest,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final PermissionStatus status;
  final VoidCallback onRequest;

  @override
  Widget build(BuildContext context) {
    final isGranted = status.isGranted;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isGranted
                ? AppColors.emerald.withOpacity(0.1)
                : AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            isGranted ? Icons.check : icon,
            color: isGranted ? AppColors.emerald : AppColors.primary,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 2),
              Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
        if (!isGranted)
          TextButton(
            onPressed: onRequest,
            child: const Text('Allow'),
          ),
      ],
    );
  }
}
