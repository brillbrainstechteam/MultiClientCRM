// Indian festivals & jewellery-relevant occasions, indicative dates for 2026.
// Shown read-only on the planning calendar so teams can plan campaigns around
// them. Lunar-calendar dates shift slightly year to year — treat as a guide.

export interface Festival { date: string; name: string; jewellery?: boolean }

export const FESTIVALS_2026: Festival[] = [
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal', jewellery: true },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-02-15', name: 'Maha Shivratri' },
  { date: '2026-02-21', name: 'Vasant Panchami' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-03-19', name: 'Gudi Padwa / Ugadi', jewellery: true },
  { date: '2026-03-26', name: 'Ram Navami' },
  { date: '2026-03-21', name: 'Eid al-Fitr' },
  { date: '2026-04-21', name: 'Akshaya Tritiya', jewellery: true },
  { date: '2026-05-01', name: 'Buddha Purnima' },
  { date: '2026-06-19', name: 'Jagannath Rath Yatra' },
  { date: '2026-08-28', name: 'Raksha Bandhan', jewellery: true },
  { date: '2026-09-04', name: 'Janmashtami' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', jewellery: true },
  { date: '2026-08-26', name: 'Onam' },
  { date: '2026-10-11', name: 'Navratri begins', jewellery: true },
  { date: '2026-10-20', name: 'Dussehra', jewellery: true },
  { date: '2026-10-29', name: 'Karva Chauth', jewellery: true },
  { date: '2026-11-06', name: 'Dhanteras', jewellery: true },
  { date: '2026-11-08', name: 'Diwali', jewellery: true },
  { date: '2026-11-11', name: 'Bhai Dooj' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas' },
];
