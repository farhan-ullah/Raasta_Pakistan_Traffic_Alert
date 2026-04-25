import 'package:flutter/material.dart';

// ═══════════════════════════════════════════════════════════════
//  Pakistani cultural photo strip — real network images
// ═══════════════════════════════════════════════════════════════

class PakistanCultureStrip extends StatelessWidget {
  const PakistanCultureStrip({super.key});

  static const _items = [
    _Item(
      urdu: 'پاکستان',
      label: 'Flag',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Pakistan.svg/480px-Flag_of_Pakistan.svg.png',
      icon: Icons.flag_rounded,
      color: Color(0xFF1B5E20),
    ),
    _Item(
      urdu: 'قائدِ اعظم',
      label: 'Jinnah',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Jinnah1945c.jpg/220px-Jinnah1945c.jpg',
      icon: Icons.person_rounded,
      color: Color(0xFF4A148C),
    ),
    _Item(
      urdu: 'فیصل مسجد',
      label: 'Faisal Mosque',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Faisal_Mosque_Islamabad_2.jpg/320px-Faisal_Mosque_Islamabad_2.jpg',
      icon: Icons.mosque_rounded,
      color: Color(0xFF0D47A1),
    ),
    _Item(
      urdu: 'گھوڑا',
      label: 'Marwari Horse',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Marwari_mare.jpg/220px-Marwari_mare.jpg',
      icon: Icons.pets_rounded,
      color: Color(0xFF4E342E),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 118,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, i) => _PhotoCard(item: _items[i]),
      ),
    );
  }
}

class _Item {
  final String urdu, label, url;
  final IconData icon;
  final Color color;
  const _Item({required this.urdu, required this.label, required this.url, required this.icon, required this.color});
}

class _PhotoCard extends StatelessWidget {
  final _Item item;
  const _PhotoCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.35), width: 1.5),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(19),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Real photo
            Image.network(
              item.url,
              fit: BoxFit.cover,
              loadingBuilder: (_, child, progress) {
                if (progress == null) return child;
                return Container(color: item.color.withOpacity(0.7), child: const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white54))));
              },
              errorBuilder: (_, __, ___) => Container(
                color: item.color,
                child: Center(child: Icon(item.icon, color: Colors.white.withOpacity(0.8), size: 32)),
              ),
            ),
            // Gradient overlay at bottom
            Positioned(
              left: 0, right: 0, bottom: 0,
              child: Container(
                padding: const EdgeInsets.fromLTRB(6, 18, 6, 8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.transparent, Colors.black.withOpacity(0.72)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Text(
                  item.urdu,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.2),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
