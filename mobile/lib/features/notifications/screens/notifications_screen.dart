import 'package:flutter/material.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Alerts')),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.notifications_none, size: 64, color: Color(0xFF9CA3AF)),
              SizedBox(height: 16),
              Text(
                'No alerts yet',
                style: TextStyle(fontSize: 16, color: Color(0xFF6B7280)),
              ),
              SizedBox(height: 8),
              Text(
                'Geofence alerts and SOS notifications\nwill appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
              ),
            ],
          ),
        ),
      );
}
