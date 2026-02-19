import facebook from './image/facebook.svg';
import IG from './image/IG.png';
import youtube from './image/youtube.svg';
import gmail from './image/gmail.svg';
import DONATE  from './image/QR_donation.png';
import SURVEY from './image/SURVEY.png'
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
        <div className='footer_border'></div>
        <footer id="FOOTER">
            <div id="contact">
                {divs_of_contacts}
            </div>
            <h1>YOUR DONATION means alot</h1>
            <a href='' target='_blank'><img src={DONATE}></img></a>
            <h1>YOUR OPINION MATTER</h1>
            <a href='https://forms.gle/dfjrofp26qWphvJK7' target='_blank'><img src={SURVEY}></img></a>
            <h1>YOUR PRIVACY POLICY MATTER</h1>
            <a href='/privacy-policy.html' target='_blank'><img src={SURVEY}></img></a>
            <div>
                <h1>phone number:<br/>0909528511</h1>
            </div>
        </footer>
        </>
    )
}

export default Footer

