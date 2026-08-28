import { the_animation_obj } from "../HEADER/ANIMATION";

export default function animation_of_each_tip(section){

    let array_of_tips_component = document.querySelectorAll()


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

                                                                                                                                                                                                                                                                                     