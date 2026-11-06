import facebook from './image/facebook.svg';
import IG from './image/IG.png';
import tiktok from './image/tiktok.png';
import youtube from './image/youtube.svg';
import gmail from './image/gmail.svg';
import DONATE  from './image/QR_donation.jpg';
import SURVEY from './image/survey.jpg'
import PRIVATE from './image/privacy.jpg'
import DIS from './image/discord.svg'
import reddit from './image/reddit.webp'
const list_of_contact = [
    {
        image : facebook,
        scr: "https://www.facebook.com/teo.tr.2025/"

    },
    {
        image : youtube,
        scr: "https://www.youtube.com/@KINGSTON_ROCKY"
    },
    {
        image : tiktok,
        scr : "https://www.tiktok.com/@edulience"
    },
    {
        image : IG,
        scr : "https://www.instagram.com/kingston_bussiness/"
    },
    {
        image : reddit,
        scr :"https://www.reddit.com/r/Edulience/" 
    }
];
let divs_of_contacts = list_of_contact.map((source) => <div><a href={source.scr} target='_blank'><img src={source.image}/></a></div>)




function Footer(){
    return(
        <>
        <div className='border_footer section_border'/>
        <footer id="footer">
            <div className="contact">
                {divs_of_contacts}
            </div>
            <div className='contact qr'>
            <span>
                <h1>Opinion survey</h1>
                <a href='https://forms.gle/dfjrofp26qWphvJK7' target='_blank'><img src={SURVEY}></img></a>
            </span>
            <span>
                <h1>Legal policy</h1>
                <a href='/privacy-policy.html' target='_blank'><img src={PRIVATE}></img></a>
            </span>
            </div>           
        </footer>
        </>
    )
}

export default Footer

