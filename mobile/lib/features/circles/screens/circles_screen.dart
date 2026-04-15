import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class CirclesScreen extends ConsumerWidget {
  const CirclesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Circles'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'New circle',
            onPressed: () => context.push('/circles/new'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          _CircleCard(
            name: 'Family',
            memberCount: 4,
            color: AppColors.primary,
            onTap: () => context.push('/circles/family-circle-id'),
          ),
          const SizedBox(height: 8),
          _CircleCard(
            name: 'Friends',
            memberCount: 3,
            color: AppColors.emerald,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _CircleCard extends StatelessWidget {
  const _CircleCard({
    required this.name,
    required this.memberCount,
    required this.color,
    required this.onTap,
  });
  final String name;
  final int memberCount;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          onTap: onTap,
          leading: CircleAvatar(
            backgroundColor: color.withOpacity(0.15),
            child: Icon(Icons.group, color: color),
          ),
          title: Text(name, style: Theme.of(context).textTheme.titleMedium),
          subtitle: Text('$memberCount members'),
          trailing: const Icon(Icons.chevron_right),
        ),
      );
}
