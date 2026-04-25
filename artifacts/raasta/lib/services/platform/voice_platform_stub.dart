/// Stub for mobile/desktop — Web Speech API not available.
void platformSpeak(String text, String langTag) {
  // No-op on mobile. Integrate flutter_tts here if mobile TTS is needed.
}

void platformStop() {
  // No-op on mobile.
}

List<String> platformGetVoices() => [];
