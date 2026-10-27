import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';
import Clock from "./Clock.jsx";
import Timer from './Clock.jsx';
import Daily from "./Day.jsx";
import SpacePlan from "./Space_plan.jsx";
import AddingMethods from "./Writing.jsx";
import RSVP from "./RSVP.jsx";
import { useState, useEffect } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type TipHeader = { eng: string; src?: string };
export type TipParagraph = { eng: ReactNode };
export type TipAsset = { src: ReactNode; format: string };
export type StudyTip = DetailOfTips<TipHeader, TipParagraph>;
type TipConstructorTail = [asset?: TipAsset, side?: string, more_info?: ReactNode,
  audio?: TipAsset | false, legacyUnused?: ReactNode];
type TipConstructorArgs<H, P> = [header?: H, paragraph?: P, ...TipConstructorTail] & (
  "header" extends NoInfer<H>
    ? "p" extends NoInfer<P> ? unknown : [header: H | undefined, paragraph: P, ...TipConstructorTail]
    : "p" extends NoInfer<P> ? [header: H, paragraph?: P, ...TipConstructorTail]
      : [header: H, paragraph: P, ...TipConstructorTail]
);
type CustomizeSetter = Dispatch<SetStateAction<StudyTip[]>>;
type SavedCustomTip = { _header: TipHeader; _paragraph: TipParagraph; _asset: TipAsset };

export const images = import.meta.glob<{ default: string }>("../image/*.{png,jpg,jpeg,webp,gif,svg,mp4,mp3}", { eager: true });
/*return an object of file */
export const imageFiles = Object.entries(images).map(([path, module]) => ({
  path,
  url: module.default
}));
/*convert it back to another form of object */

export function image_importor(name: string, type = "image") {
  const found = imageFiles.find(file => file.path.includes(name));
  if (!found) {
    console.warn(`Image not found: ${name}`);
    return { src : name,
             format : type
    };
  }
  else{
  return {src : found.url,
          format : type
  }
}
}

/*async function image_selector(url_of_image, format='.svg'){
  const imported_img = await import(`../image/${url_of_image}${format}`);

  console.log(`../image/${url_of_image}${format}`)

  return imported_img.default;
}*/
  

/*THE 2 CLASS */
class TypeOfTips {
  declare _type: string;
  declare _list: StudyTip[];
  declare _introduction: TipParagraph;
  declare _additional_material: ReactNode;
  constructor(type: string, introduction: TipParagraph, list: StudyTip[], additional_material: ReactNode = null) {
    this._type = type;
    this._list = list;
    this._introduction = introduction;
    this._additional_material = additional_material;
  }
  get type() {
    return this._type;
  }
  get list() {
    return this._list;
  }
  get introduction(){
    return this._introduction
  }
  get additional_material(){
    return this._additional_material;
  };
}

/*change img into asset */
export class DetailOfTips<H extends TipHeader | string = string, P extends TipParagraph | string = string>{
  declare _header: H;
  declare _paragraph: P;
  declare _asset: TipAsset;
  declare _side: string;
  declare _more_info: ReactNode;
  declare _audio: TipAsset | false;
  // Infer H/P from supplied values, then allow omission only when the literal
  // defaults fit them. This also justifies the unchanged implementation's
  // default assertions: incompatible types must supply their values explicitly.
  // The historical seventh argument remains ignored at runtime.
  constructor(...args: TipConstructorArgs<H, P>);
  constructor(header: H = "header" as H, paragraph: P = "p" as P, asset: TipAsset = image_importor("LOGO", "image"), side="right", more_info: ReactNode = false, audio: TipAsset | false = false){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
    this._side = side;
    this._more_info =more_info;
    this._audio = audio
  }
  get header(){
    return this._header;
  }
  get paragraph(){
    return this._paragraph;
  }
  get asset(){
    return this._asset;
  }
  get side(){
    return this._side;
  }
  get more_info(){
    return this._more_info;
  }
  get audio(){
    return this._audio
  }
}

function CITATE(props: { n?: string; num?: string; src: string }){
  const cite = "¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ¹⁰";
  let num: string | undefined = "";
  switch(props.n){
    case "1": num = "¹";break;
    case "2": num = "²";break;
    case "3": num = "³";break;
    case "4": num = "⁴";break;
    case "5": num = "⁵";break;
    case "6": num = "⁶";break;
    case "7": num = "⁷";break;
    case "8": num = "⁸";break;
    case "9": num = "⁹";break;
    case "10": num = "¹⁰";break;
    case "11": num = "¹¹";break;
    case "12": num = "¹²";break;
    case "13": num = "¹³";break;
    case "14": num = "¹⁴";break;
    case "15": num = "¹⁵";break;
    case "16": num = "¹⁶";break;
    case "17": num = "¹⁷";break;
    case "18": num = "¹⁸";break;
    case "19": num = "¹⁹";break;
    case "20": num = "²⁰";break;
    case "21": num = "²¹";break;
    case "22": num = "²²";break;
    case "23": num = "²³";break;
    case "24": num = "²⁴";break;
    case "25": num = "²⁵";break;
    case "26": num = "²⁶";break;
    case "27": num = "²⁷";break;
    case "28": num = "²⁸";break;
    case "29": num = "²⁹";break;
    case "30": num = "³⁰";break;
    case "31": num = "³¹";break;
    case "32": num = "³²";break;
    case "33": num = "³³";break;
    case "34": num = "³⁴";break;
    case "35": num = "³⁵";break;
    case "36": num = "³⁶";break;
    case "37": num = "³⁷";break;
    case "38": num = "³⁸";break;
    case "39": num = "³⁹";break;

    
    default : num = props.num;
  }
  return(
    <a href={props.src} target="_blank" className="cite">({num})</a>
  )
}

let user_list: StudyTip[];
let raw_object_user_list: SavedCustomTip[] = [];

