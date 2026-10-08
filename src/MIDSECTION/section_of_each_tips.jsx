
import react, {useState, useEffect} from "react";
import Table from "./TABLE.jsx";
import { get_list_of_tips, loadcustomized_user_list, Customize} from "./info_every_tips.jsx";
import animation_of_each_tip from "./SCROLL_function.jsx";
import NAV from '../HEADER/header.jsx';
import Footer from "../footer.jsx";
import AIRecommendation from "./AIRecomendation.jsx";
import LOGO from "../../public/LOGO.png";
import "./Library.scss" ;
import {
  Link
} from "react-router-dom";


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
      <NAV/>
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

       <Link
        to="/training"
        className="way_button"
      >
        Start training →
      </Link>

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

        <a href="#/library">
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


{/* HOW IT WORKS */}

<section className="home-process">

  <div className="home-section-heading">

    <span className="home-eyebrow">
      HOW IT WORKS
    </span>

    <h2>
      From “I don't know what works”
      <br />
      to a system you can actually use.
    </h2>

  </div>


  <div className="home-process-list">

    <article className="home-process-step">

      <div className="home-process-index">
        1
      </div>

      <div>
        <span>
          DISCOVER
        </span>

        <h3>
          Find methods worth trying.
        </h3>

        <p>
          Browse the Library, ask AI for suggestions,
          or start directly with Training.
        </p>
      </div>

    </article>


    <article className="home-process-step">

      <div className="home-process-index">
        2
      </div>

      <div>
        <span>
          EXPERIMENT
        </span>

        <h3>
          Try them instead of guessing.
        </h3>

        <p>
          Training puts learning methods into small
          exercises so you can experience how they
          actually work.
        </p>
      </div>

    </article>


    <article className="home-process-step">

      <div className="home-process-index">
        3
      </div>

      <div>
        <span>
          REFINE
        </span>

        <h3>
          Build a learning profile over time.
        </h3>

        <p>
          Keep what helps, understand what doesn't,
          and gradually build a set of methods for
          different learning situations.
        </p>
      </div>

    </article>

  </div>

</section>


{/* FINAL CTA */}

<section className="home-final-cta">

  <div className="home-final-cta__content">

    <span className="home-eyebrow">
      READY TO START?
    </span>

    <h2>
      Stop searching for the perfect study method.
    </h2>

    <p>
      Start testing what works for you.
    </p>


    <div className="home-final-cta__actions">

      <Link
        to="/training"
        className="home-primary-action"
      >
        Start training →
      </Link>

      <Link
        to="/library"
        className="home-secondary-action"
      >
        Explore the Library
      </Link>

    </div>

  </div>

</section>

  </section>
    <Footer/>
    </>
  );
  

}