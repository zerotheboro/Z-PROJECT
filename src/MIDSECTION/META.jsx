
import { useState } from "react";
import { gsap } from "gsap/gsap-core";

export class Question {
  constructor(question, ans1, ans2, ans3, ans4, correct) {
    this._question = question;
    this._ans1 = ans1; 
    this._ans2 = ans2;
    this._ans3 = ans3;
    this._ans4 = ans4;
    this._correct = ans1; 
    this._anslist = [ans1, ans2, ans3, ans4];
  }

  ans(chosen_num) {

    (chosen_num % 2 > 0)? null : this._anslist.reverse();
    gsap.utils.shuffle(this._anslist);

    return (
      <>
        {this._anslist.map((ans, index) => {
          return (
            <button
              key={index}
              className="ans-btn" 
              onClick={(e) => {
              
                (ans === this._correct)
                  ? e.currentTarget.style.backgroundColor = "green"
                  : e.currentTarget.style.backgroundColor = "red"; 
              }}
            >
              <div className={ans === this._ans1 ? `real answer ans${index}` : `answer ans${index}`}>
                {ans}
              </div>
            </button>
          );
        })}
      </>
    );
  }

  get question() {
    return (
      <div className="question">
        <img src=""/>
        <h2>{this._question}</h2>
      </div>
    );
  }
}

let questions = [
  new Question("why is cornell method useful?", "it arranges the main content, summery in scientific way that increase your comprehension,", "it only add in a summery section which let you get the main idea", "it only add in a side section which let you get the interest ideas, notes", "it involve using a deeper imporvement of flash card"),
  new Question("what is feyman technique?", "a 4-step mental model that involves explaining what you learnt to another person", "a 3-step mental model that involves explaining what you learnt to another person", "a 3-step mental model that involves repeating what you learnt to another person", "a 4-step mental model that involves repeating what you learnt to another person"),
  new Question("what is Leitner system?", "a system involves flash cards and number-labelled storing boxes", "a system involves flash cards and unlabelled storing boxes", "a system involves a note and unlabelled storing boxes", "a system include a big note and number-labelled storing boxes"),
  new Question("why is the Leitner system useful?", "the number-labelled storing box suggest the flash cards you remember and don't", "the number-labelled storing box organize the flash cards so you don't lose it", "the number-labelled storing box summerize every flash card", "the number-labelled storing box disorganize flash cards require" ),
  new Question("what is the promodoro method?", "a time management method involving your time division into different intervals, purposes", "a diet management method involving your meal division into different fat level", "a diet method involving your meal being organized into a scientific way ", "an excercise method involve you eating tomato and excercise afterward and learn"),
  new Question("how many intervals of work time and short break needed to get a long break?", "4", "7", "2", "3"),
];

const chosen_num = [];
questions.forEach( _ => {chosen_num.push(Math.floor(Math.random() * 4))});

function Game({the_question_list = questions} = {}) {

  const [contin, setContin] = useState(0);

  function handleclick(){
    const buttons = document.querySelectorAll(".ans-btn");
    buttons.forEach(btn => {
      btn.style.backgroundColor = ""; 
    });

    if(contin + 1 >= the_question_list.length){
      setContin(0)
    }
    else{
      setContin(prevContin => prevContin += 1)
    }
  }

  return (
    <>
      <h1>QUIZ ZONE</h1>
      <div className="quiz" id="quiz">
        {the_question_list[contin].question}
        {the_question_list[contin].ans(chosen_num[contin])}
        <button className="check-button" onClick={()=>{handleclick()}}>Continue</button>
      </div>
    </>
  );
}

export default Game;

