
import react, {useState, useEffect} from "react";
import Table from "./TABLE.jsx";
import { get_list_of_tips, loadcustomized_user_list, Customize} from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";
import NAV from '../HEADER/header.jsx';
import Footer from "../footer.jsx";
import AIRecommendation from "./AIRecomendation.jsx";
import LOGO from "../../public/LOGO.png";
import "./Library.scss" ;


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

 function Renderassets(format, source, alt = "") {

  switch (format) {
    case "video":
      return (
        <div className="tip-media tip-media--video">
          <video controls preload="metadata">
            <source src={source} type="video/mp4" />
            Your browser does not support this video.
          </video>
        </div>
      );

    case "image":
      return (
        <div className="tip-media tip-media--image">
          <img
            src={source}
            alt={alt || "Study strategy illustration"}
            loading="lazy"
          />
        </div>
      );

    case "audio":
      return (
        <div className="tip-audio">
          <span className="tip-audio__label">
            Listen to this strategy
          </span>

          <audio controls preload="none">
            <source src={source} />
            Your browser does not support audio.
          </audio>
        </div>
      );
       case "component":
      return (
        <>{source}</>
      );
    
    
      default:
      return (
          <>{source}<div/><div/></>
      );
  }
}
  
  /*these are props u use in the objects of info.jsx */
