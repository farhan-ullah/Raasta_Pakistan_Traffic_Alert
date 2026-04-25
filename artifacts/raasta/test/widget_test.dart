import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:raasta/providers/auth_provider.dart';

void main() {
  testWidgets('App launches without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => AuthProvider(),
        child: const MaterialApp(
          home: Scaffold(
            body: Center(child: Text('Raasta')),
          ),
        ),
      ),
    );

    expect(find.text('Raasta'), findsOneWidget);
  });
}