try {
  const parsed = JSON.parse(localStorage.getItem("user_lists") || "[]");
  raw_object_user_list = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
} catch {
  raw_object_user_list = [];
  localStorage.setItem("user_lists", "[]");
}

if(raw_object_user_list){
  user_list = raw_object_user_list.map((object, index) => {

    function deleteUserTip(_index?: number): void;
    function deleteUserTip(){
      const raw = JSON.parse(localStorage.getItem("user_lists") || "[]").filter(Boolean)

      raw.splice(index, 1)

      localStorage.setItem("user_lists", JSON.stringify(raw))

      window.location.reload()
    }

    return new DetailOfTips(
      object._header,
      {
        eng: (
          <>
            {object._paragraph.eng}
            <button className="x-button" onClick={() => deleteUserTip(index)}><img src={image_importor("xaxon").src}></img></button>
          </>
        ),
      },
      object._asset,
      (index % 2=== 0)? "right" : "left",
      false,
      false
    );
  })}
else{
  user_list = [];
}




/*=======================================DATA BASE=================================================*/

const Prime_question = new DetailOfTips(
  {
    eng: "Prime question",
    src : image_importor("fish").src
  }  ,
  {
    eng: <>
    determine the importance of it (what is it? The topic, the unit, the subject?) 
    to yourself by asking how will this 
    help me? The more important something
    is, the more attention you should pay to it.
    You can write it (what is it? alternative questions or your answers to those questions) down by pressing <u>more-info</u>
  </>,
  },
  image_importor("brain.svg"),
  "left",
  <>
    <label htmlFor="prime-question">What question?</label><br/>
    <textarea name="prime-question" placeholder="What knowledge does this give me?, How much effort do I need to put in?, What is the hardest thing I need to learn?"></textarea>
  </>
)

const Promodoro = new DetailOfTips(
  {
    eng: "Pomodoro technique",
    src : image_importor("fish").src
  },
  {
  eng: <>
    This is a time management tool that helps you
    manage your task, here are the 5 steps:<br/>
    1.identify the tasks that need to be done<br/>
    2.set a 25-minute timer<br/>
    3.focus on finishing the tasks<br/>
    4.after the focus timer runs out, take a 5 -minutes timed rest<br/>
    5.repeat step1,2,3,4 four times then rest for 15-30 minutes and repeat the whole process..<CITATE n="14" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/"/>
    </>,
  },
  {
    src: <Clock/>,
    format: "component"
  },
  "left",
  <iframe  src="https://www.youtube.com/embed/g619AwxdJnY?si=1cUd1y1VmFJ-R11I" title="YouTube video player" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
)

const Flowtime_technique = new DetailOfTips(
  { 
    eng: "Flowtime technique", 
    src: image_importor("fish").src 
  },
  { 
    eng: <> This is a time management tool that helps you work with your natural focus flow. Here are the 5 steps:<br/> 1.choose a specific task to work on<br/> 2.record your start time and begin working without a rigid timer<br/> 3.focus completely until you naturally feel a need for a break<br/> 4.record your end time and calculate your total focus duration<br/> 5.take a proportional break (e.g., 5 mins for &lt;25 mins work, 10-15 mins for 50+ mins work) and repeat.<CITATE n="14" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/"/> </>, 
  },
  { src: <Clock/>, format: "component" },
  "left",
  <iframe src="https://www.youtube.com/embed/g619AwxdJnY?si=1cUd1y1VmFJ-R11I" title="YouTube video player" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
)


const Everything_in_1_place = new DetailOfTips(
  {
    eng: "Everything in 1 place",
    src : image_importor("whale").src
  },
  {
    eng: 
    <>
    free up your mind by putting everything you
    need in 1 place, Moreover you would notice (what?) (what still needs doing )
    easier and get it done, and edulience offer 
    <a
      href=""
      target="_blank"
    >
      BOXITO
    </a>{" "}
    can help u achieve that for free in the your opinion section
    </>,
  },
  image_importor("BOXITO"),
  "right"
)

const Auto_google = new DetailOfTips(
  {
    eng: "AUTO GOOGLE",
    src : image_importor("fish").src
  },
  {
    eng: 
    <>
    This feature auto open the tabs
    you want to learn right away.
    Click{" "}
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText("chrome://settings/onStartup");
      }}
    >
      link
    </button>{" "}
    to copy & paste
    or follow the tutorial below.
  </>,
  },
  
  image_importor("google", "video"),
  "",
  false,
  image_importor("auto_goggle")
)

const Water_ur_face_body = new DetailOfTips(
  {
    eng: "WATER ur face/body",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
    Drink around a glass of water (2 promodoro intervals)
    and splash water onto your face to wake
    your mind! (keep yourself alert)
    </>,
  },
  image_importor("water"),
  "left"
)

const Strooper_effect = new DetailOfTips(
  {
    eng: "Stroop effect",
    src: image_importor("fish").src
  },
  {
    eng:
    <>
      The Stroop task demonstrates how automatic reading can interfere with
      identifying the color of a word.

      It is commonly used in cognitive research to study attention and
      interference.
      <CITATE
        n="3"
        src="https://www.apa.org/research-practice/conduct-research/stroop-effect#:~:text=Despite%20the%20slow%20start%2C%20Stroop,invaluable%20tool%20for%20exploring%20cognition."
      />

      <br/><br/>

      Instructions:<br/>
      1. Press the button.<br/>
      2. Identify the color of the text instead of reading the word.
    </>,
  },
  {
    format: "component",
    src: <Main/>
  },
  "left",
  false,
  image_importor("strooper_audio")
)

