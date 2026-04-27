import 'dart:convert';
import 'dart:io';

void main() async {
  final jsonString = File('/tmp/plan_res.json').readAsStringSync();
  final res = jsonDecode(jsonString);

  try {
    final rec = res['recommended'];
    final recCoords = (rec['geometry']['coordinates'] as List)
        .map((c) {
          final lst = c as List;
          return [ (lst[1] as num).toDouble(), (lst[0] as num).toDouble() ];
        })
        .toList();
    print('Parsed ${recCoords.length} coordinates successfully.');
  } catch (e) {
    print('Error: $e');
  }
}
