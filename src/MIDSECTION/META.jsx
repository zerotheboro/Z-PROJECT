
import { useState } from "react";

class Question {
  constructor(question, ans1, ans2, ans3, ans4) {
    this._question = question;
    this._ans1 = ans1;
    this._ans2 = ans2;
    this._ans3 = ans3;
    this._ans4 = ans4;
    this._anslist = [ans1, ans2, ans3, ans4];
  }

  get real_ans() {
    return this._ans1;
  }

  ans(setSelectedAns, chosen_num) {
    const filter_anslist = this._anslist.filter(
      ans => ans !== this._anslist[chosen_num]
    );
    (chosen_num % 2 > 0)? null : filter_anslist.reverse();



    return (
      <>
        <button
          onClick={() => {
            setSelectedAns(this._anslist[chosen_num]);
          }}
        >
          <div className={this._anslist[chosen_num] === this._ans1 ? "real answer ans0" : "answer ans0"}>
            {this._anslist[chosen_num]}
          </div>
        </button>
        {filter_anslist.map((ans, index) => {
          return (
            <button
              key={index}
              onClick={() => {
                setSelectedAns(ans);
              }}
            >
              <div className={ans === this._ans1 ? `real answer ans${index +1}` : `answer ans${index + 1}`}>
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
  new Question("1+1=?", "2", "3", "7", "1"),
  new Question("what is feyman technique?", "a 4-step mental model that involves explaining what you learnt to another person", "a 3-step mental model that involves explaining what you learnt to another person", "a 3-step mental model that involves repeating what you learnt to another person", "a 4-step mental model that involves repeating what you learnt to another person"),
  new Question("what is Leitner system?", "a system involves flash cards and number-labelled storing boxes", "a system involves flash cards and unlabelled storing boxes", "a system involves a note and unlabelled storing boxes", "a system include a big note and number-labelled storing boxes"),
  new Question("why is the Leitner system useful?", "the number-labelled storing box suggest the flash cards you remember and don't", "the number-labelled storing box organize the flash cards so you don't lose it", "the number-labelled storing box summerize every flash card", "the number-labelled storing box disorganize flash cards require" ),
  new Question("what is the promodoro method?", "a time management method involving your time division into different intervals, purposes", "a diet management method involving your meal division into different fat level", "a diet method involving your meal being organized into a scientific way ", "an excercise method involve you eating tomato and excercise afterward and learn"),
  new Question("how many intervals of work time and short break needed to get a long break?", "4", "7", "2", "3"),
];
const chosen_num = [];
questions.forEach( _ => {chosen_num.push(Math.floor(Math.random() * 4))});

function Game() {
  const [contin, setContin] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);

  function handleClick(e) {
    if (selectedAns === questions[contin].real_ans) {
      e.target.style.backgroundColor = " #228B22"
      e.target.textContent = "last question you got it correct! (press to check)"
    }
    else if(selectedAns === null) {
      e.target.style.color = "whitesmoke"
      e.target.style.backgroundColor = " #333c33"
      e.target.textContent = "you haven't choosen any answer(press to any 4 answer)"
    }
    else {
      e.target.style.backgroundColor = "red"
      e.target.textContent = "last question you got it wrong! (press to check)"
    }
    setContin(prevContin => {
      if (prevContin + 1 >= questions.length) {
        return 0;
      } 
      else if (selectedAns === null){
        return prevContin;
      }
      else {
        return prevContin + 1;
      }
    });

    setSelectedAns(null);
  }

  return (
    <>
      <h1>QUIZ</h1>
      <div className="quiz" id="quiz">
        {questions[contin].question}
        {questions[contin].ans(setSelectedAns, chosen_num[contin])}
        <button className="check-button" onClick={(e) => handleClick(e)}>press to <u>check</u></button>
      </div>
    </>
  );
}

export default Game;