const Break_not_distraction = new DetailOfTips(
  {
    eng: "Incubation effect",
    src : image_importor("fish").src
  },
  {eng:
  <>
    a psychological phenomenon where stepping
    away after trying to solve a difficult problem often by taking
    a break or "sleeping on it" leads to a sudden,
    creative solution<CITATE n="16" src="https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212"/>
  </>,
  },
  image_importor("relaxing_cat"),
  "right"
)
const Long_term_workout = new DetailOfTips(
  {
    eng: "Long-term workout",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
      <p>
        Physical activity can support learning, memory, and attention.
        Even a short movement break before studying, such as stretching,
        pushups, or situps, may help you feel more alert and ready to study.
      </p>

      <p>
        Regular exercise has also been associated with benefits for brain
        health and academic performance over time.
        <CITATE
          n="1"
          src="https://lifestylemedicine.stanford.edu/exercise-better-grades/"
        />
      </p>
    </>,
  },
  image_importor("dumbell")
)

const Structure_your_day = new DetailOfTips(
  {
    eng: "Structure your day",
    src : image_importor("whale").src
  },
  {
    eng:
    <>
      The brain loves certainty, structuring your time reduces  saves you the mental energy of deciding what to do next
    </>,
},
  image_importor("multiple_checkbox"),
)

const Premacks_principle = new DetailOfTips(
  {
    eng: "Premack's principle",
    src : image_importor("whale").src
  },
  {
    eng:
    <>
      Find the thing you love to do and do it last,
      this gives u the urge to finish everything
      in order to do the thing you want to do. <CITATE n="10" src="https://www.simplypsychology.org/premack-principle.html"/>
    </>,
  },
  image_importor("pirate_map"),
  "left",
  <>
    <label htmlFor="need">The task you need to do before:</label><br/>
    <textarea name="need" placeholder="Study algrebra"/><br/>

    <label htmlFor="love">The task you love to do after:</label><br/>
    <textarea name="love" placeholder="Relax on social media"/><br/>
  </>
  
)

const Track_progress = new DetailOfTips(
  {
    eng: "Track progress",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
      Tracking progress motivate you and remind you how much
       progress you have made especially when the progress is
        physically written and shown(could be tik tok streak number)<CITATE n="23" src="https://www.apa.org/news/press/releases/2015/10/progress-goals"/>
    </>,
  },
  image_importor("checkbox"),
  "right"
)

const Brain_diet = new DetailOfTips(
  {
    eng: "Foods linked with brain health",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
      <p>
        Some foods are commonly associated with healthy brain function as part
        of an overall balanced diet, including:
      </p>

      + Fatty fish such as salmon and cod<br/>
      + Leafy vegetables such as kale, spinach, and broccoli<br/>
      + Berries such as strawberries and blueberries<br/>
      + Nuts such as walnuts<br/>

      <p>
        This is general educational information, not medical or dietary advice.
      </p>

      <CITATE
        src="https://www.health.harvard.edu/healthbeat/foods-linked-to-better-brainpower"
        n="2"
      />
    </>,
  },
  image_importor("chicken"),
  "left",
  <iframe
    src="https://www.youtube.com/embed/btXIAqMSLaI?si=3kt0H28IhoPyIWlm"
    title="YouTube video player"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />
)

const Incubation_effect = new DetailOfTips(
  {
    eng: "Incubation effect",
    src : image_importor("fish").src
  },
  {eng:
  <>
    a psychological phenomenon where stepping
    away from tryin to solve a difficult problem—often by taking
    a break or "sleeping on it"—leads to a sudden,
    creative solution<CITATE n="16" src="https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212"/>
  </>,
},
)

const Summary_and_print_pre = new DetailOfTips(
  {
    eng: "summary & print",
    src : image_importor("fish").src
  },
  {eng:
  <>
    This is a google doc that 
     you can print that has all the tips,
     in more detail with evidence{" "}
    <a
      href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
},
)


/*===========================META-LEARN=================================*/


const Header_first = new DetailOfTips(
  {
    eng: "HEADER first",
    src : image_importor("fish").src
  },
  {eng:
    <>
      We usually forget about it,
      but reading and trying to predict 
      the topic content it aids you in getting
      the overall idea of the topic better and you can pratice it
      at the more-info section.
    </>,
}
)

const Peripheral_vision = new DetailOfTips(
  {
    eng: "Visual scanning practice",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
      Practice scanning and noticing visual information efficiently rather than
      trying to read every detail one piece at a time.

      You can try activities such as{" "}
      <a
        href="https://schultetable.web.app"
        target="_blank"
        rel="noreferrer"
      >
        <button>Schulte table</button>
      </a>{" "}
      or the Stroop activity in the Pre-learn section.

      These are attention and visual-scanning exercises, not treatments for
      eyesight or vision problems.
    </>,
  },
  image_importor("eye"),
  "left",
  <iframe
    src="https://www.youtube.com/embed/PdI3fJTzK3g?si=ZB17BI2g_3XT7zcT"
    title="YouTube video player"
    frameBorder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />
)
const Doodle_effect = new DetailOfTips(
  {
    eng: "the Doodle effect",
    src : image_importor("fish").src
  },
  {eng:
    <>
      a psychological and cognitive phenomenon where making spontaneous,
      simple drawings while listening to information prevents your mind 
      from wandering and enhances memory retention, but <u>only use when distracted, bored
      and not when you're fully focused</u> to the study session 
      <CITATE n="17" src="https://www.health.harvard.edu/blog/the-thinking-benefits-of-doodling-2016121510844"/><CITATE n="18" src="https://www.damiantgordon.com/Courses/PSIC/doodling.pdf"/>
    </>,
  },
  image_importor("DOODLE"),
  "left",
  <></>,
  image_importor("Doodling")
)
const Use_a_pointer = new DetailOfTips(
  {
    eng: "Use a pointer",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Use your pointer finger or a ruler...
      to track your reading allowing continuity
      which saves time. In addition, there are 2 ways your fingers
      can be used as a pointer in the "more-info" section. <CITATE n="13" src="https://rdcu.be/flj2r"/>
    </>,
  },
  
  image_importor("book_pointer"),
  "right"
)

