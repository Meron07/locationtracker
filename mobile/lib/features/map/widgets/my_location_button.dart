import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class MyLocationButton extends StatelessWidget {
  const MyLocationButton({super.key, required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => FloatingActionButton.small(
        heroTag: 'my_location_fab',
        backgroundColor: Theme.of(context).cardColor,
        foregroundColor: AppColors.primary,
        onPressed: onPressed,
        tooltip: 'My location',
        elevation: 4,
        child: const Icon(Icons.my_location),
      );
}
