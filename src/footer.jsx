import facebook from './image/facebook.svg';
import youtube from './image/youtube.svg';
import gmail from './image/gmail.svg'


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
            <p>phone number: 0909528511</p>
        </footer>
        </>
    )
}

export default Footer

