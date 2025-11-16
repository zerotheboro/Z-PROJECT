
import LOGO from "./image/LOGO.png";

function NAV(){
    const img_source = LOGO;
    return(
        <header>
            <section id="NAV">
                <span class="logo"><img src={img_source}/>RAPID CHOICE</span>
                <span>BENEFITS</span>
                <span>STEPS</span>
                <span>CONTACT</span>
            </section>
        </header>
    );
}

export default NAV;