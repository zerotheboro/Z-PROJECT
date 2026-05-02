import { image_importor, images, imageFiles } from "./info_every_tips";

function Member(props){
    const image = image_importor(props.img)

    return(
        <div className="team_member">
            <img src={image.src} alt="" />
            <h2>{props.name}</h2>
            <p>{props.role}</p>
        </div>
    )
}

export default function Hall_of_fame(){
    return(
    <>
    <h1>Dedicating people</h1>
    <div id="carasoul">
        <div className="team_member_wrapper">
            <Member img={"LOGO"} name="Kingston" role="managing, connecting ideas, design edulience"/>
            <Member img={"LOGO"} name="Ms. Giàu" role="content advisor"/>
            <Member img={"LOGO"} name="Rio" role="creative visionary"/>
            <Member img={"LOGO"} name="Ryan" role="design advisor"/>
            <Member img={"LOGO"} name="Ms. Nga" role="content / design advisor"/>
            <Member img={"LOGO"} name="Ms. Linh" role="content / design advisor"/>
        </div>
        <div className="team_member_wrapper" aria-hidden>
            <Member img={"LOGO"} name="Kingston" role="managing, connecting ideas, design edulience"/>
            <Member img={"LOGO"} name="Ms. Giàu" role="content advisor"/>
            <Member img={"LOGO"} name="Rio" role="creative visionary"/>
            <Member img={"LOGO"} name="Ryan" role="design advisor"/>
            <Member img={"LOGO"} name="Ms. Nga" role="content / design advisor"/>
            <Member img={"LOGO"} name="Ms. Linh" role="content / design advisor"/>
        </div>
    </div>
   
    </>)
}