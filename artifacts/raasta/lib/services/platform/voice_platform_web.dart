// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Speaks [text] using the browser Web Speech API with [langTag] (BCP-47).
void platformSpeak(String text, String langTag) {
  try {
    html.window.speechSynthesis?.cancel();
    final u = html.SpeechSynthesisUtterance(text);
    u.lang = langTag;
    u.rate = 0.92;
    u.pitch = 1.05;
    u.volume = 1.0;
    html.window.speechSynthesis?.speak(u);
  } catch (_) {}
}

/// Cancels any ongoing speech.
void platformStop() {
  try {
    html.window.speechSynthesis?.cancel();
  } catch (_) {}
}

/// Returns available voice names from the browser.
List<String> platformGetVoices() {
  try {
    return html.window.speechSynthesis
            ?.getVoices()
            .map((v) => '${v.name} (${v.lang})')
            .toList() ??
        [];
  } catch (_) {
    return [];
  }
}

void platformSetListeners(Function() onStart, Function() onEnd) {
  // Web implementation for listeners can be added here if needed.
  // For now, we'll rely on the existing behavior.
}
