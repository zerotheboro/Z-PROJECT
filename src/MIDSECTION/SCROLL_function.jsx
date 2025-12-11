
import { the_animation_obj } from "../HEADER/ANIMATION";

export default function animation_of_each_tip(section){

    let array_of_tips = document.querySelectorAll(`.TIP`)

    let array_of_tips_component = document.querySelectorAll(`#${section} .TIP h1,#${section} .TIP img,#${section} .TIP p`)

    window.addEventListener("scroll", () => {

    for (let i = 0; i < array_of_tips_component.length; i++) {
        /*array_of_tips_component[i].addEventListener("animationend", () => {});*/
        
        let rect = array_of_tips_component[i].getBoundingClientRect();

        const VIEWER_HEIGHT = window.innerHeight ;

        let inViewdetermination = rect.top >  VIEWER_HEIGHT ;
        /*BARELY need FUTHER IMPROVING */
        (inViewdetermination) ? the_animation_obj.the_tip_anime([array_of_tips_component[i]]) : null;
    }});}         
                                                                                                                                                                                                                                                                                               