const Spaced_learning = new DetailOfTips(
  {
    eng: "spaced learning",
    src : image_importor("whale").src
  },
  {
    eng:
  <>
  <p>
    This method is about <b>spreading reviewing time, and only study when you are about to forget </b>       
    for example after you have learnt your lessons, you review it again the following day
    the next time is 2 days later and then 4 days later and so on.
  </p>
    This allows you to study for the same amount of time with better results. 
    The more info section will help you plan your review session.<CITATE n="9" src="https://www.cureus.com/articles/81442-evidence-of-the-spacing-effect-and-influences-on-perceptions-of-learning-and-science-curricula#!/"/> <CITATE n="12" src="https://files.eric.ed.gov/fulltext/EJ1313692.pdf"/>
  </>,
  },
  image_importor("space-learn"),
  "left",
  <>
    <iframe src="https://www.youtube.com/embed/UviQTOdUJEw?si=_ETlIQS9r-fguhCu" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
  </>,
)

const Einstein_framework = new DetailOfTips(
  {
    eng: "Active Blurting",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Active recall is a study methods that
      require remembering and pulling it out and writing it down
      or explain it to a person like the Feyman technique. Doing
      this brings clarity in understanding what you know and not sure at.
    </>,
},
  image_importor("ACTIVE-RECALL"),
  "right"
)

const active_recall = new DetailOfTips(
  {
    eng: "Einstein framework",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Albert Einstein used to say "don't memorize 
      something that can be looked up" and that could
      be writing down your learning methods at the 
      your-methods session.
    </>,
},
  image_importor("einstein"),
  "right"
)

const Interleaved_practice = new DetailOfTips(
  {
    eng: "Interleaved practice",
    src : image_importor("whale").src
  },
  {eng:
    <>
      <p>
      Rather than "Block practice" learning only 1 topic at a time 
      Interleaving involves learning different topics of the same subject, 
       in a session. 
      </p>
      for example, in Math you can alternate
      between learning probability propability, algrebra, and 3D geometry.
      Doing this can feel messy at first, but means your brain more actively
      works to organize, distinguish the topics being studied hence enabling
      you to helps you to understand and remember more..<CITATE n="11" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/"/>
    </>,
},
  image_importor("INTERLEAVE"),
  "left",
  <></>,
  image_importor("Interleavingaudio")
)

const Story_telling = new DetailOfTips(
  {
    eng: "story telling",
    src : image_importor("whale").src
  },
  {eng:
    <>
      For example a mnemonic story like Raging Martian
       Invades Venus Using X-ray Gun helps to remember
      components of light called the electromagtic spectrum
       through the first letter of each word.<CITATE n="4" src="https://voljournals.utk.edu/cgi/viewcontent.cgi?article=3943&context=utk_graddiss"/>
  </>,
},
  image_importor("alien"),
  "right"
)

const FEYNMAN_technique = new DetailOfTips(
  {
    eng: "FEYNMAN Technique",
    src : image_importor("sharky").src
  },
  {eng:<>
    A 4-mental steps process to understand a topic;
    Firstly choose your topic, Secondly after learning 
    find a peer to explain it to , Thirdly, identify what 
    you didn't explain clearly, Lastly, revise those sections
     to fill those gaps. <CITATE n="5" src="https://www.adobe.com/acrobat/resources/feynman-technique.html#:~:text=This%20study%20method%20is%20named,and%20refining%20your%20understanding%20further."/>
  </>,
},
  image_importor("PRESENTATION"),
  "left",
  <>
  <p>
    Albert einstein once said "If you can't explain it simply,
     you don't understand it well enough." and that is very true when it comes
    to explaining ideas to people.
  </p>
  <iframe src="https://www.youtube.com/embed/dRA_UW6ZfOQ?si=wc-jqgL__ub9Oxdd" title="YouTube video player" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
  </>
)
const Memory_Palace = new DetailOfTips(
  {
    eng: "Memory palace",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
    <p>
      A memory palace is a mnemonic technique where you mentally place vivid,
      exaggerated images of information at specific locations inside a familiar
      physical space to easily recall them later. 
    </p>
    <p>
      This strategy transforms 
      abstract facts into spatial data, allowing your brain to navigate its 
      natural layout and retrieve the stored information sequentially.<CITATE n="17" src="https://www.zmescience.com/medicine/mind-and-brain/memory-palace/"/>
    </p>
     
    </>,
  },
  image_importor("palace"),
  "right",
  <><iframe src="https://www.youtube.com/embed/C8r_HncpWrM?si=Jk_ht6v3_4TgtgaV" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe><h1>OR</h1><a href="../../Memory_palace.html"><img src={image_importor("more-info").src} className="more-info"/></a></>,
  image_importor("Palaceaudio")

)
const Summary_and_print_meta = new DetailOfTips(
  {
    eng: "summary & print",
    src : image_importor("fish").src
  },
  {eng:
    <>
       This is a google doc that 
      you can print that has all the tips,
      in more detail with evidence{" "}
      <a
        href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
},
)


/*===========================NOTE-TAKE=================================*/


const One_sentence = new DetailOfTips(
  {
    eng: "1 sentence",
    src : image_importor("fish").src
  },
  {eng:
    <>
      inspired by the feymen technique
      summarize  everything you need to
       understand into a single sentence, this 
      forces you to choose between words which
      activates your comprehension skill
  </>,
}
)

const Divide_steps = new DetailOfTips(
  {
    eng: "divide steps",
    src : image_importor("whale").src
  },
  {eng:
    <>
      divide your exercise  into steps
      with clear instructions like Cambrigde does it
    </>,
  },
  image_importor("STEP"),
  "left"
)

const Derive_basics = new DetailOfTips(
  {
    eng: "derive basics",
    src : image_importor("sharky").src
  },
  {eng:
    <>
       Complex equations/ formulas are made
      up by other basic formulas, like 
      how the "1/2cos(B).a.b" formula
      for the area of a triangle consists of sin, cos and 1/2.base.height.
      Breaking a complex formula into its component parts
      helps you remember the basics
      that make it up, hence deepens your memory of it.
  </>,
},
  image_importor("dedrive"),
)

