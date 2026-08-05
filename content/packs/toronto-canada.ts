import type { Pack } from "../types";

export const torontoCanada: Pack = {
  id: "toronto-canada",
  name: "Toronto & Canada",
  description: "Landmarks, icons, sports, slang, history and geography. Full Canadian flavour.",
  categories: [
    {
      name: "Toronto Landmarks",
      clues: [
        { value: 200, clue: "Toronto's pointiest landmark, complete with a glass floor and the EdgeWalk.", answer: "The CN Tower" },
        { value: 400, clue: "Dinosaurs and a crystal-shaped entrance define this museum at Bloor & Queen's Park.", answer: "The ROM (Royal Ontario Museum)" },
        { value: 600, clue: "This pedestrian-only Victorian industrial neighbourhood is famous for its Christmas Market.", answer: "The Distillery District" },
        { value: 800, clue: "The giant curved twin towers watching over the skating rink at Nathan Phillips Square form this building.", answer: "Toronto City Hall" },
        { value: 1000, clue: "Toronto started life in 1793 as this lakeshore garrison, captured by American invaders 20 years later.", answer: "Fort York" },
      ],
    },
    {
      name: "Canadian Icons",
      clues: [
        { value: 200, clue: "This Québécoise belted the Titanic theme 'My Heart Will Go On'.", answer: "Céline Dion" },
        { value: 400, clue: "This Vancouver-raised Deadpool actor co-owns a Welsh football club.", answer: "Ryan Reynolds" },
        { value: 600, clue: "'The Great One': hockey's all-time points leader.", answer: "Wayne Gretzky" },
        { value: 800, clue: "In 1980 this one-legged runner's Marathon of Hope raised millions for cancer research.", answer: "Terry Fox" },
        { value: 1000, clue: "This Canadian scientist co-discovered insulin in Toronto in 1921 and won a Nobel Prize.", answer: "Frederick Banting" },
      ],
    },
    {
      name: "The 6ix in Sports",
      clues: [
        { value: 200, clue: "Kawhi Leonard's four-bounce Game 7 buzzer-beater came during this team's 2019 title run.", answer: "The Toronto Raptors" },
        { value: 400, clue: "This team won back-to-back World Series in 1992 and 1993.", answer: "The Toronto Blue Jays" },
        { value: 600, clue: "BMO Field is home to the Argonauts and this MLS club.", answer: "Toronto FC" },
        { value: 800, clue: "In 2019 this Mississauga teen beat Serena Williams to win the US Open.", answer: "Bianca Andreescu", dailyDouble: true },
        { value: 1000, clue: "The Maple Leafs last hoisted the Stanley Cup in this year, the last season of the Original Six era.", answer: "1967" },
      ],
    },
    {
      name: "Canadian Slang & Culture",
      clues: [
        { value: 200, clue: "Fries, cheese curds and gravy: Québec's gift to 2 a.m.", answer: "Poutine" },
        { value: 400, clue: "The $1 coin, named for the bird on it.", answer: "A loonie" },
        { value: 600, clue: "Canadians wear this knitted winter hat; Americans might call it a beanie.", answer: "A toque" },
        { value: 800, clue: "If your professor calls you this, you're trying a little too hard to impress.", answer: "A keener" },
        { value: 1000, clue: "Ontarians call the Victoria Day long weekend this, after the case of beer that fuels it.", answer: "The May two-four" },
      ],
    },
    {
      name: "Eh? History",
      clues: [
        { value: 200, clue: "Escaped enslaved people followed this secret network north to Canada in the 1800s.", answer: "The Underground Railroad" },
        { value: 400, clue: "Confederation united the first provinces in this year.", answer: "1867" },
        { value: 600, clue: "This man on the $10 bill (well, formerly) was Canada's first prime minister.", answer: "Sir John A. Macdonald" },
        { value: 800, clue: "Canada's constitution came home with this 1982 charter of rights attached.", answer: "The Charter of Rights and Freedoms" },
        { value: 1000, clue: "Canada's coming-of-age WWI battle, fought at this French ridge in April 1917.", answer: "Vimy Ridge" },
      ],
    },
    {
      name: "Coast to Coast",
      clues: [
        { value: 200, clue: "Canada's capital city. No, it's not Toronto.", answer: "Ottawa" },
        { value: 400, clue: "Anne of Green Gables put this smallest province on the map.", answer: "Prince Edward Island" },
        { value: 600, clue: "Canada has this many provinces (territories not included).", answer: "Ten" },
        { value: 800, clue: "This bay between New Brunswick and Nova Scotia has the highest tides on Earth.", answer: "The Bay of Fundy", dailyDouble: true },
        { value: 1000, clue: "At 4,241 km, this river system flowing to the Arctic Ocean is Canada's longest.", answer: "The Mackenzie River" },
      ],
    },
  ],
  final: {
    category: "Canadian Firsts",
    clue: "Invented in Toronto in 1921-22, this hormone treatment turned a fatal diagnosis into a manageable disease, and Canada sold the patent for $1.",
    answer: "Insulin",
  },
};
