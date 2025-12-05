
import react, {useState} from "react";
import {the_animation_obj} from "./../HEADER/ANIMATION.jsx";
import { list_of_tips } from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";


export default function Tips(props) {

  const [show, setShow] = useState({
  });
  
  const list_of_tips_JSX = list_of_tips.map((each_section) => 
    <section id={each_section.type} key={each_section.type} style={{display : show[each_section.type] ? "block" : "none"}}>
      {each_section.additional_material}

      {each_section.list.map((the_tip, idx) => (
        <section className="TIP" key={`${each_section.type}-${idx}`}>
          <div>
            <h1>{the_tip.header}</h1>
            <div>
              <p>{the_tip.paragraph}</p>
              <img src={the_tip.img} alt="logo" />
            </div>
          </div>
        </section>
      ))}

    </section>
  );

 /*function handleClick(section){
    setShow(prevShow => ({
        ...prevShow,
        [section]: !prevShow[section]
    }))
}*/

function handleClickfor1(section){
  setShow(prevShow => {

    const NewState = {};

    list_of_tips.forEach((object) => {
      NewState[object.type] = (object.type === section)? !prevShow[section] : false;
    });
    
    setTimeout(() => {
      

      animation_of_each_tip(section);

      /*const selected_section = document.getElementById(section);
      if (animation_of_each_tip){
        the_animation_obj.the_tip_anime(selected_section.querySelectorAll(".TIP h1, .TIP div p, .TIP img"))
      */
      }, 3)






    return NewState;

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
      {list_of_tips_JSX}
    </>
  );

}