const Leitner_system = new DetailOfTips(
  {
    eng: "Leitner system",
    src : image_importor("sharky").src
  },
  {eng:
    <>
      A deeper level of flash cards use, where a group
      of flash cards is arranged into a set of 3 or more boxes marked by 1,2,3,...
      choose a card and test yourself. If you get it correct move the card to the next
      box if not return it to box 1.<CITATE src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12658577/" n="6"/>
  </>,
},
  image_importor("Leitner"),
  "left",
  <>
    <video controls><source src={image_importor("Leitner_vid").src} type="video/mp4"/></video>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/kB-NuR6NTZw?si=BDrD5yloPbgS70l9" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
  </>,
  image_importor("LEINTNER")

)

const Note_taking_4x4 = new DetailOfTips(
  {
    eng: "Note-taking 4x4",
    src : image_importor("fish").src
  },
  {eng:
    <>
      A simplifed version of mind mapping,
      each idea is divided into another 4 ideas
      as shown in the picture
    </>,
  },
  image_importor("4X4"),
  "right"
)

const ABBREVIATION = new DetailOfTips(
  {
    eng: "ABBREVIATION!",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Arrange target element's first letter
      into 1 word. This will save memory & 
      time by remembering 1 word instead of many;
    </>,
  },
  image_importor("SWOT"),
  "right"
)

const You_vs_book_cycle = new DetailOfTips(
  {
    eng: "you vs book cycle",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Listen and write down what
      you listened to into a notebook from memory and 
      finally compare your notes to your book so see
      if there are errors, then repeat the task or ask
    </>,
  },
  image_importor("CYCLE"),
  "left"
)

const CORNELL_method = new DetailOfTips(
  {
    eng: "CORNELL method",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Cornell states that the side area is for writing
      your questions and keywords, and the biggest section is 
      for the notes of the details and the downward
      square is used for a summery <CITATE src="https://www.researchgate.net/publication/399574345_The_Influence_of_the_Cornell_Note-Taking_Method_on_Students'_Reading_Comprehension_of_Explanation_Text" n="7"/>
    </>,
  },
  image_importor("CORNELL"),
  "right",
  <iframe  src="https://www.youtube.com/embed/GKodBunEPuI?si=6ERiznbgXUVsTurE" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>,
  image_importor("Cornor")
)

const HIGHLIGHT = new DetailOfTips(
  {
    eng: "HIGHLIGHT!",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Only do it after reading the full topic and have summarized it in your own words but preferably use a yellow  hightlighter because it contrasts best with black letters <CITATE src="https://www.shiftelearning.com/blog/how-do-colors-influence-learning#:~:text=4)%20Yellow:%20The%20Powerhouse%20for,studying%20in%20neutrally%2Dcolored%20environments." n="8"/>
    </>,
  },
  image_importor("highlight"),
  "left"
)

const Summary_and_print_note = new DetailOfTips(
  {
    eng: "summary & print",
    src : image_importor("fish").src
  },
  {eng:
    <>
      This is a google doc that 
      you can print that has all the tips,
      in more detail with evidence{" "}
      <a
        href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
        target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
}
)

const VARK_learners = new DetailOfTips(
  {
    eng: "Study formats",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
      <p>
        VARK describes four common ways learning material can be presented:
        <u> Visual, Aural, Read/Write, and Kinesthetic</u>.
      </p>

      <p>
        These are not fixed learner types. You can use different formats
        depending on the subject and situation.
      </p>

      Visual materials can include diagrams and demonstrations;<br/>
      Aural materials can include lectures and discussion;<br/>
      Read/Write materials include notes, books, and written explanations;<br/>
      Kinesthetic activities involve practice, examples, and hands-on application.

      <CITATE
        src="https://digitalcommons.unl.edu/cgi/viewcontent.cgi?article=1245&context=podimproveacad"
        n="15"
      />
      <br/>
    </>,
  },
  image_importor("VARK"),
  "right",
  false,
  image_importor("VARKAUDIO")
)

const TWO_X_ILETS = new DetailOfTips(
  {
    eng: "2X video speed",
    src : image_importor("whale").src
  },
  {eng:
    <>
    <p>
      Educational videos are often spoken at a pace that some learners can
      comfortably increase. Watching familiar or easier material at around
      1.5x to 2x speed can help you move through content more efficiently,
      as long as you can still understand and remember the key ideas.
    </p>

    <p>
      Try increasing the playback speed gradually and reduce it again when
      the material becomes difficult, unfamiliar, or detail-heavy.
    </p>

    <CITATE
      n="19"
      src="https://francis-press.com/uploads/papers/pv7j7Z9uRgQyPUxnVTDTPecUAEP0HJcWWhGErVeD.pdf"
    />
    <CITATE
      n="20"
      src="https://pubmed.ncbi.nlm.nih.gov/34516216/"
    />
  </>,
  }, image_importor("2XILETS"),
  "right",
  <iframe src="https://www.youtube.com/embed/cyPd2mfnR2Y?si=cWIHwAStR8ZrtLTc" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>,
  image_importor("ILETS2XAUDIO")
)

const words_in_1_spot = new DetailOfTips(
  {
    eng:"RVSP words in 1 space",
    src : image_importor("whale").src
  },
  {eng:
    <>
      a technique where words or images flash one by one
      in a single spot on a screen at high speeds; eliminating 
      the need for natural eye movements across a page, it forces
      the brain to process information rapidly in a fixed location.
      but should only be used when reviewing definition, history,...
      because it  can reduce reader's overall comprehension and memory retention.<CITATE n="21" src="https://www.researchgate.net/publication/328925418_Rapid_serial_visual_presentation_Degradation_of_inferential_reading_comprehension_as_a_function_of_speed"/>
    </>,
},
  image_importor("RSVP_DEFINITION"),
  "left",
  false,
  image_importor("RSVP_AUDI"),
  <>
    <RSVP/>
    <iframe src="https://www.youtube.com/embed/HzOpcQPdvh0?si=g-cySJjN3zKk01vq" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
  </>

)

