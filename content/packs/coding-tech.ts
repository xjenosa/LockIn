import type { Pack } from "../types";

export const codingTech: Pack = {
  id: "coding-tech",
  name: "Coding & Tech",
  description: "A CS-leaning board — languages, algorithms, bugs, tech history, internet culture, acronyms.",
  categories: [
    {
      name: "Programming Languages",
      clues: [
        { value: 200, clue: "This snake-named language is famous for readable code and data science.", answer: "What is Python?" },
        { value: 400, clue: "Despite the name, this browser language is not related to Java.", answer: "What is JavaScript?" },
        { value: 600, clue: "Apple introduced this language in 2014 to replace Objective-C.", answer: "What is Swift?" },
        { value: 800, clue: "This systems language with a crab mascot has been Stack Overflow's 'most loved' for years.", answer: "What is Rust?" },
        { value: 1000, clue: "Bjarne Stroustrup created this language as 'C with Classes'.", answer: "What is C++?" },
      ],
    },
    {
      name: "Algorithms & Data Structures",
      clues: [
        { value: 200, clue: "Last in, first out — like a pile of plates.", answer: "What is a stack?" },
        { value: 400, clue: "Guessing a number by halving the range each time is this O(log n) search.", answer: "What is binary search?" },
        { value: 600, clue: "This beginner-friendly O(n²) sort repeatedly swaps neighbours, floating big values up.", answer: "What is bubble sort?" },
        { value: 800, clue: "A function that calls itself is using this technique.", answer: "What is recursion?", dailyDouble: true },
        { value: 1000, clue: "This structure gives average O(1) lookups by turning keys into array indices.", answer: "What is a hash map (hash table)?" },
      ],
    },
    {
      name: "Spot the Bug",
      clues: [
        { value: 200, clue: "while (true) { } — this is the classic name for what this loop does.", answer: "What is an infinite loop?" },
        { value: 400, clue: "In many languages, if (x = 5) instead of (x == 5) does this instead of comparing.", answer: "What is assignment (assigns 5 to x)?" },
        { value: 600, clue: "Looping i from 0 to n inclusive over an n-item array causes this '-by-one' error.", answer: "What is an off-by-one error?" },
        { value: 800, clue: "Accessing arr[10] in a 10-element array throws this kind of error.", answer: "What is index out of range/bounds?" },
        { value: 1000, clue: "Tony Hoare called inventing this reference value his 'billion-dollar mistake'.", answer: "What is null?" },
      ],
    },
    {
      name: "Tech History",
      clues: [
        { value: 200, clue: "Jobs and Wozniak founded this company in a California garage in 1976.", answer: "What is Apple?" },
        { value: 400, clue: "This 19th-century countess is often called the first computer programmer.", answer: "Who is Ada Lovelace?" },
        { value: 600, clue: "Tim Berners-Lee invented this at CERN in 1989 — you're probably using it right now.", answer: "What is the World Wide Web?" },
        { value: 800, clue: "This British codebreaker's 'test' asks whether a machine can pass as human.", answer: "Who is Alan Turing?" },
        { value: 1000, clue: "The year-2000 panic over two-digit dates went by this alphanumeric nickname.", answer: "What is Y2K?" },
      ],
    },
    {
      name: "Internet Culture",
      clues: [
        { value: 200, clue: "This HTTP status code means the page was not found.", answer: "What is 404?" },
        { value: 400, clue: "Clicking a link that lands on Rick Astley's 'Never Gonna Give You Up' means you've been this.", answer: "What is rickrolled?" },
        { value: 600, clue: "Programmers copy answers from this Q&A site, arrows and all.", answer: "What is Stack Overflow?" },
        { value: 800, clue: "This Microsoft-owned code-hosting site's mascot is the 'Octocat'.", answer: "What is GitHub?", dailyDouble: true },
        { value: 1000, clue: "This 2013-era Shiba Inu meme spawned a cryptocurrency Elon Musk can't stop tweeting about.", answer: "What is Doge (Dogecoin)?" },
      ],
    },
    {
      name: "Acronym Soup",
      clues: [
        { value: 200, clue: "HTML: HyperText ______ Language.", answer: "What is Markup?" },
        { value: 400, clue: "CPU stands for this 'brain of the computer'.", answer: "What is the Central Processing Unit?" },
        { value: 600, clue: "APIs let programs talk to each other; the A stands for this.", answer: "What is Application (Programming Interface)?" },
        { value: 800, clue: "Your code editor with debugger and terminal built in is this three-letter environment.", answer: "What is an IDE (Integrated Development Environment)?" },
        { value: 1000, clue: "SQL, the database language, stands for this.", answer: "What is Structured Query Language?" },
      ],
    },
  ],
  final: {
    category: "Founders & Companies",
    clue: "These two Stanford PhD students named their 1998 search engine after a misspelling of a very large number.",
    answer: "Who are Larry Page and Sergey Brin (Google)?",
  },
};
