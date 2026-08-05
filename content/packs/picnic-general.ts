import type { Pack } from "../types";

export const picnicGeneral: Pack = {
  id: "picnic-general",
  name: "Picnic General Mix",
  description: "Gen-Z friendly mix for everyone: memes, emoji, food, Toronto, light tech, and a random grab bag.",
  categories: [
    {
      name: "Certified Meme Review",
      clues: [
        { value: 200, clue: "Completing this viral audio is mandatory: someone says \"six...\" and the crowd yells this next number.", answer: "Seven (6-7)" },
        { value: 400, clue: "This 2019 'they did surgery on a grape'-era cartoon dog sips coffee in a burning room, saying everything is okay.", answer: "The 'This Is Fine' dog" },
        { value: 600, clue: "\"Very mindful, very cutesy\": this other adjective led the viral 2024 TikTok catchphrase.", answer: "Demure (very demure)" },
        { value: 800, clue: "This baby pygmy hippo from a Thai zoo became 2024's slipperiest, most meme-able animal.", answer: "Moo Deng" },
        { value: 1000, clue: "Years before 'Despacito', this 2012 K-pop video became the first ever to pass one billion YouTube views.", answer: "'Gangnam Style'" },
      ],
    },
    {
      name: "Potluck Trivia",
      clues: [
        { value: 200, clue: "This is the only continent with no countries and no permanent residents.", answer: "Antarctica" },
        { value: 400, clue: "In soccer, one player scoring three goals in a single match earns this.", answer: "A hat-trick" },
        { value: 600, clue: "Built in 1961 and gleefully demolished 28 years later, it split a German city in two.", answer: "The Berlin Wall" },
        { value: 800, clue: "Too acidic and too dry for bacteria, this pantry staple never spoils; 3,000-year-old jars of it were still edible.", answer: "Honey" },
        { value: 1000, clue: "Sydney and Melbourne both wanted the job, so Australia built this compromise capital from scratch instead.", answer: "Canberra" },
      ],
    },
    {
      name: "Emoji Decode",
      clues: [
        { value: 200, clue: "🚢🧊💔: this 1997 movie.", answer: "Titanic" },
        { value: 400, clue: "🧙‍♂️⚡🏰: this book & movie series.", answer: "Harry Potter" },
        { value: 600, clue: "🎈🏠👴🐕: this 2009 Pixar film.", answer: "Up" },
        { value: 800, clue: "👧🍽️🤷: this viral TikTok 'meal' trend of snacks on a plate.", answer: "Girl dinner" },
        { value: 1000, clue: "📕🐷🚜: this 1945 Orwell novella, not the one with Big Brother.", answer: "Animal Farm" },
      ],
    },
    {
      name: "K-BBQ & Global Eats",
      clues: [
        { value: 200, clue: "This spicy fermented cabbage is Korea's national side dish.", answer: "Kimchi" },
        { value: 400, clue: "This green-bottled Korean spirit outsells every other liquor brand on Earth.", answer: "Soju" },
        { value: 600, clue: "Wrapping meat in lettuce with rice and ssamjang makes this one-bite parcel.", answer: "Ssam" },
        { value: 800, clue: "The Korean name for the thick-cut pork belly you're probably grilling right now.", answer: "Samgyeopsal", dailyDouble: true },
        { value: 1000, clue: "The collective name for all the small free side dishes that crowd a Korean table.", answer: "Banchan" },
      ],
    },
    {
      name: "Only in Toronto",
      clues: [
        { value: 200, clue: "This rapper made 'the 6ix' Toronto's nickname and 'God's Plan' a bop.", answer: "Drake" },
        { value: 400, clue: "At 553 metres, it was the world's tallest free-standing structure until 2007.", answer: "The CN Tower" },
        { value: 600, clue: "Red rockets on rails: this transit agency runs Toronto's streetcars.", answer: "The TTC" },
        { value: 800, clue: "In 2019 this team brought Canada its first NBA championship.", answer: "The Toronto Raptors" },
        { value: 1000, clue: "This underground downtown pedestrian network is the largest of its kind in the world at ~30 km.", answer: "The PATH", dailyDouble: true },
      ],
    },
    {
      name: "Science & Tech (Lite)",
      clues: [
        { value: 200, clue: "This keyboard shortcut un-does your last mistake.", answer: "Ctrl+Z (Cmd+Z)" },
        { value: 400, clue: "This company, founded by Sam Altman and others, made ChatGPT.", answer: "OpenAI" },
        { value: 600, clue: "Au on the periodic table, and a medal at the Olympics.", answer: "Gold" },
        { value: 800, clue: "This wireless standard is named after a 10th-century Scandinavian king with a famously discoloured tooth.", answer: "Bluetooth" },
        { value: 1000, clue: "In 1947 Grace Hopper's team taped one of these insects into a logbook: 'first actual case of bug being found.'", answer: "A moth" },
      ],
    },
  ],
  final: {
    category: "Pop Culture of the 2020s",
    clue: "This portmanteau described the July 2023 phenomenon of seeing two wildly different blockbusters as a double feature.",
    answer: "Barbenheimer",
  },
};
