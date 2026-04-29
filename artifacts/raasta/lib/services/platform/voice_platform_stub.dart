import 'package:flutter_tts/flutter_tts.dart';

final FlutterTts _tts = FlutterTts();
Function()? _onStart;
Function()? _onEnd;

void platformSetListeners(Function() onStart, Function() onEnd) {
  _onStart = onStart;
  _onEnd = onEnd;
  
  _tts.setStartHandler(() {
    if (_onStart != null) _onStart!();
  });
  
  _tts.setCompletionHandler(() {
    if (_onEnd != null) _onEnd!();
  });
  
  _tts.setErrorHandler((msg) {
    if (_onEnd != null) _onEnd!();
  });
}

/// Speaks [text] using flutter_tts with [langTag].
void platformSpeak(String text, String langTag) async {
  await _tts.setLanguage(langTag);
  // Slightly slower rate for clarity in navigation
  await _tts.setSpeechRate(0.45); 
  await _tts.setPitch(1.0);
  await _tts.speak(text);
}

void platformStop() async {
  await _tts.stop();
}

List<String> platformGetVoices() => [];
