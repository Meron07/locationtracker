import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../services/api_service.dart';

class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});

  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen>
    with SingleTickerProviderStateMixin {
  static const _countdownSeconds = 10;

  late AnimationController _pulseCtrl;
  Timer? _countdownTimer;
  int _remaining = _countdownSeconds;
  bool _triggered = false;
  bool _loading = false;
  String? _sessionId;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_remaining <= 1) {
        t.cancel();
        _fireSos();
      } else {
        setState(() => _remaining--);
      }
    });
  }

  Future<void> _cancel() async {
    _countdownTimer?.cancel();
    if (_sessionId != null) {
      await ref.read(apiServiceProvider).cancelSos(sessionId: _sessionId!);
    }
    if (mounted) context.pop();
  }

  Future<void> _fireSos() async {
    if (_triggered) return;
    setState(() { _triggered = true; _loading = true; });

    try {
      final result = await ref.read(apiServiceProvider).triggerSos();
      _sessionId = result['id'] as String?;
      setState(() => _loading = false);
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.danger,
      body: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Pulsing SOS icon
            AnimatedBuilder(
              animation: _pulseCtrl,
              builder: (_, __) => Transform.scale(
                scale: 0.9 + _pulseCtrl.value * 0.1,
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.15),
                    border: Border.all(color: Colors.white.withOpacity(0.5), width: 3),
                  ),
                  child: const Icon(Icons.sos, size: 80, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 40),

            if (!_triggered) ...[
              Text(
                _remaining.toString(),
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 72,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Alerting your circle in…',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  color: Colors.white,
                ),
              ),
            ] else ...[
              const Text(
                'SOS sent!',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 32,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your circle has been alerted\nwith your location.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  color: Colors.white,
                ),
              ),
            ],

            const SizedBox(height: 60),

            if (!_triggered)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white, width: 2),
                    minimumSize: const Size(double.infinity, 52),
                  ),
                  onPressed: _cancel,
                  child: const Text(
                    "Cancel — I'm safe",
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),

            if (_triggered && !_loading)
              Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.danger,
                        minimumSize: const Size(double.infinity, 52),
                      ),
                      onPressed: () async {
                        if (_sessionId != null) {
                          await ref.read(apiServiceProvider).resolveSos(sessionId: _sessionId!);
                        }
                        if (mounted) context.pop();
                      },
                      child: const Text(
                        "I'm safe — resolve SOS",
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: const Text(
                      'Back to map',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
