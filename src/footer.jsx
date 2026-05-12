import facebook from './image/facebook.svg';
import IG from './image/IG.png';
import youtube from './image/youtube.svg';
import gmail from './image/gmail.svg';
import DONATE  from './image/QR_donation.png';
import SURVEY from './image/survey.jpg'
import PRIVATE from './image/privacy.jpg'
import DIS from './image/discord.svg'

const list_of_contact = [
    {
        image : facebook,
        scr: "https://www.facebook.com/teo.tr.2025/"

    },
    {
        image : youtube,
        scr: "https://www.youtube.com/@gunnychannel204"
    },
    {
        image : gmail,
        scr : "mailto:2002070343@royal.edu.vn"
    },
    {
        image : IG,
        scr : "https://www.instagram.com/kingston_bussiness/"
    },
    {
        image : DIS,
        scr :"https://discordapp.com/users/964457442815660074" 
    }
];
let divs_of_contacts = list_of_contact.map((source) => <div><a href={source.scr} target='_blank'><img src={source.image}/></a></div>)




function Footer(){
    return(
        <>
        <div className='border_footer section_border'></div>
        <footer id="FOOTER">
            <div className="contact">
                {divs_of_contacts}
            </div>
            <div className='contact qr'>
            <span>
                <h1>Your opinion survey</h1>
                <a href='https://forms.gle/dfjrofp26qWphvJK7' target='_blank'><img src={SURVEY}></img></a>
            </span>
            <span>
                <h1>Your privacy policy</h1>
                <a href='/privacy-policy.html' target='_blank'><img src={PRIVATE}></img></a>
            </span>
            <span>
                <h1>Your donation matters</h1>
                <a href='' target='_blank'><img src={DONATE}></img></a>
            </span>
            </div>
           
           

            <div>
                <h1>phone number:<br/>0909528511</h1>
            </div>
        </footer>
        </>
    )
}

export default Footer

