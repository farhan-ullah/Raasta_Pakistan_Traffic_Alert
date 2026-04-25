import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/alert_provider.dart';
import 'providers/police_provider.dart';
import 'providers/city_admin_provider.dart';
import 'providers/route_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/main_screen.dart';
import 'services/notification_service.dart';
import 'theme/app_theme.dart';
import 'models/user.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final authProvider = AuthProvider();
  await authProvider.init();

  // Fire notification init in background — never block app startup
  NotificationService().initialize();
  
  runApp(RaastaApp(authProvider: authProvider));
}

class RaastaApp extends StatelessWidget {
  final AuthProvider authProvider;
  const RaastaApp({super.key, required this.authProvider});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider(create: (_) => AlertProvider()),
        ChangeNotifierProvider(create: (_) => PoliceProvider()),
        ChangeNotifierProvider(create: (_) => CityAdminProvider()),
        ChangeNotifierProvider(create: (_) => RouteProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          Color primaryColor = AppTheme.primaryRed;
          if (auth.currentUser != null) {
            if (auth.currentUser!.role == UserRole.police) {
              primaryColor = const Color(0xFF0D47A1);
            } else if (auth.currentUser!.role == UserRole.user) {
              primaryColor = const Color(0xFF757575);
            }
          }
          return MaterialApp(
            title: 'Raasta',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.getLightTheme(primaryColor),
            home: AlertBannerOverlay(child: const AuthGate()),
          );
        },
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.currentUser != null) {
          return const MainScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
