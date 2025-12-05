import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';
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
    new DetailOfTips("Prime mind", "this is excercise where you would try to find incetives and "),
    new DetailOfTips("WATER ur face/body", " althought quite obvious but does it come in common pratice"),
    new DetailOfTips("BREAK is necessary ", "your brain needs break every 45minutes because"),
    new DetailOfTips("Structure your day", "your brain loves certainty and doing this reduce energy of deciding what to do next"),
    new DetailOfTips("small workout"),
    new DetailOfTips("Track progress")
  ], <Main/>),
  new TypeOfTips("META-LEARN", [
     new DetailOfTips("increase peripheral vision"),
    new DetailOfTips("Use length pointer"),
    new DetailOfTips("NO inner voice"),
    new DetailOfTips("varied/spacial Repetition"),
    new DetailOfTips("Memory palace"),
    new DetailOfTips("Do what you crave last"),
    new DetailOfTips("encode the more paths remember"),
    new DetailOfTips("story telling")
  ]),
  new TypeOfTips("NOTE-TAKE", [
    new DetailOfTips("Note-taking 4x4"),
    new DetailOfTips("NO word-for-word"),
  ]),
];

// Named export above; no default export to avoid import ambiguity