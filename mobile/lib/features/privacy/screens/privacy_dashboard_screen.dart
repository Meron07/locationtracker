import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../services/api_service.dart';

class PrivacyDashboardScreen extends ConsumerWidget {
  const PrivacyDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Dashboard'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Who can see me?
          Text(
            'Who can see my location',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                _SharingRow(
                  name: 'Alex',
                  subtitle: 'Sees exact location · Indefinite',
                  onRevoke: () {},
                ),
                const Divider(height: 1),
                _SharingRow(
                  name: 'Jordan',
                  subtitle: 'Sees approximate location · 8 hours',
                  onRevoke: () {},
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Ghost mode
          Text(
            'Emergency controls',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          _GhostModeCard(
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Stop all sharing?'),
                  content: const Text(
                    'This will immediately revoke all active location shares. '
                    'You can re-share with people individually afterwards.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.danger,
                      ),
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Stop all'),
                    ),
                  ],
                ),
              );

              if (confirmed == true) {
                await ref.read(apiServiceProvider).stopAllSharing();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content:
                          Text('All location sharing stopped. You are now invisible.'),
                      backgroundColor: AppColors.success,
                    ),
                  );
                }
              }
            },
          ),

          const SizedBox(height: 24),

          // Location history
          Text(
            'Location history',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.danger),
              title: const Text('Delete location history'),
              subtitle: const Text('Remove all raw location points from our servers.'),
              trailing: TextButton(
                onPressed: () async {
                  await ref.read(apiServiceProvider).deleteLocationHistory();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Location history deleted.')),
                    );
                  }
                },
                child: const Text('Delete', style: TextStyle(color: AppColors.danger)),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Consent log
          Text(
            'Your consent record',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.history, color: AppColors.primary),
              title: const Text('View consent log'),
              subtitle: const Text('Full history of permissions you have granted or revoked.'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {}, // Navigate to consent log screen
            ),
          ),
        ],
      ),
    );
  }
}

class _SharingRow extends StatelessWidget {
  const _SharingRow({
    required this.name,
    required this.subtitle,
    required this.onRevoke,
  });
  final String name;
  final String subtitle;
  final VoidCallback onRevoke;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.primaryLight.withOpacity(0.2),
          child: Text(name[0], style: const TextStyle(color: AppColors.primary)),
        ),
        title: Text(name),
        subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
        trailing: TextButton(
          onPressed: onRevoke,
          child: const Text('Revoke', style: TextStyle(color: AppColors.danger)),
        ),
      );
}

class _GhostModeCard extends StatelessWidget {
  const _GhostModeCard({required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.danger.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.visibility_off_outlined, color: AppColors.danger),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Ghost mode', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(
                      'Instantly stop all location sharing.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.danger,
                  minimumSize: const Size(80, 40),
                ),
                onPressed: onPressed,
                child: const Text('Go dark'),
              ),
            ],
          ),
        ),
      );
}
