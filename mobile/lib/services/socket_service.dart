import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/app_constants.dart';

final socketServiceProvider = Provider<SocketService>((ref) => SocketService());

class SocketService {
  io.Socket? _socket;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  void connect(String accessToken) {
    if (_socket != null && _socket!.connected) return;

    _socket = io.io(
      AppConstants.wsBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': accessToken})
          .setReconnectionAttempts(5)
          .setReconnectionDelay(2000)
          .build(),
    );

    _socket!.onConnect((_) {
      // ignore: avoid_print
      print('[Socket] connected: ${_socket!.id}');
    });

    _socket!.onDisconnect((reason) {
      // ignore: avoid_print
      print('[Socket] disconnected: $reason');
    });

    _socket!.onConnectError((err) {
      // ignore: avoid_print
      print('[Socket] connect error: $err');
    });

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  bool get isConnected => _socket?.connected ?? false;

  // ── Events ────────────────────────────────────────────────────────────────

  void on(String event, void Function(dynamic) handler) {
    _socket?.on(event, handler);
  }

  void off(String event) {
    _socket?.off(event);
  }

  void emit(String event, dynamic data) {
    if (!isConnected) return;
    _socket!.emit(event, data);
  }
}
