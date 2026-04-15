import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../providers/map_notifier.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/person_bottom_sheet.dart';
import '../widgets/sos_fab.dart';
import '../widgets/my_location_button.dart';

class HomeMapScreen extends ConsumerStatefulWidget {
  const HomeMapScreen({super.key});

  @override
  ConsumerState<HomeMapScreen> createState() => _HomeMapScreenState();
}

class _HomeMapScreenState extends ConsumerState<HomeMapScreen> {
  GoogleMapController? _mapCtrl;

  @override
  void dispose() {
    _mapCtrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mapState = ref.watch(mapNotifierProvider);

    return Scaffold(
      body: Stack(
        children: [
          // ── Map ──────────────────────────────────────────────────────────
          GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: LatLng(0, 0),
              zoom: 2,
            ),
            onMapCreated: (ctrl) {
              _mapCtrl = ctrl;
              // Move to own position once available
              mapState.myPosition.whenData((pos) {
                if (pos != null) {
                  ctrl.animateCamera(
                    CameraUpdate.newLatLngZoom(
                      LatLng(pos.latitude, pos.longitude),
                      AppConstants.defaultMapZoom,
                    ),
                  );
                }
              });
            },
            myLocationEnabled: false, // We draw a custom marker
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            compassEnabled: false,
            markers: mapState.markers,
            circles: mapState.geofenceCircles,
            onTap: (_) => ref.read(mapNotifierProvider.notifier).clearSelection(),
          ),

          // ── Top bar: circle selector ──────────────────────────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: _CircleSelector(),
            ),
          ),

          // ── SOS FAB ───────────────────────────────────────────────────────
          Positioned(
            right: 16,
            bottom: 100,
            child: SosFab(
              onPressed: () => context.push('/sos'),
            ),
          ),

          // ── My location button ────────────────────────────────────────────
          Positioned(
            right: 16,
            bottom: 180,
            child: MyLocationButton(
              onPressed: () {
                mapState.myPosition.whenData((pos) {
                  if (pos != null && _mapCtrl != null) {
                    _mapCtrl!.animateCamera(
                      CameraUpdate.newLatLngZoom(
                        LatLng(pos.latitude, pos.longitude),
                        AppConstants.defaultMapZoom,
                      ),
                    );
                  }
                });
              },
            ),
          ),

          // ── Person detail bottom sheet ────────────────────────────────────
          if (mapState.selectedUserId != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: PersonBottomSheet(
                userId: mapState.selectedUserId!,
                onDismiss: () =>
                    ref.read(mapNotifierProvider.notifier).clearSelection(),
              ),
            ),
        ],
      ),
    );
  }
}

class _CircleSelector extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Center(
        child: Text(
          'All circles',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

// Avoid direct import in widget file
class AppConstants {
  static const double defaultMapZoom = 15.0;
}
