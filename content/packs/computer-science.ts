import type { Pack } from "../types";

export const computerScience: Pack = {
  id: "computer-science",
  name: "Computer Science",
  description:
    "Data structures, algorithms and Big-O, operating systems, databases, and reading real code.",
  categories: [
    {
      name: "Programming Languages",
      clues: [
        { value: 200, clue: "Python uses this, not curly braces or keywords, to delimit a block of code.", answer: "Indentation (whitespace)" },
        { value: 400, clue: "Translated entirely to machine code before it runs, rather than interpreted line by line, a language is said to be this.", answer: "Compiled" },
        { value: 600, clue: "C and C++ hand the programmer direct control of this resource that Java and Python manage for you with garbage collection.", answer: "Memory (manual memory management)" },
        { value: 800, clue: "Haskell is the poster child for this paradigm, which avoids mutable state and side effects and treats programs as the evaluation of functions.", answer: "Functional programming" },
        { value: 1000, clue: "Rust achieves memory safety without a garbage collector by enforcing its ownership rules with this compile-time checker.", answer: "The borrow checker", dailyDouble: true },
      ],
    },
    {
      name: "Data Structures",
      clues: [
        { value: 200, clue: "Last in, first out: you push onto and pop off of its top.", answer: "A stack" },
        { value: 400, clue: "First in, first out: you enqueue at the rear and dequeue from the front.", answer: "A queue" },
        { value: 600, clue: "This tree-based structure keeps its smallest (or largest) element at the root and usually backs a priority queue.", answer: "A heap" },
        { value: 800, clue: "This structure stores key-value pairs and gives average O(1) lookup by running keys through a hash function into buckets.", answer: "A hash table (hash map)" },
        { value: 1000, clue: "Storing strings along shared-prefix paths from a common root, this tree powers fast autocomplete and is pronounced like 'try'.", answer: "A trie (prefix tree)" },
      ],
    },
    {
      name: "Algorithms & Big-O",
      clues: [
        { value: 200, clue: "Because it halves the search space at every step, binary search runs in this Big-O time.", answer: "O(log n)" },
        { value: 400, clue: "No comparison-based sorting algorithm can beat this Big-O in the worst case.", answer: "O(n log n)" },
        { value: 600, clue: "Quicksort averages O(n log n) but degrades to this Big-O with a bad pivot on already-sorted data.", answer: "O(n squared)" },
        { value: 800, clue: "Speeding up a problem by storing and reusing solutions to overlapping subproblems, the trick behind fast Fibonacci, is this technique.", answer: "Dynamic programming (memoization)" },
        { value: 1000, clue: "The million-dollar open question of whether every problem quick to verify is also quick to solve is written as this.", answer: "P versus NP" },
      ],
    },
    {
      name: "Spot the Bug",
      clues: [
        { value: 200, clue: "A while (true) loop with no reachable break statement does this forever.", answer: "An infinite loop" },
        { value: 400, clue: "Looping an index from 0 through n inclusive across an n-element array reads one slot too far: this classic error.", answer: "An off-by-one error" },
        { value: 600, clue: "In an n-element array whose valid indices are 0 to n-1, reading index n throws this.", answer: "Index out of bounds" },
        { value: 800, clue: "Tony Hoare called adding this reference value to a language his 'billion-dollar mistake'.", answer: "Null" },
        { value: 1000, clue: "A recursive function that never reaches its base case keeps adding frames until it blows this and overflows.", answer: "The call stack (stack overflow)" },
      ],
    },
    {
      name: "Operating Systems",
      clues: [
        { value: 200, clue: "The OS represents each running program as one of these, with its own address space.", answer: "A process" },
        { value: 400, clue: "Several of these lightweight units share their parent process's memory and run concurrently within it.", answer: "Threads" },
        { value: 600, clue: "Two threads each holding a lock the other is waiting on are frozen in this.", answer: "Deadlock" },
        { value: 800, clue: "By swapping fixed-size pages between RAM and disk, the OS gives each process the illusion of this much larger memory.", answer: "Virtual memory", dailyDouble: true },
        { value: 1000, clue: "Guarding a critical section so only one thread is inside at a time is done with this lock, short for 'mutual exclusion'.", answer: "A mutex" },
      ],
    },
    {
      name: "Databases & SQL",
      clues: [
        { value: 200, clue: "The SQL keyword that reads rows out of a table.", answer: "SELECT" },
        { value: 400, clue: "This SQL operation stitches together rows from two tables on a matching column.", answer: "A JOIN" },
        { value: 600, clue: "The column or set of columns that uniquely identifies every row in a table is this.", answer: "The primary key" },
        { value: 800, clue: "Structuring tables to remove redundant data, measured in 'normal forms', is this.", answer: "Normalization" },
        { value: 1000, clue: "The four guarantees of a reliable transaction, Atomicity, Consistency, Isolation, and Durability, go by this acronym.", answer: "ACID" },
      ],
    },
  ],
  final: {
    category: "Computing Pioneers",
    clue: "This Bletchley Park codebreaker formalized computation with an abstract 'machine' and lends his name to computing's highest honour, often called its Nobel Prize.",
    answer: "Alan Turing",
  },
};
