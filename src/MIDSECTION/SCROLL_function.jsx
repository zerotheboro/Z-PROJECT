
import { the_animation_obj } from "../HEADER/ANIMATION";


export default function animation_of_each_tip(){
    window.addEventListener("scroll", () => {

    let array_of_tips = document.querySelectorAll(".TIP")

    for (let i = 0; i < array_of_tips.length; i++) {

        let rect = array_of_tips[i].getBoundingClientRect();

        const HALF_VIEWER_HEIGHT = window.innerHeight * 1.5;

        let inViewdetermination = rect.bottom <=  HALF_VIEWER_HEIGHT;

        (inViewdetermination) ? true : false; //most important thing
    }});}