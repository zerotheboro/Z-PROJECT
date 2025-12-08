import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';

const images = import.meta.glob("../image/*.{png,jpg,jpeg,webp,gif,svg}", { eager: true });
/*return an object of file */
const imageFiles = Object.entries(images).map(([path, module]) => ({
  path,
  url: module.default
}));
/*convert it back to another form of object */

function image_importor(name) {
  const found = imageFiles.find(file => file.path.includes(name));
  if (!found) {
    console.warn(`Image not found: ${name}`);
    return null;
  }
  return found.url;
}

/*pls study this */





async function image_selector(url_of_image, format='.svg'){
  const imported_img = await import(`../image/${url_of_image}${format}`);

  console.log(`../image/${url_of_image}${format}`)

  return imported_img.default;
}
  

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


class DetailOfTips{
  constructor(header = "hey this is a header", paragraph = "hey this is a text", img = LOGO){
    this._header = header;
    this._paragraph = paragraph;
    this._img = img;
  }
  get header(){
    return this._header;
  }
  get paragraph(){
    return this._paragraph;
  }
  get img(){
    return this._img;
  }
}



// Module-scope data; export at top-level (not inside a function)
export const list_of_tips = [
  new TypeOfTips("PRE-LEARN", [
    new DetailOfTips("Prime mind", "this is excercise where you would try to find incetives and", image_importor("brain.svg")),
    new DetailOfTips("WATER ur face/body", " althought quite obvious but does it come in common pratice", image_importor("water")),
    new DetailOfTips("BREAK is necessary ", "brain needs break every 45minutes because", image_importor("relaxing_cat")),
    new DetailOfTips("Structure your day", "brain loves certainty, structuring reduces energy of deciding what to do next", image_importor("multiple_checkbox")),
    new DetailOfTips("small workout", "jumpstart ur blood circulating around the body", image_importor("dumbell")),
    new DetailOfTips("Track progress", "motivate you and keep you in mind how much you progress", image_importor("checkbox"))
  ], <Main/>),
  new TypeOfTips("META-LEARN", [
    new DetailOfTips("increase peripheral vision", "next time you read try not to read each word but in group", image_importor("eye")),
    new DetailOfTips("Use length pointer"),
    new DetailOfTips("NO verbal voice"),
    new DetailOfTips("varied/spacial Repetition"),
    new DetailOfTips("Memory palace"),
    new DetailOfTips("Do what you crave last"),
    new DetailOfTips("encode the more paths remember"),
    new DetailOfTips("story telling")
  ]),
  new TypeOfTips("NOTE-TAKE", [
    new DetailOfTips("Note-take 4x4"),
    new DetailOfTips("NO word-for-word"),
  ]),
];

// Named export above; no default export to avoid import ambiguity