const list_of_tips_JSX = list_of_tips.map((each_section) => {
  const isVisible = Boolean(show[each_section.type]);

  return (
    <section
      id={each_section.type} 
      key={each_section.type}
      className={`strategy-collection ${
        isVisible ? "is-visible" : ""
      }`}
      hidden={!isVisible}
    >
      <header className="strategy-collection__header">
        <span className="strategy-collection__eyebrow">
          EDULIENCE SSS COLLECTION
        </span>

        <div className="strategy-collection__introduction">
          {VNLanguage === false
            ? each_section.introduction.eng
            : each_section.introduction.vn}
        </div>

        <div className="strategy-collection__count">
          <strong>{each_section.list.length}</strong>

          <span>
            {each_section.list.length === 1
              ? "strategy"
              : "strategies"}
          </span>
        </div>
      </header>

      <div className="strategy-list">
        {each_section.list.map((the_tip, idx) => {
          const title =
            VNLanguage === false
              ? the_tip.header.eng
              : the_tip.header.vn;

          const paragraph =
            VNLanguage === false
              ? the_tip.paragraph.eng
              : the_tip.paragraph.vn;

          const hasAudio =
            the_tip.audio !== false &&
            the_tip.audio?.src;

          const hasAsset =
            the_tip.asset &&
            the_tip.asset.format &&
            the_tip.asset.src;

          const hasMoreInfo =
            the_tip.more_info !== false &&
            the_tip.more_info;

          return (
            <article
              className={`strategy-card strategy-card--${the_tip.side}`}
              id={the_tip.header.eng}
              key={`${each_section.type}-${the_tip.header.eng}-${idx}`}
            >
              <div className="strategy-card__number">
                {String(idx + 1).padStart(2, "0")}
              </div>

              <div className="strategy-card__content">
                <div className="strategy-card__heading">
                  <div>
                    <h2>{title}</h2>
                  </div>

                  {the_tip.header.src && (
                    <img
                      className="strategy-card__icon"
                      src={the_tip.header.src}
                      alt=""
                      aria-hidden="true"
                    />
                  )}
                </div>

                {hasAudio &&
                  Renderassets(
                    "audio",
                    the_tip.audio.src,
                    title
                  )}

                <div className="strategy-card__description">
                  {paragraph}
                </div>
              </div>

              {hasAsset && (
                <div className="strategy-card__asset">
                  {Renderassets(
                    the_tip.asset.format,
                    the_tip.asset.src,
                    title
                  )}
                </div>
              )}
              {hasMoreInfo && (
                  <details className="strategy-details">
                    <summary>
                      <span>More information</span>

                      <span
                        className="strategy-details__icon"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>

                    <div className="strategy-details__content">
                      {the_tip.more_info}
                    </div>
                  </details>
                )}
            </article>
          );
        })}
      </div>

      {each_section.additional_material && (
        <div className="strategy-collection__additional">
          {each_section.additional_material}
        </div>
      )}
    </section>
  );
});

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
      <header>
      <div id="BENEFIT">
        <h1>Edulience finds y<img src={LOGO} className="heroimg"/>ur<br/><u>suitable study strategy!</u><br/></h1>
        <a href="#ways_to_find"><button><h2>Start finding</h2></button></a>
      </div>
      <div class="section_border border_header"></div>
    </header>
      <section
  className="options_of_tips_to_choose"
  id="ways_to_find"
  >
    <div className="ways_intro">

      <p className="ways_eyebrow">
        FIND YOUR METHODS
      </p>

      <h1>
        3 ways to find what works for you.
      </h1>

      <p>
        You don't have to discover your learning
        methods in only one way. Test them,
        get suggestions, or explore them yourself.
      </p>

    </div>


    <div className="ways_grid">

      {/* TRAINING */}

      <article className="way_card">

        <span className="way_number">
          01
        </span>

        <h2>
          Training
        </h2>

        <p>
          Try learning methods in real tasks,
          compare your performance, and build
          a learning profile from actual evidence.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/training")
          }
        >
          Start training →
        </button>

      </article>


      {/* AI */}

      <article className="way_card">

        <span className="way_number">
          02
        </span>

        <h2>
          AI Deep Suggestion
        </h2>

        <p>
          Describe what you're learning,
          what you're struggling with, and
          what you need. AI helps narrow down
          methods worth trying.
        </p>

        <a href="#AI-recommendation">
          Ask AI →
        </a>

      </article>


      {/* LIBRARY */}

      <article className="way_card">

        <span className="way_number">
          03
        </span>

        <h2>
          Explore the Library
        </h2>

        <p>
          Browse the learning methods yourself,
          understand how they work, compare them,
          and choose what you want to experiment with.
        </p>

        <a href="#Library">
          Explore methods →
        </a>

      </article>

    </div>

  </section>
      <AIRecommendation/>
      <section className="sss-library" id="Library">
  <header className="sss-library__header">
    <div>
      <span className="sss-library__eyebrow">
        EDULIENCE METHOD DATABASE
      </span>

      <h1>Explore the SSS Library</h1>

      <p>
        Browse, compare and discover Suitable Study Strategies
        based on what you need before, during and after learning.
      </p>
    </div>

    <div className="sss-library__summary">
      <strong>
        {list_of_tips.reduce(
          (total, section) => total + section.list.length,
          0
        )}
      </strong>

      <span>study strategies</span>
    </div>
  </header>

  <div className="sss-library__grid">
    {list_of_tips.map((section, index) => {
      const libraryInformation = {
        "YOUR-SYSTEM": {
          number: "01",
          label: "Personal collection",
          description:
            "View strategies suggested for you and methods you have added.",
          icon: "✦"
        },

        "PRE-LEARN": {
          number: "02",
          label: "Prepare to learn",
          description:
            "Improve focus, energy, motivation and your study environment.",
          icon: "↗"
        },

        "META-LEARN": {
          number: "03",
          label: "Learn how to learn",
          description:
            "Understand, practise and remember information more effectively.",
          icon: "◎"
        },

        "NOTE-TAKE": {
          number: "04",
          label: "Capture knowledge",
          description:
            "Organise, compress and retrieve information through better notes.",
          icon: "≡"
        }
      };

      const information =
        libraryInformation[section.type] || {
          number: String(index + 1).padStart(2, "0"),
          label: "Study strategies",
          description: "Explore this Edulience strategy collection.",
          icon: "→"
        };

      const isOpen = Boolean(show[section.type]);

      return (
        <button
          type="button"
          key={section.type}
          className={`sss-library-card ${
            isOpen ? "is-active" : ""
          }`}
          onClick={() => handleClickfor1(section.type)}
          aria-expanded={isOpen}
          aria-controls={section.type}
        >
          <div className="sss-library-card__top">
            <span className="sss-library-card__number">
              {information.number}
            </span>

            <span className="sss-library-card__icon">
              {information.icon}
            </span>
          </div>

          <div className="sss-library-card__content">
            <span className="sss-library-card__label">
              {information.label}
            </span>

            <h2>{section.type}</h2>

            <p>{information.description}</p>
          </div>
        </button>
      );
    })}
  </div>

  <p className="sss-library__hint">
    Select a collection to reveal its complete strategy guide below.
  </p>
</section>
      {list_of_tips_JSX}  
      <Footer/>  
    </>
  );
  

}