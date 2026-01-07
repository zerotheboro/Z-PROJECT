import facebook from './image/facebook.svg';
import youtube from './image/youtube.svg';
import gmail from './image/gmail.svg';
import DONATE  from './image/QR_donation.png';
import SURVEY from './image/SURVEY.png'

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
            <h1>DONATION means alot</h1>
            <a href='' target='_blank'><img src={DONATE}></img></a>
            <h1>SURVEY improve alot</h1>
            <a href='https://forms.gle/dfjrofp26qWphvJK7' target='_blank'><img src={SURVEY}></img></a>
            <div>
                <p>phone number:<h1>0909528511</h1></p>
            </div>
        </footer>
        </>
    )
}

export default Footer

