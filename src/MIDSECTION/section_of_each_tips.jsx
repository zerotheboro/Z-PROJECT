import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';
import React, {useState} from "react";
import Initial_Choice from "../HEADER/HOOKINTRO.jsx";

// A simple model class for tips
class TypeOfTips {
  constructor(type, list) {
    this._type = type;
    this._list = list;
  }
  get type() {
    return this._type;
  }
  get list() {
    return this._list;
  }
}

// Module-scope data; export at top-level (not inside a function)
export const list_of_tips = [
  new TypeOfTips("PRE-LEARN", [
    "Prime mind",
    "WATER ur face/body",
    "BREAK is neccesary",
    "Structure your day",
    "small workout",
    "Track progress ",
  ]),
  new TypeOfTips("META-LEARN", [
    "increase peripheral vision",
    "Use length pointer",
    "NO inner voice",
    "varied/spacial Repetition",
    "Memory palace",
    "Do what you crave last",
    "encode the more paths remember",
    "story telling",
  ]),
  new TypeOfTips("NOTE-TAKE", ["Note-taking 4x4", "NO word-for-word"]),
];

const [PRE, META, NOTE] = list_of_tips;

export default function Tips(props) {


    
    
  const [show, setShow] = useState({

  }); 

  const PRE0 = (
    <section id={PRE.type} key={PRE.type} style={{display : show[PRE.type] ? "block" : "none"}}>
      <Main />
      {PRE.list.map((the_tip, idx) => (
        <section className="TIP" key={`pre-${idx}`}>
          <div>
            <h1>{the_tip}</h1>
            <div>
              <p>hey this is a text</p>
              <img src={LOGO} alt="logo" />
            </div>
          </div>
        </section>
      ))}
    </section>
  );

  const META0 = (
    <section id={META.type} key={META.type} style={{display : show[META.type] ? "block" : "none"}}>
      
      {META.list.map((the_tip, idx) => (
        <section className="TIP" key={`meta-${idx}`}>
          <div>
            <h1>{the_tip}</h1>
            <div>
              <p>hey this is a text</p>
              <img src={LOGO} alt="logo" />
            </div>
          </div>
        </section>
      ))}

    </section>
  );

  const NOTE0 = (
    <section id={NOTE.type} key={NOTE.type} style={{display : show[NOTE.type] ? "block" : "none"}}>
      {NOTE.list.map((the_tip, idx) => (
        <section className="TIP" key={`note-${idx}`}>
          <div>
            <h1>{the_tip}</h1>
            <div>
              <p>hey this is a text</p>
              <img src={LOGO} alt="logo" />
            </div>
          </div>
        </section>
      ))}
    </section>
  );
  

 function handleClick(section){
    setShow(prevShow => ({
        ...prevShow,
        [section]: !prevShow[section]
    }))
}



function handleClickfor1(section){
  setShow(prevShow => {
    const NewState = {};

    list_of_tips.forEach((object) => {
      NewState[object.type] = (object.type === section)? true : false;
    });

    return NewState
  })
}
  


  return (
    <>
    <section id="options_of_tips_to_choose">
        {list_of_tips.map((section) =>
        <button onClick={() => handleClickfor1(section._type)}>
            {section._type}
        </button> )}
    </section>
      {META0}
      {NOTE0}
      {PRE0}
    </>
  );
}