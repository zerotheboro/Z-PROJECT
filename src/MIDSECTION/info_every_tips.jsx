import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';

const images = import.meta.glob("../image/*.{png,jpg,jpeg,webp,gif,svg,mp4}", { eager: true });
/*return an object of file */
const imageFiles = Object.entries(images).map(([path, module]) => ({
  path,
  url: module.default
}));
/*convert it back to another form of object */

function image_importor(name, type = "image") {
  const found = imageFiles.find(file => file.path.includes(name));
  if (!found) {
    console.warn(`Image not found: ${name}`);
    return null;
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
  constructor(type, list, additional_material = null) {
    this._type = type;
    this._list = list;
    this._additional_material = additional_material
  }
  get type() {
    return this._type;
  }
  get list() {
    return this._list;
  }
  get additional_material(){
    return this._additional_material;
  };
}

/*change img into asset */
class DetailOfTips{
  constructor(header = "header", paragraph = "p", asset = { src:LOGO, type: "image"}, side="right", VNheader = "VN 1#", VNparagraph = "VN para !!!"){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
    this._side = side;
    this._VNheader = VNheader;
    this._VNparagraph =VNparagraph;
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
  get VNheader(){
    return this._VNheader;
  }
  get VNparagraph(){
    return this._VNparagraph;
  }
}



// Module-scope data; export at top-level (not inside a function)
export const list_of_tips = [
  new TypeOfTips("PRE-LEARN", [
    new DetailOfTips("Prime mind", 
    <>
      determine the importance of it 
      to yourself by asking what will this 
      help me, and the more important something
      is the more u pay attention. doing this
      reflect the importance.
    </>, image_importor("brain.svg"),),

    new DetailOfTips("Everything in 1 place", 
    <>
      free up ur mind by putting everything you
      need at 1 place, Moreover you would notice 
      easier and get it done, <a href="https://zerotheboro.github.io/KINGSTON/" target="_blank">BOXITO</a> can help u achive that
    </>,
    image_importor("BOXITO")),

    new DetailOfTips("WATER ur face/body", 
    <>
      Drink water around a glass of water
      and splash water onto ur face to awake
      your mind!
    </>,
    image_importor("water"), "left"),

    
    new DetailOfTips("BREAK ≠ DISTRACTION", 
    <>
      try to take neccesary break and not 
      surround yourself with distractions which
      can derail your focus
    </>,
    image_importor("relaxing_cat")),


    new DetailOfTips("small workout", 
    <>
      doing a small workout before learning
      helps u get your brain the oxygen it needed more
      and it can be simple like streching or pushup, situp.
    </>, image_importor("dumbell"), "left"),

    new DetailOfTips("Structure your day", 
    <>
      brain loves certainty, structuring
      reduces energy of deciding what to do next
    </>,
    image_importor("multiple_checkbox")),

    new DetailOfTips("most craving is last",
      <>
        find the thing you love to do and do it last,
        this gives u the urge to finish everything
        in order to do the thing you want to do
      </>, image_importor("pirate_map"), "left"),


    new DetailOfTips("Track progress",
    <>
      motivate you and keep you
      in mind how much you progress
    </>,
    image_importor("checkbox")),


    new DetailOfTips("BRAIN DIET", 
    <>
      your brain need the nutrition and
      drinking low sugar matcha, water
      and eating salmon, walnuts,
    </>, 
    image_importor("chicken"), "left"),


    new DetailOfTips("AUTO GOOGLE",
      <>
        This feature auto open the tabs
        you want to learn right away
        click {<button type="button" onClick={() => {navigator.clipboard.writeText("chrome://settings/onStartup")}}>link</button>} to copy & paste
        or follow the turtorial below
      </>,
      image_importor("google", "video")),

      
    new DetailOfTips("summary & print",
      <>
        this is a google doc that would
        help you print all the tips,
        and explain the tips in more details + evidences
        <a href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing" target="_blank"><button>THE GG DOC</button></a>
      </>
    ),

  ], <Main/>),


  new TypeOfTips("META-LEARN", [
    new DetailOfTips("HEADER first", 
    <>
      often we don't put much thoughts
      but doing it aids you in getting
      the overall idea better
    </>),
    new DetailOfTips("peripheral vision", 
    <>
      next time you read try not
       to read each word but in group
    </>, image_importor("eye"), "left"),
    
    new DetailOfTips("Use length pointer", 
      <>
        use pointer finger or ruler...
         to track your reading allowing continutity
         (no progression) which saves your time
      </>, image_importor("book_pointer")),

    new DetailOfTips("Repetition", "repeatition is mastery and learning how to do it helps a lot. There are 2 ways to do it, 1 spacial repeat ur knowledge at certain space and 2 mix the order up ", "left"),
    new DetailOfTips("story telling",
      <>
        story like`the oxygen concentration
        we breath is heated by our body temperature,
        passes to ur lungs suface area` is an ex of
        using it to remember what influences gas exchange
      </>, image_importor('storytelling')),
    new DetailOfTips("PRESENTATION", 
      <>
        Telling & recalling what you have learnt to 
        sonebody could be yourself, friends, allow u to 
        organize your thoughts to explain clearly hence 
        boost ur understanding abt it.
      </>, 
      image_importor("PRESENTATION"), "left"),

    new DetailOfTips("ABBREVIATION!",
      <>
        Arrange needed element's first letter
        in 1 words and so would save memory & 
        time by remember 1 word;
      </>, 
      image_importor("SWOT")),

    new DetailOfTips("summary & print",
      <>
        this is a google doc that would
        help you print all the tips,
        and explain the tips in more details + evidences
        <a href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing" target="_blank"><button>THE GG DOC</button></a>
      </>
    )
  ]),
  new TypeOfTips("NOTE-TAKE", [
    new DetailOfTips("1 sentence",
      <>
        summerize every elements are needed 
        to understand into a sentence, this 
        forces you to choose between words which
         activate your comprehension skill
      </>
    ),
    new DetailOfTips("divide steps",
      <>
        divide your excercise into steps
        with clear instructions like how
        Cambrigde do it
      </>, image_importor("STEP"), "left"
    ),

    new DetailOfTips("Note-take 4x4",
    <>
      a simplifed version of mind map,
      each ideas divide into another 4 ideas
      like how the picture show
    </>, image_importor("4X4")
    ),

    new DetailOfTips("you vs book cycle",
    <>
      listen and write the down what
      you had listen into a notebook as what
      you know and finally compare to your book
      if there are errors, then repeat or ask
    </>,
    image_importor("CYCLE"), "left"),

    new DetailOfTips("CORNELL method", 
    <>
       the side rectangle writes the main idea 
       main section retangle write the content details and
       the footer lower squarerecap overall idea.
    </>, image_importor('CORNELL')),

    new DetailOfTips("HIGHLIGHT!", 
    <>
      only do it after reading full topic
      and have summerized in your own words
    </>,
    image_importor("highlight"), "left"),

    new DetailOfTips("summary & print",
      <>
        this is a google doc that would
        help you print all the tips,
        and explain the tips in more details + evidences
        <a href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing" target="_blank"><button>THE GG DOC</button></a>
      </>
    ),
  ]),
];

// Named export above; no default export to avoid import ambiguity