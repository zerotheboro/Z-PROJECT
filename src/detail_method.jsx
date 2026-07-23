import './detail_method.css';
import { Question } from './MIDSECTION/META';
import Game from './MIDSECTION/META';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';

let interleavingQuestions = [
new Question(
  "What is the core underlying principle of the Memory Palace technique?", 
  "Associating abstract or new information with familiar physical locations", 
  "Repeating information out loud until it is memorized by muscle memory", 
  "Writing information down in a structured, hierarchical physical list", 
  "Memorizing long passages of books word-for-word without visual aids"
),
new Question(
  "When building a Memory Palace, what is typically the first step?", 
  "Selecting a place you know extremely well, like your childhood home", 
  "Creating a fictional, highly detailed fantasy world in your head", 
  "Designing a physical map or layout blueprint on a piece of paper", 
  "Writing down a list of all the random facts you want to memorize first"
),
new Question(
  "Why should mental images in a Memory Palace be bizarre, exaggerated, or emotional?", 
  "Because the brain is naturally wired to pay more attention to unusual or striking stimuli", 
  "To prevent the mental images from being confused with your real-life everyday memories", 
  "Because mundane or normal images cannot be stored in long-term memory structures", 
  "To make the physical retrieval process faster when writing down answers on a test"
),
new Question(
  "How do you correctly retrieve the information stored inside your Memory Palace?", 
  "By mentally walking through the palace along a specific, predetermined linear path", 
  "By closing your eyes and repeating all the information completely backwards", 
  "By looking at a physical map of the location you choose to memorize", 
  "By randomly guessing the items you might have placed in different rooms"
),
new Question(
  "For which of the following tasks is the Memory Palace technique exceptionally well-suited?", 
  "Memorizing a deck of playing cards or a sequential public speech", 
  "Solving complex multi-step mathematical calculus equations", 
  "Learning the deep conversational grammar rules of a foreign language", 
  "Remembering the names of 20 people you just met instantly at a party"
)
];


createRoot(document.getElementById('Interleaving-test')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Game the_question_list={interleavingQuestions}/>
  </BrowserRouter>
)


createRoot(document.getElementById('footer-render')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    
  </BrowserRouter>
)
