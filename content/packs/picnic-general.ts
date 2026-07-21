import type { Pack } from "../types";

export const picnicGeneral: Pack = {
  id: "picnic-general",
  name: "Picnic General Mix",
  description: "Gen-Z friendly mix for everyone — memes, emoji, food, Toronto, light tech, and a random grab bag.",
  categories: [
    {
      name: "Certified Meme Review",
      clues: [
        { value: 200, clue: "Completing this viral audio is mandatory: someone says \"six...\" and the crowd yells this next number.", answer: "What is seven? (6-7)" },
        { value: 400, clue: "This 2019 'they did surgery on a grape'-era cartoon dog sips coffee in a burning room, saying everything is okay.", answer: "What is the 'This Is Fine' dog?" },
        { value: 600, clue: "\"Very mindful, very cutesy\" — this other adjective led the viral 2024 TikTok catchphrase.", answer: "What is demure? (very demure)" },
        { value: 800, clue: "This baby pygmy hippo from a Thai zoo became 2024's slipperiest, most meme-able animal.", answer: "Who is Moo Deng?" },
        { value: 1000, clue: "Years before 'Despacito', this 2012 K-pop video became the first ever to pass one billion YouTube views.", answer: "What is 'Gangnam Style'?" },
      ],
    },
    {
      name: "Potluck Trivia",
      clues: [
        { value: 200, clue: "This is the only continent with no countries and no permanent residents.", answer: "What is Antarctica?" },
        { value: 400, clue: "In soccer, one player scoring three goals in a single match earns this.", answer: "What is a hat-trick?" },
        { value: 600, clue: "Built in 1961 and gleefully demolished 28 years later, it split a German city in two.", answer: "What is the Berlin Wall?" },
        { value: 800, clue: "Too acidic and too dry for bacteria, this pantry staple never spoils — 3,000-year-old jars of it were still edible.", answer: "What is honey?" },
        { value: 1000, clue: "Sydney and Melbourne both wanted the job, so Australia built this compromise capital from scratch instead.", answer: "What is Canberra?" },
      ],
    },
    {
      name: "Emoji Decode",
      clues: [
        { value: 200, clue: "🚢🧊💔 — this 1997 movie.", answer: "What is Titanic?" },
        { value: 400, clue: "🧙‍♂️⚡🏰 — this book & movie series.", answer: "What is Harry Potter?" },
        { value: 600, clue: "🎈🏠👴🐕 — this 2009 Pixar film.", answer: "What is Up?" },
        { value: 800, clue: "👧🍽️🤷 — this viral TikTok 'meal' trend of snacks on a plate.", answer: "What is girl dinner?" },
        { value: 1000, clue: "📕🐷🚜 — this 1945 Orwell novella, not the one with Big Brother.", answer: "What is Animal Farm?" },
      ],
    },
    {
      name: "K-BBQ & Global Eats",
      clues: [
        { value: 200, clue: "This spicy fermented cabbage is Korea's national side dish.", answer: "What is kimchi?" },
        { value: 400, clue: "This green-bottled Korean spirit outsells every other liquor brand on Earth.", answer: "What is soju?" },
        { value: 600, clue: "Wrapping meat in lettuce with rice and ssamjang makes this one-bite parcel.", answer: "What is ssam?" },
        { value: 800, clue: "The Korean name for the thick-cut pork belly you're probably grilling right now.", answer: "What is samgyeopsal?", dailyDouble: true },
        { value: 1000, clue: "The collective name for all the small free side dishes that crowd a Korean table.", answer: "What is banchan?" },
      ],
    },
    {
      name: "Only in Toronto",
      clues: [
        { value: 200, clue: "This rapper made 'the 6ix' Toronto's nickname and 'God's Plan' a bop.", answer: "Who is Drake?" },
        { value: 400, clue: "At 553 metres, it was the world's tallest free-standing structure until 2007.", answer: "What is the CN Tower?" },
        { value: 600, clue: "Red rockets on rails: this transit agency runs Toronto's streetcars.", answer: "What is the TTC?" },
        { value: 800, clue: "In 2019 this team brought Canada its first NBA championship.", answer: "Who are the Toronto Raptors?" },
        { value: 1000, clue: "This underground downtown pedestrian network is the largest of its kind in the world at ~30 km.", answer: "What is the PATH?", dailyDouble: true },
      ],
    },
    {
      name: "Science & Tech (Lite)",
      clues: [
        { value: 200, clue: "This keyboard shortcut un-does your last mistake.", answer: "What is Ctrl+Z (Cmd+Z)?" },
        { value: 400, clue: "This company, founded by Sam Altman and others, made ChatGPT.", answer: "What is OpenAI?" },
        { value: 600, clue: "Au on the periodic table, and a medal at the Olympics.", answer: "What is gold?" },
        { value: 800, clue: "This wireless standard is named after a 10th-century Scandinavian king with a famously discoloured tooth.", answer: "What is Bluetooth?" },
        { value: 1000, clue: "In 1947 Grace Hopper's team taped one of these insects into a logbook: 'first actual case of bug being found.'", answer: "What is a moth?" },
      ],
    },
  ],
  final: {
    category: "Pop Culture of the 2020s",
    clue: "This portmanteau described the July 2023 phenomenon of seeing two wildly different blockbusters as a double feature.",
    answer: "What is Barbenheimer?",
  },
};
