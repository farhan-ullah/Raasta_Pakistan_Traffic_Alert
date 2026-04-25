import 'package:flutter/material.dart';
import '../../widgets/raasta_widgets.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  String _selectedType = 'blockage';
  final _locationCtrl = TextEditingController();
  final _detailCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  bool _submitting = false;
  bool _submitted = false;

  final _types = [
    {'value': 'blockage', 'label': 'Road Blocked', 'icon': Icons.block_rounded},
    {'value': 'accident', 'label': 'Accident', 'icon': Icons.car_crash_rounded},
    {
      'value': 'construction',
      'label': 'Construction',
      'icon': Icons.construction_rounded,
    },
    {
      'value': 'congestion',
      'label': 'Traffic Jam',
      'icon': Icons.traffic_rounded,
    },
  ];

  void _submit() async {
    if (_locationCtrl.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please enter a location')));
      return;
    }

    setState(() => _submitting = true);

    // Simulate network request
    await Future.delayed(const Duration(seconds: 2));

    if (mounted) {
      setState(() {
        _submitting = false;
        _submitted = true;
      });
    }
  }

  void _reset() {
    setState(() {
      _submitted = false;
      _selectedType = 'blockage';
      _locationCtrl.clear();
      _detailCtrl.clear();
      _descCtrl.clear();
      _phoneCtrl.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_submitted) {
      return Scaffold(
        backgroundColor: const Color(0xFFf9f9fe),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 40),
              child: Container(
                constraints: const BoxConstraints(maxWidth: 400),
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: const Color(0xFFC0C9BE).withOpacity(0.35),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 96,
                      height: 96,
                      decoration: const BoxDecoration(
                        color: Color(0xFF82f98e),
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.check_circle_rounded,
                        size: 48,
                        color: Color(0xFF006E26),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Report submitted',
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1a1c1f),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Your incident report is now live. Local police authorities may contact you to verify details if necessary.',
                      style: TextStyle(
                        fontSize: 16,
                        color: Color(0xFF414941),
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF006E26),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                          elevation: 0,
                        ),
                        onPressed: _reset,
                        child: const Text(
                          'Report another',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFf9f9fe),
      body: Column(
        children: [
          const GradientHeader(
            title: 'Report incident',
            subtitle: 'Help others — verified reports appear on the map',
            icon: Icons.campaign_rounded,
            colors: [Color(0xFF006E26), Color(0xFF01411c)],
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(22, 8, 22, 120),
              children: [
                const SizedBox(height: 18),
                const Text(
                  'What happened?',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF01411c),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.black.withOpacity(0.05)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _buildTypeTile(_types[0])),
                          const SizedBox(width: 10),
                          Expanded(child: _buildTypeTile(_types[1])),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(child: _buildTypeTile(_types[2])),
                          const SizedBox(width: 10),
                          Expanded(child: _buildTypeTile(_types[3])),
                        ],
                      ),
                      const SizedBox(height: 10),
                      _buildTypeTile({
                        'value': 'vip_movement',
                        'label': 'VIP Movement',
                        'icon': Icons.star_rounded,
                      }, fullWidth: true),
                    ],
                  ),
                ),

                const SizedBox(height: 18),
                const Text(
                  'Location',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF01411c),
                  ),
                ),
                const Text(
                  'Search any place — region is set automatically.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF414941)),
                ),
                const SizedBox(height: 10),
                RaastTextField(
                  controller: _locationCtrl,
                  hintText: 'e.g. DHA Lahore, F-7 Islamabad...',
                  prefixIcon: const Icon(
                    Icons.location_on_rounded,
                    color: Color(0xFF717970),
                  ),
                ),
                const SizedBox(height: 12),
                RaastTextField(
                  controller: _detailCtrl,
                  hintText: 'Extra detail (optional)',
                ),

                const SizedBox(height: 18),
                const Text(
                  'Description (optional)',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF01411c),
                  ),
                ),
                const SizedBox(height: 10),
                RaastTextField(
                  controller: _descCtrl,
                  hintText: 'Add more details about what you\'re seeing...',
                  maxLines: 4,
                ),

                const SizedBox(height: 18),
                RaastPhoneField(controller: _phoneCtrl),
              ],
            ),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: 22,
          vertical: 80,
        ), // offset above the pill nav
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF006E26),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              elevation: 8,
              shadowColor: const Color(0xFF006E26).withOpacity(0.5),
            ),
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Text(
                        'Submit Report',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(width: 10),
                      Icon(Icons.send_rounded, size: 20),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeTile(Map<String, dynamic> type, {bool fullWidth = false}) {
    final isSelected = _selectedType == type['value'];

    return GestureDetector(
      onTap: () => setState(() => _selectedType = type['value']),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        height: fullWidth ? 88 : 100,
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF01411c) : const Color(0xFFf3f3f8),
          borderRadius: BorderRadius.circular(14),
        ),
        alignment: Alignment.center,
        child: fullWidth
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    type['icon'],
                    size: 28,
                    color: isSelected ? Colors.white : const Color(0xFF01411c),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    type['label'],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isSelected
                          ? Colors.white
                          : const Color(0xFF01411c),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    type['icon'],
                    size: 28,
                    color: isSelected ? Colors.white : const Color(0xFF01411c),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    type['label'],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isSelected
                          ? Colors.white
                          : const Color(0xFF01411c),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