const twenty_eighty_rule = new DetailOfTips(
  {
    eng: "80/20 rule",
    src : image_importor("whale").src
  },
  {eng:
    <>
    <p>
      80% outcome comes from 20% of the effort
      and in education it is 80% of the score is accounted by
      the 20% of the content but the ratio
      can varies.
    </p>
      
    <p>
       the gist is to indentify the
      main "20%" content you learn and focus on it firstly like how
      we need to know ~3000 English words to know 95% meaning of
      of a text but need ~8000 words to achieve 98%<CITATE n="30" src="https://files.eric.ed.gov/fulltext/EJ1178476.pdf"/><CITATE n="31" src="https://nflrc.hawaii.edu/rfl/item/206"/>
    </p>
     
  </>,
}, image_importor("80and20"), "left", false, image_importor("80_20AUDIO")

)

const ten_minutes_wall = new DetailOfTips(
  {
    eng: "Low-stimulation break",
    src: image_importor("fish").src
  },
  {
    eng:
    <>
      Taking a short break with little or no digital stimulation can give you
      a simple period of rest before returning to a demanding study task.

      Research comparing different types of breaks suggests that highly
      stimulating digital activities may not always provide the same recovery
      benefits as quieter breaks.
      <CITATE
        n="22"
        src="https://pmc.ncbi.nlm.nih.gov/articles/PMC7044622/#S5"
      />

      <br/><br/>

      You can try sitting quietly, looking out a window, or simply doing
      nothing for a few minutes before returning to study.
    </>,
  },
  image_importor("10_minutes_wall"),
  "right",
  "Pairs well with the Incubation effect in Meta-learn."
)


const capture_create = new DetailOfTips(
  {
    eng: "capture & create",
    src : image_importor("whale").src
  },
  {eng:
    <>
      This note-taking methods is for action people who need to apply their knowledges.
      You start by divide the page into 2 sections. The left section you write down "capture"
      or write down all the knowledge; The right section you "create" ways to apply those knowledges
      by answering 3 questions<CITATE n="24" src="https://psycnet.apa.org/record/1999-05760-004"/><CITATE n="25" src="https://act-r.psy.cmu.edu/wordpress/wp-content/uploads/2012/12/19JRA-JF.JEPLMC.94.pdf"/>:<br/>
      <ul>
        <li>how to apply?</li>
        <li>why use it?</li>
        <li>when to use it?</li>
      </ul>
  </>,
},
  image_importor("capture&create"),
  "left",
  "it is inspired by the cornell note-taking methods"
)

const real_music = new DetailOfTips(
  {
    eng: "music = useful?",
    src : image_importor("fish").src
  },
  {eng:
    <>
      people often search for the "perfect" music that boosts your brain productivity,
      but it should strictly be used to control a noisy environment like a coffee shop.<CITATE n="26" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC3678028/"/>
      the music should be a continuous, steady frequency with no lyrics like brown noise. Moreover
      the music should not be used when doing complex task.<CITATE n="27" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12627320/"/>
  </>,
},
  image_importor("music_help"),
  "left",
  <iframe src="" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
)

const point_call = new DetailOfTips(
  {
    eng: "point & call",
    src : image_importor("fish").src
  },
  {eng:
    <>
      a highly successful occupational safety technique used by Japanese railway workers
      to reduce human error and remove the "autopilot" mode therefore should be used mainly for checking answers and here's how:<br/>
      <ol>
        <li>look & point at the question paper</li>
        <li>call & explain to yourself how you got the answer</li>
        <li>hear & verify your own explaination </li>
      </ol>
      Lastly, point & call should not be used as a study methods and only for checking answers.<CITATE n="28" src="https://www.researchgate.net/publication/233927842_The_effects_of_finger_pointing_and_calling_on_cognitive_control_processes_in_the_task-switching_paradigm"/>
  </>,
},
  image_importor("point-call"),
  "left",
  <iframe src="https://www.youtube.com/embed/GynusyJZmwI?si=vZme65oZ6_6Ms5F4" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>,
  image_importor("POINT_CALLAUDIO")
)


const describe_problems = new DetailOfTips(

   {
    eng: "Kidlin's rule",
    src : image_importor("whale").src
  },
  {eng:
  <>
    <p>
      There is a saying "if you can write down your issues clearly 
      then you've solved 50% of the problems" although the 50% can be
      exaggerated, but writing down the problem in detail does helps
      save working memory capacity and cognitive resources. In order,
      to write issues clearly then I would suggest you the "Externalization Framwork".<CITATE n="32" src="https://www.researchgate.net/publication/19415586_Confronting_a_Traumatic_Event_Toward_an_Understanding_of_Inhibition_and_Disease"/><CITATE n="34" src="https://msutoday.msu.edu/news/2017/09/for-worriers-expressive-writing-cools-brain-on-stressful-tasks"/>
    </p>
  </>,
},
  image_importor("KIDLIN"),
  "left",
  <>
  <p>to write problem clearly then you can try a universal adaptation of the Externalization Framework</p>
    <ol>
      <li><strong>Case Definition:</strong> Define clear boundaries, uniform parameters, and the exact sample group exhibiting the problem.</li>
      <li><strong>Case Deconstruction:</strong> Separate the data into two independent categories: observable behaviors versus environmental contexts.</li>
      <li><strong>Similarity Calculation:</strong> Calculate similarities across cases by grouping matching behavioral patterns and contextual traits independently.</li>
      <li><strong>Matrix Correlation:</strong> Cross-reference the behavioral data with the environmental context to pinpoint the exact root cause.</li><CITATE n="33" src="https://www.researchgate.net/publication/336091750_A_Conceptual_Framework_for_the_Externalization_of_Ecological_Wisdom_The_Case_of_Traditional_Korean_Gardens"/>
    </ol>
  </>
)



