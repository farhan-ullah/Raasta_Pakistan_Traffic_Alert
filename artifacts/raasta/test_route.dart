import 'package:http/http.dart' as http;

void main() async {
  final query = "Islamabad";
  final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
    'q': query,
    'format': 'json',
    'limit': '6',
    'countrycodes': 'pk',
    'viewbox': '72.5,32.0,75.0,34.5',
    'bounded': '0',
  });
  final res = await http.get(
    uri,
    headers: {'User-Agent': 'Raasta-Traffic-PK/1.0'},
  );
  print("Status: ${res.statusCode}");
  print("Body: ${res.body}");
}
