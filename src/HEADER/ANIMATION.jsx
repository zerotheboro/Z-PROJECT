import gsap from "gsap";

import { CSSPlugin } from "gsap/CSSPlugin";

gsap.registerPlugin(CSSPlugin);

const the_animation_obj = {
    /*the_tip_anime: 
    (animated_stuff) => {
        animated_stuff.forEach((component) => {
            gsap.fromTo(
            component, 
            {opacity: 0, y: 200},
            {opacity: 1, y: 0, duration: 0.7,
            })}
        )},*/
    the_tip_anime: 
    (animated_stuff) => {
        gsap.fromTo(
            animated_stuff, 
            {opacity: 0, y: 200},
            {opacity: 1, y: 0, duration: 0.7,
            }
        )},
         
    the_section_anime : null,
    the_nav_anime:
    (animated_stuff, translating_length) => {
        gsap.to(
            animated_stuff,
            {y: translating_length, duration: 0.7, overwrite: "auto"}
        )
    }
}
export {the_animation_obj};
