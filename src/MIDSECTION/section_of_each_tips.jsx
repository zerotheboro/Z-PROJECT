
import react, {useState, useEffect} from "react";
import { list_of_tips } from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";
import NAV from '../HEADER/header.jsx';


export default function Tips(props) {
/*HEY IF YOU'RE LOOKING ITS MECHANISM U SHOULD LOOK AT 1.info.jsx => 2.section_each_tips => 3.BOTTOM TO UPWARD */
  const [show, setShow] = useState({});

  const [VNLanguage, setVNLanguage] = useState(false)

  useEffect(() => {  
    const section_id = Object.keys(show).find(section => show[section] === true)

    const section = document.getElementById(section_id);

    if(section){
      section.scrollIntoView({behavior: "smooth"})
    }
  },[show, VNLanguage])
  
  /*these are props u use in the objects of info.jsx */
  const list_of_tips_JSX = list_of_tips.map((each_section) => 
    <section id={each_section.type} key={each_section.type} style={{display : show[each_section.type] ? "block" : "none"}}>
      {each_section.list.map((the_tip, idx) => (
        <section className="TIP" key={`${each_section.type}-${idx}`}>
          <div className={the_tip.side}>
              <h1>{idx + 1}.{" "}{(VNLanguage === false)? the_tip.header: the_tip.VNheader}</h1>
              <p>
                {(VNLanguage === false)? the_tip.paragraph: the_tip.VNparagraph}
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
     {each_section.additional_material}
    </section>
  );

function handleClickforLanguage(e){
  (VNLanguage)? e.target.textContent = `Vietnamese` :  e.target.textContent = `English` 
  setVNLanguage(prevVNLanguage => {
    return !prevVNLanguage
  })
}

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
      <NAV language={handleClickforLanguage}/>
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