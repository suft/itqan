export interface Reciter {
	arabicName: string;
	englishName: string;
	folder: string;
}

/** Reciters offered in the quiz; the first is the default. Saved choices are stored by folder, not position. */
export const RECITERS: readonly Reciter[] = [
	{ arabicName: 'سعد الغامدي', englishName: 'Saad Al-Ghamdi', folder: 'Ghamadi_40kbps' },
	{ arabicName: 'عبد الباسط (تجويد)', englishName: 'Abdul Basit (Mujawwad)', folder: 'Abdul_Basit_Mujawwad_128kbps' },
	{ arabicName: 'عبد الباسط (ترتيل)', englishName: 'Abdul Basit (Murattal)', folder: 'Abdul_Basit_Murattal_64kbps' },
	{ arabicName: 'عبد الرحمن السديس', englishName: 'Abdurrahman As-Sudais', folder: 'Abdurrahmaan_As-Sudais_64kbps' },
	{ arabicName: 'أبو بكر الشاطري', englishName: 'Abu Bakr Al-Shatri', folder: 'Abu_Bakr_Ash-Shaatree_64kbps' },
	{ arabicName: 'مشاري العفاسي', englishName: 'Mishary Alafasy', folder: 'Alafasy_64kbps' },
	{ arabicName: 'محمود الحصري (معلم)', englishName: 'Mahmoud Al-Husary (Muallim)', folder: 'Husary_Muallim_128kbps' },
	{ arabicName: 'محمود الحصري (ترتيل)', englishName: 'Mahmoud Al-Husary (Murattal)', folder: 'Husary_64kbps' },
	{ arabicName: 'محمود الحصري (تجويد)', englishName: 'Mahmoud Al-Husary (Mujawwad)', folder: 'Husary_Mujawwad_64kbps' },
	{ arabicName: 'ماهر المعيقلي', englishName: 'Maher Al-Muaiqly', folder: 'Maher_AlMuaiqly_64kbps' },
	{ arabicName: 'خالد القحطاني', englishName: 'Khalid Al-Qahtani', folder: 'Khaalid_Abdullaah_al-Qahtaanee_192kbps' },
	{ arabicName: 'عبدالله بصفر', englishName: 'Abdullah Basfar', folder: 'Abdullah_Basfar_64kbps' },
	{ arabicName: 'محسن القاسم', englishName: 'Muhsin Al-Qasim', folder: 'Muhsin_Al_Qasim_192kbps' },
	{ arabicName: 'ياسر الدوسري', englishName: 'Yasser Al-Dosari', folder: 'Yasser_Ad-Dussary_128kbps' },
	{ arabicName: 'سعود الشريم', englishName: 'Saud Al-Shuraim', folder: 'Saood_ash-Shuraym_64kbps' },
	{ arabicName: 'محمد جبريل', englishName: 'Muhammad Jibreel', folder: 'Muhammad_Jibreel_64kbps' },
	{ arabicName: 'محمود علي البنا', englishName: 'Mahmoud Ali Al-Banna', folder: 'mahmoud_ali_al_banna_32kbps' },
	{
		arabicName: 'أحمد علي العجمي',
		englishName: 'Ahmed Al-Ajmi',
		folder: 'Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com'
	},
	{
		arabicName: 'محمد صديق المنشاوي (ترتيل)',
		englishName: 'Muhammad Siddiq Al-Minshawi (Murattal)',
		folder: 'Minshawy_Murattal_128kbps'
	},
	{
		arabicName: 'محمد صديق المنشاوي (تجويد)',
		englishName: 'Muhammad Siddiq Al-Minshawi (Mujawwad)',
		folder: 'Minshawy_Mujawwad_64kbps'
	},
	{ arabicName: 'ناصر القطامي', englishName: 'Nasser Al-Qatami', folder: 'Nasser_Alqatami_128kbps' },
	{ arabicName: 'هاني الرفاعي', englishName: 'Hani Ar-Rifai', folder: 'Hani_Rifai_64kbps' },
	{ arabicName: 'علي الحذيفي', englishName: 'Ali Al-Hudhaify', folder: 'Hudhaify_64kbps' },
	{ arabicName: 'فارس عباد', englishName: 'Fares Abbad', folder: 'Fares_Abbad_64kbps' },
	{ arabicName: 'محمد أيوب', englishName: 'Muhammad Ayyub', folder: 'Muhammad_Ayyoub_64kbps' },
	{ arabicName: 'صلاح البدير', englishName: 'Salah Al-Budair', folder: 'Salah_Al_Budair_128kbps' }
];

export function reciterByFolder(folder: string | null | undefined): Reciter {
	return RECITERS.find((r) => r.folder === folder) ?? RECITERS[0];
}

const pad3 = (n: number): string => String(n).padStart(3, '0');

/** Both numbers 1-based. */
export function recitationUrl(reciter: Reciter, surah1: number, ayah1: number): string {
	return `https://everyayah.com/data/${reciter.folder}/${pad3(surah1)}${pad3(ayah1)}.mp3`;
}
