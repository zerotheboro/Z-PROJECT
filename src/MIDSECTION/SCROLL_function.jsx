
import { the_animation_obj } from "../HEADER/ANIMATION";

/*function animation_of_each_tip1(section){
    let array_of_tips_component = document.querySelectorAll(`#${section} .TIP h1,#${section} .TIP img,#${section} .TIP p,#${section} .TIP video,#MAIN_CONTENT button`)

    window.addEventListener("scroll", () => {

    for (let i = 0; i < array_of_tips_component.length; i++) {
        /*array_of_tips_component[i].addEventListener("animationend", () => {});
        
        let rect = array_of_tips_component[i].getBoundingClientRect();

        const VIEWER_HEIGHT = window.innerHeight ;

        let inViewdetermination = rect.top >  VIEWER_HEIGHT ;
        /*BARELY need FUTHER IMPROVING 
        (inViewdetermination) ? the_animation_obj.the_tip_anime([array_of_tips_component[i]]) : null;
    }});}    =====================LEGACY======================*/
    
export default function animation_of_each_tip(section){

    let array_of_tips_component = document.querySelectorAll(`#${section} .TIP h1,#${section} .TIP img,#${section} .TIP p,#${section} .TIP video,#MAIN_CONTENT button`)

    const observer = new IntersectionObserver((components) => {
    components.forEach((component) =>{
        (component.isIntersecting) ?
        the_animation_obj.the_tip_anime(component.target) 
        : null;
    })
    },{
        threshold : 0.1,
        rootMargin: "10000px 0% 200px 0%"
    })

    array_of_tips_component.forEach((component) => {observer.observe(component)})
}

                                                                                                                                                                                                                                                                                     