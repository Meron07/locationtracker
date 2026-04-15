import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CircleDetailScreen extends StatelessWidget {
  const CircleDetailScreen({super.key, required this.circleId});
  final String circleId;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Circle'),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings_outlined),
              onPressed: () {},
            ),
          ],
        ),
        body: const Center(child: Text('Circle detail — coming soon')),
      );
}
