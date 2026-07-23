
import react, {useState, useEffect} from "react";
import Table from "./TABLE.jsx";
import { get_list_of_tips, loadcustomized_user_list, Customize} from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";
import NAV from '../HEADER/header.jsx';
import Daily from "./Day.jsx";
import Hall_of_fame from "./HALL_of_fame.jsx";
import Game from "./META.jsx";
import firstway from "../../public/your_system.mp4"
import secondway from "../../public/meta_note_pre.mp4"
import AIRecommendation from "./AIRecomendation.jsx";


export default function Tips(props) {
/*HEY IF YOU'RE LOOKING ITS MECHANISM U SHOULD LOOK AT 1.info.jsx => 2.section_each_tips => 3.BOTTOM TO UPWARD */
  const [show, setShow] = useState({});
  const [customize_list, setCustomize_list] = useState(loadcustomized_user_list())
  const [VNLanguage, setVNLanguage] = useState(false)

  const list_of_tips = get_list_of_tips(customize_list, setCustomize_list);

  useEffect(() => {  
    const section_id = Object.keys(show).find(section => show[section] === true)

    const section = document.getElementById(section_id);

    if(section){
      section.scrollIntoView({behavior: "smooth"})
    }
  },[show, VNLanguage])

  function Renderassets(format, source){
    switch(format){
      case "video": return <video className="not_extra" autoPlay controls><source src={source} type="video/mp4"/></video>;
      case "image": return <img src={source} alt="logo"/>;
      case "audio": return <audio controls><source src={source}/></audio>;
      default : return <>{source}</>;
    }

  }
  
  /*these are props u use in the objects of info.jsx */
  const list_of_tips_JSX = list_of_tips.map((each_section) => 
    <section id={each_section.type} key={each_section.type} style={{display : show[each_section.type] ? "block" : "none"}}>
      {(VNLanguage === false)? each_section.introduction.eng : each_section.introduction.vn }
      {each_section.list.map((the_tip, idx) => (
        <>
        <section className="TIP" key={`${each_section.type}-${idx}`}>
          <div className={the_tip.side} id={the_tip.header.eng} >
              <h2>{idx + 1}.{" "}{(VNLanguage === false)? the_tip.header.eng : the_tip.header.vn}<img src={the_tip.header.src}/> </h2>
              <p>
                {(the_tip.audio === false )? null :  Renderassets("audio", the_tip.audio.src)} 
                {(VNLanguage === false)? the_tip.paragraph.eng : the_tip.paragraph.vn}
              </p>
              {Renderassets(the_tip.asset.format, the_tip.asset.src)}
              {( the_tip.more_info === false)? null : <details><summary><h2>more info</h2></summary>{the_tip.more_info}</details>}
          </div> 
        </section>
        </>
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
    return NewState;

  })
}



  return (
    <>
      <NAV language={handleClickforLanguage}/>
      <section className="options_of_tips_to_choose" id="ways_to_find">
        <h1>2 ways to find your study hacks:</h1>
          <div>
            <p>1st: answer questions in your-system</p>
            <video autoPlay controls loop>
              <source src={firstway} type="video/mp4"/>
            </video>
          </div>
          <div>
            <p>2nd: discover, compare every methods</p>
            <video autoPlay controls loop>
              <source src={secondway} type="video/mp4"/>
            </video>
          </div> 
      </section>
      <AIRecommendation/>
      <section className="options_of_tips_to_choose">
          <h1>Library</h1>
          {list_of_tips.map((section) =>
          <button onClick={() => handleClickfor1(section._type)}>
              {section._type}
            
          </button> )}
      </section>
      {list_of_tips_JSX}     
      <Game/>
    </>
  );

}