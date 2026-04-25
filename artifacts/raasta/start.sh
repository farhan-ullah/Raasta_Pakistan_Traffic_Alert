#!/bin/bash
set -e
cd /home/runner/workspace/artifacts/raasta
flutter pub get
exec flutter run -d web-server --web-port "${PORT:-20781}" --web-hostname 0.0.0.0
