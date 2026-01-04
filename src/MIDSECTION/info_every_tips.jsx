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
  constructor(header = "header", paragraph = "p", asset = { src:LOGO, type: "image"}){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
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
}



// Module-scope data; export at top-level (not inside a function)
export const list_of_tips = [
  new TypeOfTips("PRE-LEARN", [
    new DetailOfTips("Prime mind", "asking questions like why must I?...", image_importor("brain.svg")),
    new DetailOfTips("WATER ur face/body", 
    <>
      Drink water around a glass of water
      and splash water onto ur face
    </>,
    image_importor("water")),

    
    new DetailOfTips("BREAK ≠ DISTRACTION", 
    <>
      don't pull out ur phone cause distraction
      unlike break it hooks u up and take more uneccsary time
    </>,
    image_importor("relaxing_cat")),


    new DetailOfTips("small workout", 
    <>
      jumpstart ur blood, 
      get the oxygen ur brain needs
    </>, image_importor("dumbell")),

    new DetailOfTips("Structure your day", 
    <>
      brain loves certainty, structuring
      reduces energy of deciding what to do next
    </>,
    image_importor("multiple_checkbox")),


    new DetailOfTips("Track progress",
    <>
      motivate you and keep you
      in mind how much you progress
    </>,
    image_importor("checkbox")),


    new DetailOfTips("HEALTHY DIET", 
    <>
      your brain need the nutrition and
      drinking low sugar matcha, water
      and eating salmon, walnuts,
    </>, 
    image_importor("checkbox")),


    new DetailOfTips("AUTO GOOGLE",
      <>
        This feature auto open the tabs
        you want to learn right away
        click {<button type="button" onClick={() => {navigator.clipboard.writeText("chrome://settings/onStartup")}}>link</button>} to copy & paste
        or follow the turtorial below
      </>,
      image_importor("google", "video"))

  ], <Main/>),


  new TypeOfTips("META-LEARN", [
    new DetailOfTips("HEADER first", "often we don't put much thoughts into headings but putting more processing into it aids u in getting the overall idea better"),
    new DetailOfTips("peripheral vision", "next time you read try not to read each word but in group", image_importor("eye")),
    new DetailOfTips("Use length pointer", "use pointer finger or ruler... to track ur reading allowing continutity(no progression) which saves ur time", image_importor("book_pointer")),
    new DetailOfTips("NO verbal voice", "ur can read ≈  140 words, process "),
    new DetailOfTips("Repetition", "repeatition is mastery and learning how to do it helps a lot. There are 2 ways to do it, 1 spacial repeat ur knowledge at certain space and 2 mix the order up "),
    new DetailOfTips("most craving is last", "doing this makes u do everything you need with the drive of doing the things you crave the most!; I like coding and so I would do economy then bussiness lastly coding", image_importor("pirate_map")),
    new DetailOfTips("encode cues", "cues can be emotion, picture, "),
    new DetailOfTips("story telling", "story like`the oxygen concentration we breath is heated by our body temperature, passes to ur lungs suface area` is an ex of using it to remember what influences gas exchange"),
    new DetailOfTips("ABBREVIATION!","Putting everything in 1 words and so would save memory & time with little effort; like HoChiMinhInternationalSchool helps me remember factors affecting demand (HabitsComplementsMarketingIncomeSubsitute)")
  ]),
  new TypeOfTips("NOTE-TAKE", [
    new DetailOfTips("Note-take 4x4"),
    new DetailOfTips("NO word-for-word"),
    new DetailOfTips("CORNELL method", "main section(this retangle) write the content details and the side rectangle writes the main idea and the footer(lower square) recap overall idea."),
    new DetailOfTips("HIGHLIGHT!", "" )
  ]),
];

// Named export above; no default export to avoid import ambiguity