
import { the_animation_obj } from "../HEADER/ANIMATION";

export default function animation_of_each_tip(section){
    window.addEventListener("animationend", () => {});

    let array_of_tips = document.querySelectorAll(`.TIP`)

    let array_of_tips_header = document.querySelectorAll(`.TIP h1`)

    let array_of_tips_img = document.querySelectorAll(`.TIP img`)

    let array_of_tips_p = document.querySelectorAll(`.TIP p`)

    let array_of_tips_component = document.querySelectorAll(`.TIP h1, .TIP img, .TIP p`)

    window.addEventListener("scroll", () => {

    for (let i = 0; i < array_of_tips_component.length; i++) {

        let rect = array_of_tips_component[i].getBoundingClientRect();

        const VIEWER_HEIGHT = window.innerHeight ;

        let inViewdetermination = rect.top >  VIEWER_HEIGHT ;
        /*BARELY need FUTHER IMPROVING */
        (inViewdetermination) ? the_animation_obj.the_tip_anime([array_of_tips_component[i]]) : null;
        
    }});}