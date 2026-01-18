
import react, {useState, useEffect} from "react";
import {the_animation_obj} from "./../HEADER/ANIMATION.jsx";
import { list_of_tips } from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";


export default function Tips(props) {

  const [show, setShow] = useState({
  });

  useEffect(() => {  
    const section_id = Object.keys(show).find(section => show[section] === true)

    const section = document.getElementById(section_id);
    console.log(section_id)
    if(section){
      section.scrollIntoView({behavior: "smooth"})
    }
    /*animation_of_each_tip(section_id); the section_id doesn't seem to be undefined*/
  },[show])
  
  const list_of_tips_JSX = list_of_tips.map((each_section) => 
    <section id={each_section.type} key={each_section.type} style={{display : show[each_section.type] ? "block" : "none"}}>
      {each_section.additional_material}

      {each_section.list.map((the_tip, idx) => (
        <section className="TIP" key={`${each_section.type}-${idx}`}>
          <div>
              <h1>{idx + 1}. {the_tip.header}</h1>
              <p>
                {the_tip.paragraph}
              </p>
              {
                (the_tip.asset.format === "video") ? 
                <video autoPlay controls>
                  <source src={the_tip.asset.src} type="video/mp4"/>
                </video> 
                : <img src={the_tip.asset.src} alt="logo" />
              }
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

function handleClickfor1(section_id){
  setShow(prevShow => {

    const NewState = {};

    list_of_tips.forEach((object) => {
      NewState[object.type] = (object.type === section_id)? !prevShow[section_id] : false;
    });
    setTimeout(() => {
      animation_of_each_tip(section_id);
    }, 7)
    console.log(section_id)

    return NewState;

  })

}



  return (
    <>
    <section id="options_of_tips_to_choose">
        <h1>group of tips</h1>
        {list_of_tips.map((section) =>
        <button onClick={() => handleClickfor1(section._type)}>
            {section._type}
        </button> )}
    </section>
      {list_of_tips_JSX}
    </>
  );

}