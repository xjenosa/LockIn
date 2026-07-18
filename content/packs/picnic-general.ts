import type { Pack } from "../types";

export const picnicGeneral: Pack = {
  id: "picnic-general",
  name: "Picnic General Mix",
  description: "Gen-Z friendly mix for everyone — memes, music, emoji, food, Toronto, and light tech.",
  categories: [
    {
      name: "Certified Meme Review",
      clues: [
        { value: 200, clue: "Completing this viral audio is mandatory: someone says \"six...\" and the crowd yells this next number.", answer: "What is seven? (6-7)" },
        { value: 400, clue: "This baby pygmy hippo from a Thai zoo became 2024's slipperiest, most meme-able animal.", answer: "Who is Moo Deng?" },
        { value: 600, clue: "In brainrot vocabulary, this Ohio-adjacent word means charisma, especially when flirting.", answer: "What is rizz?" },
        { value: 800, clue: "\"Very mindful, very cutesy\" — this other adjective led the viral 2024 TikTok catchphrase.", answer: "What is demure? (very demure)", dailyDouble: true },
        { value: 1000, clue: "This 2019 'they did surgery on a grape'-era cartoon dog sips coffee in a burning room, saying everything is okay.", answer: "What is the 'This Is Fine' dog?" },
      ],
    },
    {
      name: "Finish the Lyric",
      clues: [
        { value: 200, clue: "Journey: \"Just a small town girl, ___...\"", answer: "What is \"livin' in a lonely world\"?" },
        { value: 400, clue: "Queen: \"Is this the real life? ___\"", answer: "What is \"Is this just fantasy?\"" },
        { value: 600, clue: "Miley Cyrus: \"I came in like a ___\"", answer: "What is \"wrecking ball\"?" },
        { value: 800, clue: "Drake: \"You used to call me on my ___\"", answer: "What is \"cell phone\"?" },
        { value: 1000, clue: "Smash Mouth: \"Somebody once told me ___\"", answer: "What is \"the world is gonna roll me\"?" },
      ],
    },
    {
      name: "Emoji Decode",
      clues: [
        { value: 200, clue: "🚢🧊💔 — this 1997 movie.", answer: "What is Titanic?" },
        { value: 400, clue: "🕷️🧑🗽 — this superhero.", answer: "Who is Spider-Man?" },
        { value: 600, clue: "🧙‍♂️⚡🏰 — this book & movie series.", answer: "What is Harry Potter?" },
        { value: 800, clue: "👧🍽️🤷 — this viral TikTok 'meal' trend of snacks on a plate.", answer: "What is girl dinner?" },
        { value: 1000, clue: "🎈🏠👴🐕 — this 2009 Pixar film.", answer: "What is Up?" },
      ],
    },
    {
      name: "K-BBQ & Global Eats",
      clues: [
        { value: 200, clue: "This spicy fermented cabbage is Korea's national side dish.", answer: "What is kimchi?" },
        { value: 400, clue: "The Korean name for the thick-cut pork belly you're probably grilling right now.", answer: "What is samgyeopsal?" },
        { value: 600, clue: "The collective name for all the small free side dishes that crowd a Korean table.", answer: "What is banchan?" },
        { value: 800, clue: "Wrapping meat in lettuce with rice and ssamjang makes this one-bite parcel.", answer: "What is ssam?" },
        { value: 1000, clue: "This green-bottled Korean spirit outsells every other liquor brand on Earth.", answer: "What is soju?" },
      ],
    },
    {
      name: "Only in Toronto",
      clues: [
        { value: 200, clue: "At 553 metres, it was the world's tallest free-standing structure until 2007.", answer: "What is the CN Tower?" },
        { value: 400, clue: "This rapper made 'the 6ix' Toronto's nickname and 'God's Plan' a bop.", answer: "Who is Drake?" },
        { value: 600, clue: "Red rockets on rails: this transit agency runs Toronto's streetcars.", answer: "What is the TTC?" },
        { value: 800, clue: "In 2019 this team brought Canada its first NBA championship.", answer: "Who are the Toronto Raptors?" },
        { value: 1000, clue: "This underground downtown pedestrian network is the largest of its kind in the world at ~30 km.", answer: "What is the PATH?" },
      ],
    },
    {
      name: "Science & Tech (Lite)",
      clues: [
        { value: 200, clue: "H2O is the chemical formula for this.", answer: "What is water?" },
        { value: 400, clue: "This keyboard shortcut un-does your last mistake.", answer: "What is Ctrl+Z (Cmd+Z)?" },
        { value: 600, clue: "This company, founded by Sam Altman and others, made ChatGPT.", answer: "What is OpenAI?" },
        { value: 800, clue: "This wireless standard is named after a 10th-century Scandinavian king with a famously discoloured tooth.", answer: "What is Bluetooth?", dailyDouble: true },
        { value: 1000, clue: "Au on the periodic table, and a medal at the Olympics.", answer: "What is gold?" },
      ],
    },
  ],
  final: {
    category: "Pop Culture of the 2020s",
    clue: "This portmanteau described the July 2023 phenomenon of seeing two wildly different blockbusters as a double feature.",
    answer: "What is Barbenheimer?",
  },
};
