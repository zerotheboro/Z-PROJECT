
import LOGO from "./../image/LOGO.png";
import Benifit from "./BENEFIT";
import Initial_Choice from "./HOOKINTRO";
function NAV(){
    const img_source = LOGO;
    return(
        <header>
            
            <section id="NAV">
                <span class="logo"><img src={img_source}/>EBULLIENCE</span>
                <span><a href="#BENEFIT">BENEFITs</a></span>
                <span>
                    <a href="#options_of_tips_to_choose">TIP OPTION</a>
                </span>
                <span><a href="#contact" target="_self">CONTACTs</a></span>
            </section>
            <Initial_Choice/>
            <Benifit/>
        </header>
    );
}

export default NAV;