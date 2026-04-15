import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../../services/api_service.dart';
import '../../../services/socket_service.dart';

class MapState {
  const MapState({
    this.markers = const {},
    this.geofenceCircles = const {},
    this.selectedUserId,
    this.myPosition = const AsyncValue.loading(),
  });
  final Set<Marker> markers;
  final Set<Circle> geofenceCircles;
  final String? selectedUserId;
  final AsyncValue<Position?> myPosition;

  MapState copyWith({
    Set<Marker>? markers,
    Set<Circle>? geofenceCircles,
    String? selectedUserId,
    bool clearSelection = false,
    AsyncValue<Position?>? myPosition,
  }) =>
      MapState(
        markers: markers ?? this.markers,
        geofenceCircles: geofenceCircles ?? this.geofenceCircles,
        selectedUserId: clearSelection ? null : selectedUserId ?? this.selectedUserId,
        myPosition: myPosition ?? this.myPosition,
      );
}

class MapNotifier extends StateNotifier<MapState> {
  MapNotifier(this._api, this._socket) : super(const MapState()) {
    _init();
  }

  final ApiService _api;
  final SocketService _socket;

  Future<void> _init() async {
    // Start own location
    _startOwnLocation();

    // Fetch initial map feed from REST
    try {
      final feed = await _api.getMapFeed();
      _updateFeedMarkers(feed);
    } catch (_) {}

    // Subscribe to real-time updates
    _socket.on('location:updated', (data) {
      if (data is Map) _handleLocationUpdate(data);
    });
  }

  Future<void> _startOwnLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition();
      state = state.copyWith(myPosition: AsyncValue.data(position));
    } catch (e) {
      state = state.copyWith(myPosition: AsyncValue.error(e, StackTrace.current));
    }
  }

  void _handleLocationUpdate(Map data) {
    final userId = data['user_id'] as String?;
    final lat = (data['latitude'] as num?)?.toDouble();
    final lng = (data['longitude'] as num?)?.toDouble();
    if (userId == null || lat == null || lng == null) return;

    final newMarker = Marker(
      markerId: MarkerId(userId),
      position: LatLng(lat, lng),
      infoWindow: InfoWindow(title: data['display_name'] as String? ?? ''),
      onTap: () => selectUser(userId),
    );

    final updated = Set<Marker>.from(state.markers)
      ..removeWhere((m) => m.markerId.value == userId)
      ..add(newMarker);

    state = state.copyWith(markers: updated);
  }

  void _updateFeedMarkers(List<dynamic> feed) {
    final markers = <Marker>{};
    for (final item in feed) {
      if (item is! Map) continue;
      final lat = (item['latitude'] as num?)?.toDouble();
      final lng = (item['longitude'] as num?)?.toDouble();
      final userId = item['user_id'] as String?;
      if (lat == null || lng == null || userId == null) continue;

      markers.add(Marker(
        markerId: MarkerId(userId),
        position: LatLng(lat, lng),
        infoWindow: InfoWindow(title: item['display_name'] as String? ?? ''),
        onTap: () => selectUser(userId),
      ));
    }
    state = state.copyWith(markers: markers);
  }

  void selectUser(String userId) {
    state = state.copyWith(selectedUserId: userId);
  }

  void clearSelection() {
    state = state.copyWith(clearSelection: true);
  }

  @override
  void dispose() {
    _socket.off('location:updated');
    super.dispose();
  }
}

final mapNotifierProvider = StateNotifierProvider<MapNotifier, MapState>((ref) {
  return MapNotifier(ref.watch(apiServiceProvider), ref.watch(socketServiceProvider));
});
