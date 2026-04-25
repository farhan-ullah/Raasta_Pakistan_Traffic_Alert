// Conditional import: web impl on web, stub on mobile/desktop.
import 'platform/voice_platform_stub.dart'
    if (dart.library.html) 'platform/voice_platform_web.dart';

/// Multilingual voice navigation using the browser's Web Speech API (web only).
/// On mobile this is a no-op — integrate flutter_tts for native TTS if needed.
class VoiceService {
  static final VoiceService _i = VoiceService._();
  factory VoiceService() => _i;
  VoiceService._();

  String _language = 'ur'; // default: Urdu
  bool _enabled = true;
  bool get enabled => _enabled;
  void setEnabled(bool v) => _enabled = v;

  // Language display names
  static const Map<String, String> languages = {
    'ur':  'اردو  Urdu',
    'pa':  'پنجابی  Punjabi',
    'ps':  'پښتو  Pashto',
    'sd':  'سنڌي  Sindhi',
    'bal': 'بلوچی  Balochi',
    'en':  'English',
  };

  // BCP-47 lang tags for Speech API
  static const Map<String, String> _langTags = {
    'ur':  'ur-PK',
    'pa':  'pa-PK',
    'ps':  'ps-AF',
    'sd':  'sd-PK',
    'bal': 'ur-PK', // Balochi not in browsers — fall back to Urdu voice
    'en':  'en-US',
  };

  // Pre-translated navigation phrases
  static const Map<String, Map<String, String>> _phrases = {
    'route_found': {
      'ur':  'راستہ مل گیا۔ ناوی گیشن شروع ہو رہی ہے',
      'pa':  'راستہ لبھ گیا۔ نیوی گیشن شروع ہو رہی اے',
      'ps':  'لار وموندل شوه۔ لارښوونه پیلیږي',
      'sd':  'رستو مليو. رھنمائي شروع ٿي رهي آهي',
      'bal': 'راهه گوشت بیت. گپتن شروع بیت',
      'en':  'Route found. Navigation is starting.',
    },
    'blockage_ahead': {
      'ur':  'آگے راستہ بند ہے۔ متبادل راستہ لینے کا مشورہ ہے',
      'pa':  'اگے سڑک بند اے۔ ہور راستہ لینا بہتر اے',
      'ps':  'مخکې لار بنده ده۔ بل لار واخله',
      'sd':  'اڳيان رستو بند آهي۔ ٻيو رستو وٺو',
      'bal': 'پیش راهه بند ئه۔ دگه راهه گپ',
      'en':  'Road ahead is blocked. Please take an alternate route.',
    },
    'alt_selected': {
      'ur':  'متبادل راستہ منتخب کیا گیا۔ نئی ناوی گیشن شروع ہو رہی ہے',
      'pa':  'ہور راستہ چنیا گیا۔ نئی نیوی گیشن شروع اے',
      'ps':  'بله لار غوره شوه۔ نوې لارښوونه پیلیږي',
      'sd':  'ٻيو رستو چونڊيو ويو۔ نئين رھنمائي شروع ٿي رهي آهي',
      'bal': 'دگه راهه گوشت بیت۔ نون گپتن شروع بیت',
      'en':  'Alternate route selected. New navigation starting.',
    },
    'turn_left': {
      'ur':  'بائیں مڑیں',
      'pa':  'کھبے مڑو',
      'ps':  'کیڼ لوري وګرزه',
      'sd':  'کاٻي پاسي موڙ وٺو',
      'bal': 'چپ گوارش',
      'en':  'Turn left.',
    },
    'turn_right': {
      'ur':  'دائیں مڑیں',
      'pa':  'سجے مڑو',
      'ps':  'ښي لوري وګرزه',
      'sd':  'ساڄي پاسي موڙ وٺو',
      'bal': 'راست گوارش',
      'en':  'Turn right.',
    },
    'arrived': {
      'ur':  'آپ اپنی منزل پر پہنچ گئے',
      'pa':  'تسی اپنی منزل تے پہنچ گئے',
      'ps':  'تاسو خپل موخه ته ورسیدئ',
      'sd':  'توهان پنهنجي منزل تي پهتا آهيو',
      'bal': 'تو موکسد ءَ رست بیتی',
      'en':  'You have arrived at your destination.',
    },
    'recalculating': {
      'ur':  'راستہ دوبارہ حساب ہو رہا ہے',
      'pa':  'راستہ دوبارہ حساب ہو رہا اے',
      'ps':  'لار بیاکتل کیږي',
      'sd':  'رستو ٻيهر حساب ڪيو وڃي رهيو آهي',
      'bal': 'راهه دگه باری حساب بیت',
      'en':  'Recalculating route.',
    },
    'vip_movement': {
      'ur':  'آگے وی آئی پی نقل و حرکت ہے، براہ کرم انتظار کریں',
      'pa':  'اگے وی آئی پی حرکت اے، انتظار کرو',
      'ps':  'مخکې د وی آی پی حرکت دی، انتظار وکړه',
      'sd':  'اڳيان وي آءِ پي جي حرڪت آهي، مھرباني ڪري انتظار ڪريو',
      'bal': 'پیش وی آی پی حرکت انت۔ صبر بکن',
      'en':  'VIP movement ahead. Please wait.',
    },
  };

  String get currentLanguage => _language;
  String get currentLanguageName => languages[_language] ?? 'Urdu';

  void setLanguage(String lang) => _language = lang;

  bool _isSpeaking = false;
  bool get isSpeaking => _isSpeaking;

  void speak(String phraseKey) {
    if (!_enabled) return;
    final phrase = _phrases[phraseKey]?[_language] ?? _phrases[phraseKey]?['en'] ?? phraseKey;
    _speakText(phrase);
  }

  void speakText(String text) => _speakText(text);

  void _speakText(String text) {
    final tag = _langTags[_language] ?? 'ur-PK';
    _isSpeaking = true;
    // Delegates to web impl or no-op stub depending on platform
    platformSpeak(text, tag);
    // Note: _isSpeaking reset is best-effort on mobile (no onEnd event from stub)
    Future.delayed(const Duration(seconds: 5), () => _isSpeaking = false);
  }

  void stop() {
    platformStop();
    _isSpeaking = false;
  }

  List<String> availableVoiceNames() => platformGetVoices();
}
