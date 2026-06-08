import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/traffic_alert.dart';
import '../../providers/alert_provider.dart';
import '../../providers/auth_provider.dart';
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

  double? _lat;
  double? _lng;

  bool _submitting = false;
  bool _submitted = false;
  bool _submittedPending = false;

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

  String _titleForType(String type) {
    switch (type) {
      case 'blockage':
        return 'Road Blocked';
      case 'accident':
        return 'Accident';
      case 'construction':
        return 'Construction';
      case 'congestion':
        return 'Traffic Jam';
      case 'vip_movement':
        return 'VIP Movement';
      default:
        return 'Traffic Report';
    }
  }

  void _submit() async {
    if (_locationCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a location')),
      );
      return;
    }
    if (_lat == null || _lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please pick a location from the suggestions'),
        ),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final isPolice = auth.isPolice;
    final user = auth.currentUser;
    final description = [
      if (_detailCtrl.text.trim().isNotEmpty) _detailCtrl.text.trim(),
      if (_descCtrl.text.trim().isNotEmpty) _descCtrl.text.trim(),
    ].join('\n');

    final alert = TrafficAlert(
      id: '',
      title: _titleForType(_selectedType),
      description: description.isEmpty ? _titleForType(_selectedType) : description,
      severity: 'medium',
      city: 'Islamabad',
      location: _locationCtrl.text.trim(),
      area: _detailCtrl.text.trim(),
      type: _selectedType,
      status: 'pending',
      createdAt: DateTime.now(),
      reportedBy: isPolice ? 'police' : 'user',
      lat: _lat!,
      lng: _lng!,
      reporterPhone: _phoneCtrl.text.trim().isEmpty
          ? user?.phone
          : _phoneCtrl.text.trim(),
      reporterUserId: user?.id,
    );

    setState(() => _submitting = true);

    try {
      final created = await context.read<AlertProvider>().submitReport(alert);
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitted = true;
        _submittedPending = created.isPending;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit report: $e')),
      );
    }
  }

  void _reset() {
    setState(() {
      _submitted = false;
      _submittedPending = false;
      _selectedType = 'blockage';
      _locationCtrl.clear();
      _detailCtrl.clear();
      _descCtrl.clear();
      _phoneCtrl.clear();
      _lat = null;
      _lng = null;
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
                    Text(
                      _submittedPending
                          ? 'Report submitted'
                          : 'Report published',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1a1c1f),
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      _submittedPending
                          ? 'Your report has been sent to the Police Dashboard with status "Submitted by User". It will appear on the map after police approval.'
                          : 'Your incident report is now live on the map. Local police authorities may contact you to verify details if necessary.',
                      style: const TextStyle(
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
              padding: const EdgeInsets.fromLTRB(
                22,
                8,
                22,
                140,
              ), // extra bottom padding for navbar clearance
              children: [
                Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 24),
                        const Text(
                          'What happened?',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF01411c),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: Colors.black.withOpacity(0.05),
                            ),
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
                        const SizedBox(height: 24),
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
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF414941),
                          ),
                        ),
                        const SizedBox(height: 12),
                        RaastAutocomplete(
                          controller: _locationCtrl,
                          label: 'Search location',
                          hint: 'e.g. DHA Lahore, F-7 Islamabad...',
                          icon: Icons.location_on_rounded,
                          onSelected: (s) => setState(() {
                            _lat = s.coords.latitude;
                            _lng = s.coords.longitude;
                          }),
                        ),
                        const SizedBox(height: 12),
                        RaastTextField(
                          controller: _detailCtrl,
                          hintText: 'Extra detail (optional)',
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Description (optional)',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF01411c),
                          ),
                        ),
                        const SizedBox(height: 12),
                        RaastTextField(
                          controller: _descCtrl,
                          hintText:
                              'Add more details about what you\'re seeing...',
                          maxLines: 4,
                        ),
                        const SizedBox(height: 24),
                        RaastPhoneField(controller: _phoneCtrl),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF006E26),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 18),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(18),
                              ),
                              elevation: 0,
                            ),
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
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
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
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
