import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

void main() {
  Polyline(
    points: [LatLng(0, 0), LatLng(1, 1)],
    pattern: StrokePattern.dashed(segments: [8, 8]),
    color: Colors.red,
  );
}
