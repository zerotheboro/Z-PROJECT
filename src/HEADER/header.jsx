
import LOGO from "./../image/LOGO.png";
import Benifit from "./BENEFIT";
import { the_animation_obj } from "./ANIMATION";
import { useEffect, useRef } from "react";





function NAV(){
    let old_Y_value = useRef(window.scrollY);

    useEffect(()=>{
        const nav = document.getElementById("NAV");
        if(!nav) return;

        let nav_height = nav.offsetHeight;

        function nav_contract(){

            let current_Y_value = window.scrollY;

            (current_Y_value > old_Y_value.current) ? the_animation_obj.the_nav_anime(nav, nav_height*-2) : the_animation_obj.the_nav_anime(nav, 0);

            old_Y_value.current = current_Y_value
        }

        window.addEventListener("scroll", nav_contract, {passive: true});

        return() =>{
            window.removeEventListener("scroll", nav_contract);
        }
    },[])
        


    const img_source = LOGO;
    return(
        <header>  
            <section id="NAV">
                <span className="logo"><img src={img_source}/>EDULLIENCE</span>
                <span><a href="#BENEFIT">BENEFITs</a></span>
                <span><a href="#options_of_tips_to_choose">tips group</a></span>
                <span><a href="#contact">CONTACTs</a></span>
            </section>
            <Benifit/>
        </header>
    );
}

export default NAV;