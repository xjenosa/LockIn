import type { Pack } from "../types";

export const jakartaIndonesia: Pack = {
  id: "jakarta-indonesia",
  name: "Jakarta & Indonesia",
  description:
    "The food, the slang, Jakarta life, the music, the local brands, and weekend trips.",
  categories: [
    {
      name: "Makanan & Jajanan",
      clues: [
        { value: 200, clue: "Fried rice with a fried egg on top and kerupuk on the side, Indonesia's default comfort plate.", answer: "Nasi goreng" },
        { value: 400, clue: "Chicken rice-porridge sold from a cart, topped with cakwe and kerupuk, a classic breakfast or sick-day meal.", answer: "Bubur ayam" },
        { value: 600, clue: "Jakarta's own beef soup, with a rich, creamy white broth of milk and coconut.", answer: "Soto Betawi" },
        { value: 800, clue: "Almost black from the keluak nut, this East Javanese beef soup is the deep-cut order.", answer: "Rawon" },
        { value: 1000, clue: "At a Padang place, the serving style where every dish is stacked on your table and you pay only for what you touch is called this.", answer: "Hidang" },
      ],
    },
    {
      name: "Bahasa Gaul",
      clues: [
        { value: 200, clue: "Text a friend 'OTW' and you're telling them you're doing this.", answer: "On the way" },
        { value: 400, clue: "Slang for being dead bored with absolutely nothing to do.", answer: "Gabut" },
        { value: 600, clue: "This acronym roasts someone who strings you along with false hope and never commits.", answer: "PHP (Pemberi Harapan Palsu)" },
        { value: 800, clue: "Teasing word for someone delusional, daydreaming about a crush way out of their league.", answer: "Halu", dailyDouble: true },
        { value: 1000, clue: "Slang for someone so hopelessly whipped they'll drop anything and anyone for their partner.", answer: "Bucin" },
      ],
    },
    {
      name: "Anak Jakarta",
      clues: [
        { value: 200, clue: "Every Jakartan's daily nemesis: one word for a soul-crushing traffic jam.", answer: "Macet" },
        { value: 400, clue: "Jakarta's bus rapid-transit system, with its own dedicated red lanes, launched back in 2004.", answer: "TransJakarta (busway)" },
        { value: 600, clue: "The reclaimed-land area up north that became the city's Chinese-Indonesian food, cafe, and nightlife hub.", answer: "PIK (Pantai Indah Kapuk)" },
        { value: 800, clue: "To fight the macet, cars with odd or even plates are banned from big roads on alternating days under this policy.", answer: "Ganjil-genap" },
        { value: 1000, clue: "Before Gojek, you haggled with a motorbike-taxi guy loitering at a street corner: that old-school, non-app version is called ojek ___.", answer: "Pangkalan (ojek pangkalan)" },
      ],
    },
    {
      name: "Musik & Seleb",
      clues: [
        { value: 200, clue: "This Jakarta-born rapper broke out in 2016 with the viral track 'Dat $tick'.", answer: "Rich Brian" },
        { value: 400, clue: "This 88rising singer from Jakarta is behind the hits 'Lowkey' and 'Every Summertime'.", answer: "NIKI" },
        { value: 600, clue: "The inescapable TV host and 'Sultan Andara', married to Nagita Slavina.", answer: "Raffi Ahmad" },
        { value: 800, clue: "This pop diva chased the US charts with 'Coke Bottle' and a Chris Brown collab, and famously insisted she has 'no Indonesian blood'.", answer: "Agnez Mo" },
        { value: 1000, clue: "Singer-songwriter whose mellow 'Hati-Hati di Jalan' was inescapable in 2022.", answer: "Tulus" },
      ],
    },
    {
      name: "Warung",
      clues: [
        { value: 200, clue: "So dominant that Indonesians call any bottled water by its name, this brand launched in 1973.", answer: "Aqua" },
        { value: 400, clue: "Finish the slogan everyone knows by heart: 'Apapun makanannya, minumnya ___.'", answer: "Teh Botol Sosro" },
        { value: 600, clue: "This Indonesian coffee candy by Mayora became a scene-stealing product placement in Korean dramas.", answer: "Kopiko" },
        { value: 800, clue: "The herbal 'masuk angin' remedy by Sido Muncul, sold on the slogan 'orang pintar minum ___'.", answer: "Tolak Angin" },
        { value: 1000, clue: "The red biscuit tin famous for its fatherless cover drawing, and for secretly holding rengginang instead of cookies.", answer: "Khong Guan" },
      ],
    },
    {
      name: "Jalan-Jalan",
      clues: [
        { value: 200, clue: "The 'Island of the Gods', Indonesia's most famous holiday destination.", answer: "Bali" },
        { value: 400, clue: "This cool, hilly West Java city nicknamed 'Kota Kembang' is where Jakartans go for outlets and cooler air.", answer: "Bandung" },
        { value: 600, clue: "Home to Malioboro street and the Sultan's kraton, this Central Java city is the 'student city'.", answer: "Yogyakarta" },
        { value: 800, clue: "The largest volcanic lake on Earth, in North Sumatra, with Samosir island sitting in its middle.", answer: "Danau Toba (Lake Toba)" },
        { value: 1000, clue: "Divers travel to this remote Papua archipelago, the 'Four Kings', for the richest marine life on the planet.", answer: "Raja Ampat", dailyDouble: true },
      ],
    },
  ],
  final: {
    category: "Viral Indonesia",
    clue: "In late 2016, Indonesian kids sparked a worldwide craze by standing roadside and begging bus drivers to honk their loud musical air horns, chanting this three-word phrase.",
    answer: "Om Telolet Om",
  },
};
