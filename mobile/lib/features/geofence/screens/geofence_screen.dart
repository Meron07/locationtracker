import 'package:flutter/material.dart';

class GeofenceScreen extends StatelessWidget {
  const GeofenceScreen({super.key, required this.circleId});
  final String circleId;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Geofences')),
        body: const Center(child: Text('Geofence management — coming soon')),
      );
}