export const preLearnTips = [
  Prime_question,
  Promodoro,
  Peripheral_vision,
  describe_problems,
  Flowtime_technique,
  Everything_in_1_place,
  Auto_google,
  Water_ur_face_body,
 real_music,
  ten_minutes_wall,
  Strooper_effect,
  Long_term_workout,
  Structure_your_day,
  Track_progress,
  Brain_diet,
  Summary_and_print_pre
]

export const metaLearnTips = [
  Header_first,
  Use_a_pointer,
  Spaced_learning,
  Einstein_framework,
  Doodle_effect,
  Break_not_distraction,
  active_recall,
  point_call,
  TWO_X_ILETS,
  words_in_1_spot,
  Premacks_principle,
  Interleaved_practice,
  Story_telling,
  FEYNMAN_technique,
  Memory_Palace,
  twenty_eighty_rule,
  Summary_and_print_meta

]

export const noteTakeTips = [
  One_sentence,
  Divide_steps,
  Derive_basics,
  Leitner_system,
  Note_taking_4x4,
  ABBREVIATION,
  You_vs_book_cycle,
  CORNELL_method,
  capture_create,
  
  HIGHLIGHT,
  Summary_and_print_note
]

const yourMethods: StudyTip[] = [
  VARK_learners
]

const question_options = [

  // QUESTION 1
  {
    question: "What is the biggest thing stopping you from studying well?",
    options: [
      {
        answer: "I get distracted or procrastinate",
        tips: [
          Promodoro,
          Break_not_distraction,
          Use_a_pointer,
          Premacks_principle,
          Everything_in_1_place
        ]
      },

      {
        answer: "I don't know what to focus on",
        tips: [
          Prime_question,
          twenty_eighty_rule,
          Structure_your_day,
          describe_problems,
          Divide_steps
        ]
      },

      {
        answer: "I feel tired or mentally drained",
        tips: [
          Water_ur_face_body,
          Long_term_workout,
          Brain_diet,
          ten_minutes_wall
        ]
      },

      {
        answer: "I learn it but forget it later",
        tips: [
          active_recall,
          Spaced_learning,
          Leitner_system,
          Memory_Palace,
          ABBREVIATION
        ]
      }
    ]
  },


  // QUESTION 2
  {
    question: "What are you mainly studying right now?",
    options: [

      {
        answer: "A long textbook, article or notes",
        tips: [
          Header_first,
          Use_a_pointer,
          CORNELL_method,
          HIGHLIGHT,
          One_sentence
        ]
      },

      {
        answer: "A difficult concept I need to understand",
        tips: [
          FEYNMAN_technique,
          Einstein_framework,
          Story_telling,
          Derive_basics,
          capture_create
        ]
      },

      {
        answer: "Facts, definitions or vocabulary",
        tips: [
          Leitner_system,
          Memory_Palace,
          ABBREVIATION,
          active_recall,
          Spaced_learning,
          words_in_1_spot
        ]
      },

      {
        answer: "Maths, calculations or problem solving",
        tips: [
          Divide_steps,
          Interleaved_practice,
          point_call,
          Track_progress,
          You_vs_book_cycle
        ]
      }
    ]
  },


  // QUESTION 3
  {
    question: "Where in your study process do you need the most help?",
    options: [

      {
        answer: "Before I start studying",
        tips: [
          Prime_question,
          Auto_google,
          Peripheral_vision,
          Everything_in_1_place,
          twenty_eighty_rule
        ]
      },

      {
        answer: "While I am studying",
        tips: [
          Promodoro,
          Use_a_pointer,
          Doodle_effect,
          real_music,
          TWO_X_ILETS
        ]
      },

      {
        answer: "After learning — reviewing and remembering",
        tips: [
          active_recall,
          Spaced_learning,
          Leitner_system,
          point_call,
          Memory_Palace
        ]
      },

      {
        answer: "Using what I learned in real situations",
        tips: [
          capture_create,
          FEYNMAN_technique,
          Story_telling,
          Interleaved_practice,
          Track_progress
        ]
      }
    ]
  },


  // QUESTION 4
  {
    question: "How do you usually receive the information?",
    options: [

      {
        answer: "Videos or recorded lectures",
        tips: [
          TWO_X_ILETS,
          One_sentence,
          active_recall,
          Note_taking_4x4
        ]
      },

      {
        answer: "Books, PDFs or websites",
        tips: [
          Header_first,
          Use_a_pointer,
          CORNELL_method,
          HIGHLIGHT,
          words_in_1_spot
        ]
      },

      {
        answer: "Teacher explaining something live",
        tips: [
          One_sentence,
          Note_taking_4x4,
          CORNELL_method,
          FEYNMAN_technique
        ]
      },

      {
        answer: "Practice questions and past papers",
        tips: [
          Interleaved_practice,
          point_call,
          Track_progress,
          active_recall,
          Divide_steps
        ]
      }
    ]
  },


  // QUESTION 5
  {
    question: "What improvement matters most to you?",
    options: [

      {
        answer: "Understand things deeply",
        tips: [
          FEYNMAN_technique,
          Einstein_framework,
          Derive_basics,
          Story_telling,
          capture_create
        ]
      },

      {
        answer: "Remember information for longer",
        tips: [
          Spaced_learning,
          active_recall,
          Leitner_system,
          Memory_Palace,
          ABBREVIATION
        ]
      },

      {
        answer: "Study faster and find important information",
        tips: [
          twenty_eighty_rule,
          Header_first,
          TWO_X_ILETS,
          Prime_question,
          words_in_1_spot
        ]
      },

      {
        answer: "Make fewer mistakes",
        tips: [
          point_call,
          Divide_steps,
          Track_progress,
          Interleaved_practice,
          describe_problems
        ]
      }
    ]
  },


  // QUESTION 6
  {
    question: "What usually describes your study session?",
    options: [

      {
        answer: "I only have a short amount of time",
        tips: [
          Prime_question,
          twenty_eighty_rule,
          One_sentence,
          Promodoro
        ]
      },

      {
        answer: "I study for long periods",
        tips: [
          Structure_your_day,
          Break_not_distraction,
          Water_ur_face_body,
          Track_progress,
          Spaced_learning
        ]
      },

      {
        answer: "My environment is noisy or distracting",
        tips: [
          real_music,
          Everything_in_1_place,
          Use_a_pointer,
          Promodoro,
          Break_not_distraction
        ]
      },

      {
        answer: "My brain feels tired after studying",
        tips: [
          ten_minutes_wall,
          Long_term_workout,
          Water_ur_face_body,
          Brain_diet,
          Break_not_distraction
        ]
      }
    ]
  }
];

