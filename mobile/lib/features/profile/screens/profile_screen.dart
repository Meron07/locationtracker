import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../services/api_service.dart';
import '../../../core/theme/app_theme.dart';

final _profileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(apiServiceProvider).getMe();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(_profileProvider);
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (profile) => ListView(
          padding: const EdgeInsets.all(AppSpacing.md),
          children: [
            // ── Avatar + name ───────────────────────────────────────────────
            Center(
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 44,
                    backgroundImage: user?.photoURL != null
                        ? NetworkImage(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            (profile['name'] as String? ?? 'U')
                                .substring(0, 1)
                                .toUpperCase(),
                            style: const TextStyle(
                                fontSize: 32, color: Colors.white),
                          )
                        : null,
                    backgroundColor: AppColors.primary,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    profile['name'] as String? ?? '',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  Text(
                    profile['email'] as String? ?? '',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium
                        ?.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),
            const Divider(),

            // ── Settings tiles ───────────────────────────────────────────────
            _Tile(
              icon: Icons.lock_outline,
              label: 'Privacy Dashboard',
              onTap: () => context.push('/privacy'),
            ),
            _Tile(
              icon: Icons.notifications_none,
              label: 'Notification Preferences',
              onTap: () {},
            ),
            _Tile(
              icon: Icons.help_outline,
              label: 'Help & Support',
              onTap: () {},
            ),
            _Tile(
              icon: Icons.policy_outlined,
              label: 'Privacy Policy',
              onTap: () {},
            ),

            const Divider(),

            // ── Sign out ─────────────────────────────────────────────────────
            _Tile(
              icon: Icons.logout,
              label: 'Sign Out',
              color: AppColors.danger,
              onTap: () => _signOut(context, ref),
            ),

            const SizedBox(height: AppSpacing.lg),
            Center(
              child: Text(
                'SafeCircle — consent-based location sharing',
                style: Theme.of(context)
                    .textTheme
                    .bodySmall
                    ?.copyWith(color: AppColors.textMuted),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will stop sharing your location.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Sign out',
                  style: TextStyle(color: AppColors.danger))),
        ],
      ),
    );

    if (confirmed != true || !context.mounted) return;

    try {
      await ref.read(apiServiceProvider).logout();
      await FirebaseAuth.instance.signOut();
    } catch (_) {}

    if (context.mounted) context.go('/auth/sign-in');
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _Tile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.onSurface;
    return ListTile(
      leading: Icon(icon, color: c),
      title: Text(label, style: TextStyle(color: c)),
      trailing: color == null
          ? const Icon(Icons.chevron_right, color: AppColors.textMuted)
          : null,
      onTap: onTap,
    );
  }
}
