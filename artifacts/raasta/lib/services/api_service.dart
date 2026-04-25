import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:io' show Platform;

class ApiService {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    // Handle Android emulator to access host localhost
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  // Token for Police/Auth
  static String? authToken;

  static Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (authToken != null) {
      headers['Authorization'] = 'Bearer $authToken';
    }
    return headers;
  }

  static Future<dynamic> get(String endpoint) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.get(url, headers: _headers);
    return _handleResponse(response);
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.post(url, headers: _headers, body: jsonEncode(body));
    return _handleResponse(response);
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.patch(url, headers: _headers, body: jsonEncode(body));
    return _handleResponse(response);
  }

  static Future<dynamic> delete(String endpoint) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final response = await http.delete(url, headers: _headers);
    return _handleResponse(response);
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isNotEmpty) {
        return jsonDecode(response.body);
      }
      return null;
    } else {
      String errMsg = 'Request failed with status: ${response.statusCode}';
      try {
        final errJson = jsonDecode(response.body);
        if (errJson['error'] != null) {
          errMsg = errJson['error'];
        }
      } catch (_) {}
      throw Exception(errMsg);
    }
  }
}
