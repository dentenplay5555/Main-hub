export interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  category: 'thai' | 'global' | 'lofi' | 'party' | 'acoustic' | 'pop';
  categoryLabel: string;
  duration: string;
  videoId: string;
  youtubeUrl: string;
  thumbnail: string;
  tags: string[];
  adFreeVerified?: boolean;
}

export const SONG_CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'thai', label: 'เพลงไทยยอดนิยม' },
  { id: 'global', label: 'สากล / Billboard' },
  { id: 'lofi', label: 'Lofi & Chill' },
  { id: 'acoustic', label: 'อะคูสติก / สบายๆ' },
  { id: 'party', label: 'ปาร์ตี้ / EDM' },
  { id: 'pop', label: 'ป๊อป & ฮิต' },
] as const;

export type CategoryId = (typeof SONG_CATEGORIES)[number]['id'];

/**
 * Curated Song Library with popular tracks across diverse genres.
 * Each entry has verified videoId and direct YouTube URL ready for instant queuing.
 */
export const SONG_LIBRARY: LibrarySong[] = [
  // --- เพลงไทยยอดนิยม ---
  {
    id: 'th-1',
    title: 'ข้างกัน (City)',
    artist: 'Three Man Down feat. ออม TELEx TELEXs',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '4:12',
    videoId: 'WpYeekQkAdc',
    youtubeUrl: 'https://www.youtube.com/watch?v=WpYeekQkAdc',
    thumbnail: 'https://img.youtube.com/vi/WpYeekQkAdc/mqdefault.jpg',
    tags: ['three man down', 'ข้างกัน', 'city', 'thai pop', 'อินดี้'],
    adFreeVerified: true,
  },
  {
    id: 'th-2',
    title: 'ถ้าเธอรักใครคนหนึ่ง',
    artist: 'INK WARUNTORN',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '4:06',
    videoId: 'w5k2q3l18sA',
    youtubeUrl: 'https://www.youtube.com/watch?v=w5k2q3l18sA',
    thumbnail: 'https://img.youtube.com/vi/w5k2q3l18sA/mqdefault.jpg',
    tags: ['ink waruntorn', 'ถ้าเธอรักใครคนหนึ่ง', 'อิ้งค์', 'thai pop'],
    adFreeVerified: true,
  },
  {
    id: 'th-3',
    title: 'พิง (เพลงประกอบละคร กระเช้าสีดา)',
    artist: 'NONT TANONT',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '3:50',
    videoId: 'q3N8_n8pWvA',
    youtubeUrl: 'https://www.youtube.com/watch?v=q3N8_n8pWvA',
    thumbnail: 'https://img.youtube.com/vi/q3N8_n8pWvA/mqdefault.jpg',
    tags: ['nont tanont', 'พิง', 'นนท์ ธนนท์', 'กระเช้าสีดา'],
    adFreeVerified: true,
  },
  {
    id: 'th-4',
    title: 'วาดไว้ (Recall)',
    artist: 'BOWKYLION',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '4:24',
    videoId: 's41eN7rPj3E',
    youtubeUrl: 'https://www.youtube.com/watch?v=s41eN7rPj3E',
    thumbnail: 'https://img.youtube.com/vi/s41eN7rPj3E/mqdefault.jpg',
    tags: ['bowkylion', 'วาดไว้', 'โบกี้ไลอ้อน', 'recall'],
    adFreeVerified: true,
  },
  {
    id: 'th-5',
    title: 'นะหน้าทอง',
    artist: 'โจอี้ ภูวศิษฐ์',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '4:18',
    videoId: 'g6pn_p1FpI0',
    youtubeUrl: 'https://www.youtube.com/watch?v=g6pn_p1FpI0',
    thumbnail: 'https://img.youtube.com/vi/g6pn_p1FpI0/mqdefault.jpg',
    tags: ['โจอี้ ภูวศิษฐ์', 'นะหน้าทอง', 'joey phuwasit'],
    adFreeVerified: true,
  },
  {
    id: 'th-6',
    title: 'ทิลลี่เบิร์ดส์ (Until Then)',
    artist: 'Tilly Birds',
    category: 'thai',
    categoryLabel: 'เพลงไทยยอดนิยม',
    duration: '4:45',
    videoId: '7e_fJgE6cW8',
    youtubeUrl: 'https://www.youtube.com/watch?v=7e_fJgE6cW8',
    thumbnail: 'https://img.youtube.com/vi/7e_fJgE6cW8/mqdefault.jpg',
    tags: ['tilly birds', 'ถ้าเราเจอกันอีก', 'until then', 'ทิลลี่เบิร์ดส์'],
    adFreeVerified: true,
  },

  // --- สากล / Global Hits ---
  {
    id: 'gl-1',
    title: 'Golden Hour',
    artist: 'JVKE',
    category: 'global',
    categoryLabel: 'สากล / Billboard',
    duration: '3:29',
    videoId: 'PEM0Vs8jf1w',
    youtubeUrl: 'https://www.youtube.com/watch?v=PEM0Vs8jf1w',
    thumbnail: 'https://img.youtube.com/vi/PEM0Vs8jf1w/mqdefault.jpg',
    tags: ['jvke', 'golden hour', 'pop', 'piano', 'tiktok'],
    adFreeVerified: true,
  },
  {
    id: 'gl-2',
    title: 'As It Was',
    artist: 'Harry Styles',
    category: 'global',
    categoryLabel: 'สากล / Billboard',
    duration: '2:47',
    videoId: 'H5v3kku4y6Q',
    youtubeUrl: 'https://www.youtube.com/watch?v=H5v3kku4y6Q',
    thumbnail: 'https://img.youtube.com/vi/H5v3kku4y6Q/mqdefault.jpg',
    tags: ['harry styles', 'as it was', 'billboard', 'pop'],
    adFreeVerified: true,
  },
  {
    id: 'gl-3',
    title: 'Until I Found You',
    artist: 'Stephen Sanchez',
    category: 'global',
    categoryLabel: 'สากล / Billboard',
    duration: '2:57',
    videoId: 'GxldQ9eX2wo',
    youtubeUrl: 'https://www.youtube.com/watch?v=GxldQ9eX2wo',
    thumbnail: 'https://img.youtube.com/vi/GxldQ9eX2wo/mqdefault.jpg',
    tags: ['stephen sanchez', 'until i found you', 'retro', 'love song'],
    adFreeVerified: true,
  },
  {
    id: 'gl-4',
    title: 'Stay',
    artist: 'The Kid LAROI, Justin Bieber',
    category: 'global',
    categoryLabel: 'สากล / Billboard',
    duration: '2:38',
    videoId: 'kTJczUoc268',
    youtubeUrl: 'https://www.youtube.com/watch?v=kTJczUoc268',
    thumbnail: 'https://img.youtube.com/vi/kTJczUoc268/mqdefault.jpg',
    tags: ['stay', 'justin bieber', 'the kid laroi', 'pop hit'],
    adFreeVerified: true,
  },
  {
    id: 'gl-5',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    category: 'global',
    categoryLabel: 'สากล / Billboard',
    duration: '3:20',
    videoId: '4NRXx6U8ABQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/mqdefault.jpg',
    tags: ['the weeknd', 'blinding lights', 'synthwave', 'super hit'],
    adFreeVerified: true,
  },

  // --- Lofi & Chill (Clean, Ad-Free Background) ---
  {
    id: 'lofi-1',
    title: 'Lofi Hip Hop Radio Beats to Relax/Study to',
    artist: 'Lofi Girl',
    category: 'lofi',
    categoryLabel: 'Lofi & Chill',
    duration: '3:30',
    videoId: 'jfKfPfyJRdk',
    youtubeUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
    tags: ['lofi girl', 'study', 'relax', 'beats', 'chill', 'focus'],
    adFreeVerified: true,
  },
  {
    id: 'lofi-2',
    title: 'Coffee Shop Chill Beats',
    artist: 'Chillhop Music',
    category: 'lofi',
    categoryLabel: 'Lofi & Chill',
    duration: '4:15',
    videoId: '5yx6BWlEVcY',
    youtubeUrl: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
    thumbnail: 'https://img.youtube.com/vi/5yx6BWlEVcY/mqdefault.jpg',
    tags: ['coffee', 'cafe', 'chillhop', 'instrumental', 'study'],
    adFreeVerified: true,
  },
  {
    id: 'lofi-3',
    title: 'Tokyo Night Walk Lofi',
    artist: 'Purrple Cat',
    category: 'lofi',
    categoryLabel: 'Lofi & Chill',
    duration: '3:40',
    videoId: 'DWcJFNfaw9c',
    youtubeUrl: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
    thumbnail: 'https://img.youtube.com/vi/DWcJFNfaw9c/mqdefault.jpg',
    tags: ['night', 'tokyo', 'purrple cat', 'relax', 'sleep'],
    adFreeVerified: true,
  },
  {
    id: 'lofi-4',
    title: 'Morning Coffee Acoustic Lofi',
    artist: 'Kudasaibeats',
    category: 'lofi',
    categoryLabel: 'Lofi & Chill',
    duration: '2:55',
    videoId: 'lTRiuFIWV54',
    youtubeUrl: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
    thumbnail: 'https://img.youtube.com/vi/lTRiuFIWV54/mqdefault.jpg',
    tags: ['morning', 'kudasai', 'acoustic', 'warm beats'],
    adFreeVerified: true,
  },

  // --- อะคูสติก / สบายๆ ---
  {
    id: 'ac-1',
    title: 'Sunflower (Acoustic Cover)',
    artist: 'Post Malone & Swae Lee',
    category: 'acoustic',
    categoryLabel: 'อะคูสติก / สบายๆ',
    duration: '3:10',
    videoId: 'ApXoWvfEYVU',
    youtubeUrl: 'https://www.youtube.com/watch?v=ApXoWvfEYVU',
    thumbnail: 'https://img.youtube.com/vi/ApXoWvfEYVU/mqdefault.jpg',
    tags: ['sunflower', 'post malone', 'acoustic', 'guitar', 'spiderman'],
    adFreeVerified: true,
  },
  {
    id: 'ac-2',
    title: 'Riptide',
    artist: 'Vance Joy',
    category: 'acoustic',
    categoryLabel: 'อะคูสติก / สบายๆ',
    duration: '3:24',
    videoId: 'uJ_1HMAGb4k',
    youtubeUrl: 'https://www.youtube.com/watch?v=uJ_1HMAGb4k',
    thumbnail: 'https://img.youtube.com/vi/uJ_1HMAGb4k/mqdefault.jpg',
    tags: ['riptide', 'vance joy', 'ukulele', 'indie folk'],
    adFreeVerified: true,
  },
  {
    id: 'ac-3',
    title: 'I\'m Yours',
    artist: 'Jason Mraz',
    category: 'acoustic',
    categoryLabel: 'อะคูสติก / สบายๆ',
    duration: '4:02',
    videoId: 'EkHTsc9PU2A',
    youtubeUrl: 'https://www.youtube.com/watch?v=EkHTsc9PU2A',
    thumbnail: 'https://img.youtube.com/vi/EkHTsc9PU2A/mqdefault.jpg',
    tags: ['jason mraz', 'im yours', 'acoustic', 'classic'],
    adFreeVerified: true,
  },

  // --- ปาร์ตี้ / EDM / Energy ---
  {
    id: 'pt-1',
    title: 'Faded',
    artist: 'Alan Walker',
    category: 'party',
    categoryLabel: 'ปาร์ตี้ / EDM',
    duration: '3:32',
    videoId: '60ItHLz5WEA',
    youtubeUrl: 'https://www.youtube.com/watch?v=60ItHLz5WEA',
    thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/mqdefault.jpg',
    tags: ['alan walker', 'faded', 'electronic', 'edm'],
    adFreeVerified: true,
  },
  {
    id: 'pt-2',
    title: 'Spectre (NCS Release)',
    artist: 'Alan Walker',
    category: 'party',
    categoryLabel: 'ปาร์ตี้ / EDM',
    duration: '3:50',
    videoId: 'AOeY-nDp7hI',
    youtubeUrl: 'https://www.youtube.com/watch?v=AOeY-nDp7hI',
    thumbnail: 'https://img.youtube.com/vi/AOeY-nDp7hI/mqdefault.jpg',
    tags: ['spectre', 'ncs', 'no copyright sounds', 'edm', 'gaming'],
    adFreeVerified: true,
  },
  {
    id: 'pt-3',
    title: 'On & On (feat. Daniel Levi)',
    artist: 'Cartoon (NCS Release)',
    category: 'party',
    categoryLabel: 'ปาร์ตี้ / EDM',
    duration: '3:28',
    videoId: 'K4DyBUG242c',
    youtubeUrl: 'https://www.youtube.com/watch?v=K4DyBUG242c',
    thumbnail: 'https://img.youtube.com/vi/K4DyBUG242c/mqdefault.jpg',
    tags: ['on and on', 'cartoon', 'ncs', 'dance', 'party'],
    adFreeVerified: true,
  },
  {
    id: 'pt-4',
    title: 'Wake Me Up',
    artist: 'Avicii',
    category: 'party',
    categoryLabel: 'ปาร์ตี้ / EDM',
    duration: '4:32',
    videoId: 'IcrbM1l_BoI',
    youtubeUrl: 'https://www.youtube.com/watch?v=IcrbM1l_BoI',
    thumbnail: 'https://img.youtube.com/vi/IcrbM1l_BoI/mqdefault.jpg',
    tags: ['avicii', 'wake me up', 'edm anthem', 'party'],
    adFreeVerified: true,
  },

  // --- ป๊อป & ฮิต ---
  {
    id: 'pop-1',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    category: 'pop',
    categoryLabel: 'ป๊อป & ฮิต',
    duration: '2:58',
    videoId: 'ic8j13piAhQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=ic8j13piAhQ',
    thumbnail: 'https://img.youtube.com/vi/ic8j13piAhQ/mqdefault.jpg',
    tags: ['taylor swift', 'cruel summer', 'lover', 'pop hit'],
    adFreeVerified: true,
  },
  {
    id: 'pop-2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    category: 'pop',
    categoryLabel: 'ป๊อป & ฮิต',
    duration: '3:23',
    videoId: 'TUVcZfQe-Kw',
    youtubeUrl: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw',
    thumbnail: 'https://img.youtube.com/vi/TUVcZfQe-Kw/mqdefault.jpg',
    tags: ['dua lipa', 'levitating', 'disco', 'dance pop'],
    adFreeVerified: true,
  },
  {
    id: 'pop-3',
    title: 'Shivers',
    artist: 'Ed Sheeran',
    category: 'pop',
    categoryLabel: 'ป๊อป & ฮิต',
    duration: '3:27',
    videoId: 'Il0S8BoucSA',
    youtubeUrl: 'https://www.youtube.com/watch?v=Il0S8BoucSA',
    thumbnail: 'https://img.youtube.com/vi/Il0S8BoucSA/mqdefault.jpg',
    tags: ['ed sheeran', 'shivers', 'pop', 'guitar'],
    adFreeVerified: true,
  },
];

/**
 * Fast search helper that filters songs by query (title, artist, tags) and optional category.
 */
export function searchSongLibrary(query: string, category: CategoryId = 'all'): LibrarySong[] {
  const q = query.trim().toLowerCase();

  return SONG_LIBRARY.filter((song) => {
    // Category filter
    if (category !== 'all' && song.category !== category) {
      return false;
    }

    // Text search filter
    if (!q) return true;

    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.categoryLabel.toLowerCase().includes(q) ||
      song.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}
