import type { Pack } from "../types";

export const codingTech: Pack = {
  id: "coding-tech",
  name: "Coding & Tech",
  description: "A CS-leaning board: languages, algorithms, bugs, tech history, internet culture, acronyms.",
  categories: [
    {
      name: "Programming Languages",
      clues: [
        { value: 200, clue: "This snake-named language is famous for readable code and data science.", answer: "What is Python?" },
        { value: 400, clue: "Despite the name, this browser language is not related to Java.", answer: "What is JavaScript?" },
        { value: 600, clue: "Bjarne Stroustrup created this language as 'C with Classes'.", answer: "What is C++?" },
        { value: 800, clue: "Apple introduced this language in 2014 to replace Objective-C.", answer: "What is Swift?", dailyDouble: true },
        { value: 1000, clue: "This systems language with a crab mascot has been Stack Overflow's 'most loved' for years.", answer: "What is Rust?" },
      ],
    },
    {
      name: "Algorithms & Data Structures",
      clues: [
        { value: 200, clue: "Last in, first out: like a pile of plates.", answer: "What is a stack?" },
        { value: 400, clue: "A function that calls itself is using this technique.", answer: "What is recursion?" },
        { value: 600, clue: "Guessing a number by halving the range each time is this O(log n) search.", answer: "What is binary search?" },
        { value: 800, clue: "This beginner-friendly O(n²) sort repeatedly swaps neighbours, floating big values up.", answer: "What is bubble sort?" },
        { value: 1000, clue: "This structure gives average O(1) lookups by turning keys into array indices.", answer: "What is a hash map (hash table)?" },
      ],
    },
    {
      name: "Spot the Bug",
      clues: [
        { value: 200, clue: "while (true) { }: this is the classic name for what this loop does.", answer: "What is an infinite loop?" },
        { value: 400, clue: "Looping i from 0 to n inclusive over an n-item array causes this '-by-one' error.", answer: "What is an off-by-one error?" },
        { value: 600, clue: "Accessing arr[10] in a 10-element array throws this kind of error.", answer: "What is index out of range/bounds?" },
        { value: 800, clue: "In many languages, if (x = 5) instead of (x == 5) does this instead of comparing.", answer: "What is assignment (assigns 5 to x)?" },
        { value: 1000, clue: "Tony Hoare called inventing this reference value his 'billion-dollar mistake'.", answer: "What is null?", dailyDouble: true },
      ],
    },
    {
      name: "Tech History",
      clues: [
        { value: 200, clue: "Jobs and Wozniak founded this company in a California garage in 1976.", answer: "What is Apple?" },
        { value: 400, clue: "This British codebreaker's 'test' asks whether a machine can pass as human.", answer: "Who is Alan Turing?" },
        { value: 600, clue: "Tim Berners-Lee invented this at CERN in 1989; you're probably using it right now.", answer: "What is the World Wide Web?" },
        { value: 800, clue: "This 19th-century countess is often called the first computer programmer.", answer: "Who is Ada Lovelace?" },
        { value: 1000, clue: "The first message on this 1969 Pentagon-funded network went from UCLA to Stanford Research Institute; the sender typed 'LOGIN' and it crashed after 'LO'.", answer: "What is ARPANET?" },
      ],
    },
    {
      name: "Internet Culture",
      clues: [
        { value: 200, clue: "This HTTP status code means the page was not found.", answer: "What is 404?" },
        { value: 400, clue: "Clicking a link that lands on Rick Astley's 'Never Gonna Give You Up' means you've been this.", answer: "What is rickrolled?" },
        { value: 600, clue: "This Microsoft-owned code-hosting site's mascot is the 'Octocat'.", answer: "What is GitHub?" },
        { value: 800, clue: "Programmers copy answers from this Q&A site, arrows and all.", answer: "What is Stack Overflow?" },
        { value: 1000, clue: "The first video ever uploaded to YouTube, in April 2005, was 18 seconds of co-founder Jawed Karim at the San Diego Zoo, under this four-word title.", answer: "What is 'Me at the zoo'?" },
      ],
    },
    {
      name: "Acronym Soup",
      clues: [
        { value: 200, clue: "CPU stands for this 'brain of the computer'.", answer: "What is the Central Processing Unit?" },
        { value: 400, clue: "APIs let programs talk to each other; the A stands for this.", answer: "What is Application (Programming Interface)?" },
        { value: 600, clue: "Your code editor with debugger and terminal built in is this three-letter environment.", answer: "What is an IDE (Integrated Development Environment)?" },
        { value: 800, clue: "SQL, the database language, stands for this.", answer: "What is Structured Query Language?" },
        { value: 1000, clue: "GIF, the looping-animation format, stands for Graphics ______ Format.", answer: "What is Interchange?" },
      ],
    },
  ],
  final: {
    category: "Founders & Companies",
    clue: "These two Stanford PhD students named their 1998 search engine after a misspelling of a very large number.",
    answer: "Who are Larry Page and Sergey Brin (Google)?",
  },
};
