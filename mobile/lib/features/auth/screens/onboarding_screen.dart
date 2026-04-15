import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slides = [
    _OnboardingSlide(
      icon: Icons.family_restroom,
      title: 'Stay Connected to\nthe People You Love',
      body: 'See where family members are on a live map — always with their permission.',
      color: Color(0xFF4F46E5),
    ),
    _OnboardingSlide(
      icon: Icons.lock_outline,
      title: 'You Control\nYour Privacy',
      body: 'Share your location only when you choose. Pause or stop anytime, instantly.',
      color: Color(0xFF10B981),
    ),
    _OnboardingSlide(
      icon: Icons.notifications_active_outlined,
      title: 'Geofence Alerts\nThat Matter',
      body: 'Know when loved ones arrive home, school, or work — no constant checking.',
      color: Color(0xFF3B82F6),
    ),
    _OnboardingSlide(
      icon: Icons.sos,
      title: 'SOS When\nEvery Second Counts',
      body: 'One tap sends your live location to your circle in an emergency.',
      color: Color(0xFFEF4444),
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () => context.go('/auth/sign-in'),
                child: const Text('Skip'),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _slides.length,
                itemBuilder: (_, i) => _SlideView(slide: _slides[i]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Column(
                children: [
                  _PageDots(count: _slides.length, current: _page),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _slides[_page].color,
                    ),
                    onPressed: () {
                      if (_page < _slides.length - 1) {
                        _controller.nextPage(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeOut,
                        );
                      } else {
                        context.go('/auth/sign-up');
                      }
                    },
                    child: Text(_page < _slides.length - 1 ? 'Next' : 'Get Started'),
                  ),
                  if (_page == _slides.length - 1) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.go('/auth/sign-in'),
                      child: const Text('Already have an account? Sign in'),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingSlide {
  const _OnboardingSlide({
    required this.icon,
    required this.title,
    required this.body,
    required this.color,
  });
  final IconData icon;
  final String title;
  final String body;
  final Color color;
}

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide});
  final _OnboardingSlide slide;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: slide.color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(slide.icon, size: 60, color: slide.color),
            ),
            const SizedBox(height: 40),
            Text(
              slide.title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.displayMedium,
            ),
            const SizedBox(height: 16),
            Text(
              slide.body,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ],
        ),
      );
}

class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.current});
  final int count;
  final int current;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(
          count,
          (i) => AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 4),
            width: i == current ? 20 : 8,
            height: 8,
            decoration: BoxDecoration(
              color: i == current
                  ? AppColors.primary
                  : AppColors.border,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
      );
}
