import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:io' show Platform;

class ApiService {
  static String get baseUrl {
    // Using the deployed production server with /api prefix
    return 'http://5.189.173.244:8090/api';
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
    debugPrint('🚀 API GET: $url');
    try {
      final response = await http.get(url, headers: _headers).timeout(const Duration(seconds: 30));
      debugPrint('✅ API RESPONSE [${response.statusCode}]: $endpoint');
      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ API ERROR: $endpoint -> $e');
      rethrow;
    }
  }

  static Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$endpoint');
    debugPrint('🚀 API POST: $url | Body: ${jsonEncode(body)}');
    try {
      final response = await http.post(url, headers: _headers, body: jsonEncode(body)).timeout(const Duration(seconds: 30));
      debugPrint('✅ API RESPONSE [${response.statusCode}]: $endpoint');
      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ API ERROR: $endpoint -> $e');
      rethrow;
    }
  }

  static Future<dynamic> patch(String endpoint, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$endpoint');
    debugPrint('🚀 API PATCH: $url');
    try {
      final response = await http.patch(url, headers: _headers, body: jsonEncode(body)).timeout(const Duration(seconds: 30));
      debugPrint('✅ API RESPONSE [${response.statusCode}]: $endpoint');
      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ API ERROR: $endpoint -> $e');
      rethrow;
    }
  }

  static Future<dynamic> delete(String endpoint) async {
    final url = Uri.parse('$baseUrl$endpoint');
    debugPrint('🚀 API DELETE: $url');
    try {
      final response = await http.delete(url, headers: _headers).timeout(const Duration(seconds: 30));
      debugPrint('✅ API RESPONSE [${response.statusCode}]: $endpoint');
      return _handleResponse(response);
    } catch (e) {
      debugPrint('❌ API ERROR: $endpoint -> $e');
      rethrow;
    }
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

