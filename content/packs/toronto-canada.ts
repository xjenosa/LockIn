import type { Pack } from "../types";

export const torontoCanada: Pack = {
  id: "toronto-canada",
  name: "Toronto & Canada",
  description: "Landmarks, icons, sports, slang, history and geography — full Canadian flavour.",
  categories: [
    {
      name: "Toronto Landmarks",
      clues: [
        { value: 200, clue: "Toronto's pointiest landmark, complete with a glass floor and the EdgeWalk.", answer: "What is the CN Tower?" },
        { value: 400, clue: "This 98-room Gothic Revival 'castle' on a hill was built by financier Sir Henry Pellatt.", answer: "What is Casa Loma?" },
        { value: 600, clue: "Dinosaurs and a crystal-shaped entrance define this museum at Bloor & Queen's Park.", answer: "What is the ROM (Royal Ontario Museum)?" },
        { value: 800, clue: "This pedestrian-only Victorian industrial neighbourhood is famous for its Christmas Market.", answer: "What is the Distillery District?" },
        { value: 1000, clue: "The giant curved twin towers watching over the skating rink at Nathan Phillips Square form this building.", answer: "What is Toronto City Hall?" },
      ],
    },
    {
      name: "Canadian Icons",
      clues: [
        { value: 200, clue: "This Brampton-raised Deadpool actor co-owns a Welsh football club.", answer: "Who is Ryan Reynolds?" },
        { value: 400, clue: "In 1980 this one-legged runner's Marathon of Hope raised millions for cancer research.", answer: "Who is Terry Fox?" },
        { value: 600, clue: "'The Great One' — hockey's all-time points leader.", answer: "Who is Wayne Gretzky?" },
        { value: 800, clue: "This Québécoise belted the Titanic theme 'My Heart Will Go On'.", answer: "Who is Céline Dion?" },
        { value: 1000, clue: "This Canadian scientist co-discovered insulin in Toronto in 1921 and won a Nobel Prize.", answer: "Who is Frederick Banting?" },
      ],
    },
    {
      name: "The 6ix in Sports",
      clues: [
        { value: 200, clue: "Kawhi Leonard's four-bounce Game 7 buzzer-beater came during this team's 2019 title run.", answer: "Who are the Toronto Raptors?" },
        { value: 400, clue: "This team won back-to-back World Series in 1992 and 1993.", answer: "Who are the Toronto Blue Jays?" },
        { value: 600, clue: "The Maple Leafs last hoisted the Stanley Cup in this year — the last season of the Original Six era.", answer: "What is 1967?" },
        { value: 800, clue: "In 2019 this Mississauga teen beat Serena Williams to win the US Open.", answer: "Who is Bianca Andreescu?", dailyDouble: true },
        { value: 1000, clue: "BMO Field is home to the Argonauts and this MLS club.", answer: "What is Toronto FC?" },
      ],
    },
    {
      name: "Canadian Slang & Culture",
      clues: [
        { value: 200, clue: "A coffee with two creams and two sugars at Tim Hortons.", answer: "What is a double-double?" },
        { value: 400, clue: "The $1 coin, named for the bird on it.", answer: "What is a loonie?" },
        { value: 600, clue: "Canadians wear this knitted winter hat; Americans might call it a beanie.", answer: "What is a toque?" },
        { value: 800, clue: "Fries, cheese curds and gravy — Québec's gift to 2 a.m.", answer: "What is poutine?" },
        { value: 1000, clue: "If your professor calls you this, you're trying a little too hard to impress.", answer: "What is a keener?" },
      ],
    },
    {
      name: "Eh? History",
      clues: [
        { value: 200, clue: "Confederation united the first provinces in this year.", answer: "What is 1867?" },
        { value: 400, clue: "This man on the $10 bill (well, formerly) was Canada's first prime minister.", answer: "Who is Sir John A. Macdonald?" },
        { value: 600, clue: "Canada's constitution came home with this 1982 charter of rights attached.", answer: "What is the Charter of Rights and Freedoms?" },
        { value: 800, clue: "Escaped enslaved people followed this secret network north to Canada in the 1800s.", answer: "What is the Underground Railroad?" },
        { value: 1000, clue: "Canada's coming-of-age WWI battle, fought at this French ridge in April 1917.", answer: "What is Vimy Ridge?" },
      ],
    },
    {
      name: "Coast to Coast",
      clues: [
        { value: 200, clue: "Canada's capital city — no, it's not Toronto.", answer: "What is Ottawa?" },
        { value: 400, clue: "Canada has this many provinces (territories not included).", answer: "What is ten?" },
        { value: 600, clue: "This bay between New Brunswick and Nova Scotia has the highest tides on Earth.", answer: "What is the Bay of Fundy?" },
        { value: 800, clue: "Anne of Green Gables put this smallest province on the map.", answer: "What is Prince Edward Island?", dailyDouble: true },
        { value: 1000, clue: "At 4,241 km, this river system flowing to the Arctic Ocean is Canada's longest.", answer: "What is the Mackenzie River?" },
      ],
    },
  ],
  final: {
    category: "Canadian Firsts",
    clue: "Invented in Toronto in 1921–22, this hormone treatment turned a fatal diagnosis into a manageable disease — and Canada sold the patent for $1.",
    answer: "What is insulin?",
  },
};
