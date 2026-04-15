import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/app_constants.dart';

const _kAccessTokenKey = 'access_token';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        contentType: 'application/json',
        extra: {'withCredentials': true}, // send httpOnly refresh cookie
      ),
    );

    _dio.interceptors.addAll([
      _AuthInterceptor(_storage, _dio),
      LogInterceptor(requestBody: false, responseBody: false),
    ]);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    await _dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
    });
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    await _saveTokens(res.data);
  }

  Future<void> firebaseLogin({required String idToken}) async {
    final res = await _dio.post('/auth/firebase-login', data: {
      'idToken': idToken,
    });
    await _saveTokens(res.data);
  }

  Future<String> getFirebaseCustomToken() async {
    final res = await _dio.get('/auth/firebase-custom-token');
    return res.data['customToken'] as String;
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } finally {
      await _storage.delete(key: _kAccessTokenKey);
    }
  }

  // ── Map feed ──────────────────────────────────────────────────────────────

  Future<List<dynamic>> getMapFeed({String? circleId}) async {
    final res = await _dio.get(
      '/location/feed',
      queryParameters: circleId != null ? {'circle_id': circleId} : null,
    );
    return res.data as List<dynamic>;
  }

  // ── Location upload ───────────────────────────────────────────────────────

  Future<void> uploadLocation({
    required double lat,
    required double lng,
    required double accuracy,
    required double altitude,
    double? heading,
    double? speed,
    String activity = 'stationary',
    required DateTime recordedAt,
  }) async {
    await _dio.post('/location/upload', data: {
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      'altitude': altitude,
      if (heading != null) 'heading': heading,
      if (speed != null) 'speed': speed,
      'activity': activity,
      'recordedAt': recordedAt.toIso8601String(),
    });
  }

  // ── SOS ───────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> triggerSos({
    double? lat,
    double? lng,
    String? message,
  }) async {
    final res = await _dio.post('/sos/trigger', data: {
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
      if (message != null) 'message': message,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> cancelSos({required String sessionId}) async {
    await _dio.post('/sos/$sessionId/cancel');
  }

  Future<void> resolveSos({required String sessionId}) async {
    await _dio.post('/sos/$sessionId/resolve');
  }

  // ── Privacy ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getPrivacyDashboard() async {
    final res = await _dio.get('/privacy/dashboard');
    return res.data as Map<String, dynamic>;
  }

  Future<void> stopAllSharing() async {
    await _dio.delete('/location/shares');
  }

  Future<void> deleteLocationHistory({int olderThanHours = 24}) async {
    await _dio.delete(
      '/privacy/history',
      queryParameters: {'olderThanHours': olderThanHours},
    );
  }

  Future<void> revokeShare({required String shareId}) async {
    await _dio.delete('/location/shares/$shareId');
  }

  Future<void> updateSharePrecision({
    required String shareId,
    required String precision,
  }) async {
    await _dio.patch('/location/shares/$shareId', data: {
      'precision': precision,
    });
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getMe() async {
    final res = await _dio.get('/users/me');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateProfile({
    String? name,
    String? statusEmoji,
  }) async {
    final res = await _dio.patch('/users/me', data: {
      if (name != null) 'name': name,
      if (statusEmoji != null) 'statusEmoji': statusEmoji,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Future<void> _saveTokens(dynamic data) async {
    final accessToken = data['accessToken'] as String?;
    if (accessToken != null) {
      await _storage.write(key: _kAccessTokenKey, value: accessToken);
    }
  }

  Future<String?> getStoredAccessToken() =>
      _storage.read(key: _kAccessTokenKey);
}

// ── Auth Interceptor ───────────────────────────────────────────────────────

class _AuthInterceptor extends Interceptor {
  final FlutterSecureStorage _storage;
  final Dio _dio;

  _AuthInterceptor(this._storage, this._dio);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: _kAccessTokenKey);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // Attempt silent token refresh (backend reads httpOnly refresh cookie).
    try {
      final refreshDio = Dio(BaseOptions(
        baseUrl: _dio.options.baseUrl,
        extra: {'withCredentials': true},
      ));
      final res = await refreshDio.post('/auth/refresh');
      final newToken = res.data['accessToken'] as String?;
      if (newToken == null) {
        return handler.next(err);
      }
      await _storage.write(key: _kAccessTokenKey, value: newToken);

      // Retry original request with new token.
      final opts = err.requestOptions;
      opts.headers['Authorization'] = 'Bearer $newToken';
      final retryRes = await _dio.fetch(opts);
      return handler.resolve(retryRes);
    } catch (_) {
      // Refresh failed — let caller handle the 401.
      await _storage.delete(key: _kAccessTokenKey);
      handler.next(err);
    }
  }
}