export function loadcustomized_user_list(): StudyTip[] {
  return JSON.parse(
    localStorage.getItem("customize_user_list") || "[]"
  )
    .flat()
    .filter(Boolean)
    .map((header: string) =>
      [...metaLearnTips, ...preLearnTips, ...noteTakeTips]
        .find(tip => tip.header.eng === header)
    )
    .filter(Boolean) as StudyTip[];
}

function rankSuggestedTips(tips: string[], limit = 8) {
  const scores: Record<string, number> = {};

  tips.forEach(tip => {
    scores[tip] = (scores[tip] || 0) + 1;
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tip]) => tip);
} //THIS FUNCTION RANKS THE METHOD IN THE QUICK CUSTOMIZATION

export function Customize({ setCustomize_list }: { setCustomize_list: CustomizeSetter }){
    const [questionindex, setQuestionindex ] = useState(0);
    
    const [suggestedtips, setSuggestedtips] = useState<string[]>([]);

    useEffect(() => {

  if (questionindex >= question_options.length) {

    const rankedTips = rankSuggestedTips(suggestedtips,8);

    localStorage.setItem("customize_user_list", JSON.stringify(rankedTips));

    }

    },[questionindex >= question_options.length]);


    return(
      (questionindex >= question_options.length)?
        <div className="customize">
          <img src={image_importor("customize").src}/>
          <h2>You have finished customizing</h2>
          <div>
            <button onClick={() => {setQuestionindex(0); setSuggestedtips([])}}>customize again?</button> <button onClick={() => {setCustomize_list(loadcustomized_user_list()); document.getElementById("YOUR-SYSTEM")!.scrollIntoView({behavior: "smooth"}) }}>see result!</button>
          </div>
          
        </div>
        :
        <div className="quiz">
            <h2 className="question">{question_options[questionindex].question}</h2>
            {question_options[questionindex].options.map( (element, index) =>{
                return(
                <button 
                    key={index}
                    onClick={() =>{
                        setQuestionindex(prev => prev + 1);
                        setSuggestedtips(prev => [
                                  ...new Set([
                                    ...prev,
                                    ...element.tips.map(tip => tip.header.eng)
                                  ])
                                ])
                      }}>
                    <div className="answer">{element.answer}</div>
                </button>
                )
            })}
            <p>{questionindex + 1} out of 6 questions</p>
        </div>
    )}

function study_overview(list: StudyTip[]){
  return(
    <ol className="method-overview-list">
      <h2>Overview:</h2>
      {list.map((tip, index) => (
        <>
        <li key={tip.header.eng} className="method-overview-item">
          <a href={"#" + tip.header.eng}>{index + 1 + ". "}{tip.header.eng}</a><img src={tip.header.src}/>
        </li>
        <hr/>
        </>
      ))}
    </ol>
  )
}
/*=======================================DATA BASE=================================================*/


export function get_list_of_tips(customize_list: StudyTip[], setCustomize_list: CustomizeSetter){
  return [
  new TypeOfTips(
    "YOUR-SYSTEM",
    {eng: <div className="introduction">
        <h2>Introduction</h2>
        <p>
        1. YOUR-METHOD is the section where you <u>write down your methods</u><br/>
        2. YOUR-METHOD is also the section that <u>suggest the most suitable study hacks</u><br/>
        3. Each method will have different effort levels from easy, medium to hard.<br/>
        <img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>,
},
        (customize_list.concat(yourMethods.concat(user_list))),
        <>
          <Customize setCustomize_list={setCustomize_list}/>
          <AddingMethods/>
        </>,
  ),
  new TypeOfTips(
    "PRE-LEARN",
      {eng: <div className="introduction">
        <h2>Introduction</h2>
        <div>
        <p>
        1. PRE-LEARN gives you a list of methods <u>give you the right mindset to learn</u><br/>
        2. Each method will have
        different effort levels: easy, medium and hard.<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
        {study_overview(preLearnTips)}
        </div>
      </div>,
},
        preLearnTips),

  new TypeOfTips(
    "META-LEARN",
      {eng:<div className="introduction">
        <h2>Introduction</h2>
        <div>
        <p>
        1. META-LEARN gives you a lists of methods that help you <u>learn how to study effectively</u>.
        <br/>
        2. Each method will have
        different effort levels: easy, medium and hard<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
        {study_overview(metaLearnTips)}
        </div>
      </div>,
},
    metaLearnTips),

  new TypeOfTips(
    "NOTE-TAKE",
    {eng:<div className="introduction">
        <h2>Introduction</h2>
        <div>
        <p>
        1. NOTE-TAKING gives methods to takes 
        note more effectively so you can <u>write the least and gain the most</u>.
        <br/>
        2. Each method will have
        different effort levels: easy, medium and hard.<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
        {study_overview(noteTakeTips)}
        </div>

    </div>,
},
    noteTakeTips
  ),
]} 
// Named export above; no default export to avoid import ambiguity
