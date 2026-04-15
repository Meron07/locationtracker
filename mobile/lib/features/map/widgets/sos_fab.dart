import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class SosFab extends StatelessWidget {
  const SosFab({super.key, required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => FloatingActionButton(
        heroTag: 'sos_fab',
        backgroundColor: AppColors.danger,
        foregroundColor: Colors.white,
        onPressed: onPressed,
        tooltip: 'SOS Emergency',
        child: const Icon(Icons.sos, size: 28),
      );
}
