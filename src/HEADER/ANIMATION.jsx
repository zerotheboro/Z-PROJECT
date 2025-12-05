import gsap from "gsap";

const the_animation_obj = {
    the_tip_anime: 
    (animated_stuff) => {
        animated_stuff.forEach((component) => {
            gsap.fromTo(
            component, 
            {opacity: 0, y: 100},
            {opacity: 1, y: 0, duration: 0.7,
            })}
        )},
        
    the_section_anime : null,
}
export {the_animation_obj};
