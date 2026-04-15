abstract final class AppConstants {
  // ── API ───────────────────────────────────────────────────────────────────
  static const String apiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api.safecircle.app/v1');
  static const String wsBaseUrl =
      String.fromEnvironment('WS_BASE_URL', defaultValue: 'wss://api.safecircle.app');

  // ── Location ──────────────────────────────────────────────────────────────
  /// Foreground update interval in seconds
  static const int locationForegroundIntervalSec = 10;

  /// Background update interval in seconds (battery-optimised)
  static const int locationBackgroundIntervalSec = 60;

  /// Distance filter: only publish if moved more than N metres
  static const double locationDistanceFilterMetres = 20;

  // ── Auth ──────────────────────────────────────────────────────────────────
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';

  // ── SOS ───────────────────────────────────────────────────────────────────
  static const int sosCountdownSeconds = 10;

  // ── Pagination ────────────────────────────────────────────────────────────
  static const int defaultPageSize = 20;

  // ── Maps ──────────────────────────────────────────────────────────────────
  static const double defaultMapZoom = 15.0;
  static const double overviewMapZoom = 12.0;

  // ── Privacy ───────────────────────────────────────────────────────────────
  /// How long to retain local location history (hours)
  static const int localHistoryRetentionHours = 24;
}
