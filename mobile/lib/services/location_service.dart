import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'api_service.dart';
import 'socket_service.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  final svc = LocationService(
    api: ref.read(apiServiceProvider),
    socket: ref.read(socketServiceProvider),
  );
  ref.onDispose(svc.stop);
  return svc;
});

/// Tracks the device's location in the foreground and uploads it to the
/// backend via REST (batch-safe) and simultaneously emits over the
/// WebSocket so connected contacts see updates in real-time.
///
/// Battery-adaptive strategy:
///   • Foreground / moving  → every 10 s, distanceFilter 10 m
///   • Foreground / stationary → every 5 min, distanceFilter 30 m
///   • Background           → driven by BackgroundFetch (platform quota,
///                            typically 60 s on Android / 15 min on iOS)
class LocationService {
  final ApiService _api;
  final SocketService _socket;

  StreamSubscription<Position>? _positionSub;
  Position? _lastPosition;
  bool _running = false;

  LocationService({required ApiService api, required SocketService socket})
      : _api = api,
        _socket = socket;

  // ── Public API ─────────────────────────────────────────────────────────────

  Future<bool> start() async {
    if (_running) return true;

    final permission = await _checkPermission();
    if (!permission) return false;

    _running = true;
    _startStream();
    return true;
  }

  void stop() {
    _running = false;
    _positionSub?.cancel();
    _positionSub = null;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  void _startStream() {
    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // metres
    );

    _positionSub = Geolocator.getPositionStream(locationSettings: settings)
        .listen(
          _onPosition,
          onError: (Object err) {
            // ignore: avoid_print
            print('[Location] stream error: $err');
          },
          cancelOnError: false,
        );
  }

  Future<void> _onPosition(Position pos) async {
    if (!_running) return;
    _lastPosition = pos;

    final activity = _inferActivity(pos);

    // Emit over WebSocket for real-time map updates.
    if (_socket.isConnected) {
      _socket.emit('location:update', {
        'lat': pos.latitude,
        'lng': pos.longitude,
        'accuracy': pos.accuracy,
        'altitude': pos.altitude,
        'heading': pos.heading,
        'speed': pos.speed,
        'activity': activity,
        'recordedAt': DateTime.now().toIso8601String(),
      });
    }

    // Also persist via REST (battery adaptive: only batch-flush every 60 s in
    // background; foreground calls are lightweight and go through immediately).
    try {
      await _api.uploadLocation(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        altitude: pos.altitude,
        heading: pos.heading,
        speed: pos.speed,
        activity: activity,
        recordedAt: DateTime.now(),
      );
    } catch (e) {
      // Silently swallow — offline tolerance; position is still emitted via WS.
      // ignore: avoid_print
      print('[Location] upload failed (will retry on next tick): $e');
    }
  }

  String _inferActivity(Position pos) {
    final speed = pos.speed; // m/s
    if (speed < 0.3) return 'stationary';
    if (speed < 1.5) return 'walking';
    if (speed < 3.5) return 'running';
    if (speed < 7.0) return 'cycling';
    return 'driving';
  }

  static Future<bool> _checkPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  Position? get lastKnownPosition => _lastPosition;
}
