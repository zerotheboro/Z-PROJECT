import { useRef, useState } from "react"
import { DetailOfTips, image_importor } from "./info_every_tips";

function AddingMethods(){

    const TITLE = useRef(null)

    const CONTENT = useRef(null)

    const [Effort, setEffort] = useState("fish")

    let user_list = JSON.parse(localStorage.getItem("user_lists") || "[]").filter(Boolean);

    function Process_user_methods(e){
        e.preventDefault();
        
        if(!TITLE.current?.value.trim() || !CONTENT.current?.value.trim()){
            return;
        }

        const adding = new DetailOfTips(
           {
            vn: TITLE.current.value,
            eng: TITLE.current.value,
            src: image_importor(Effort).src
           }, 
           {
            vn:CONTENT.current.value,
            eng:CONTENT.current.value,
           })
       
        if( user_list === null){
            localStorage.setItem("user_lists", "[]")
        }
        else if(user_list){
            localStorage.setItem("user_lists", JSON.stringify([adding, ...user_list]))
            window.location.reload() 
        }}
    return(
        <form  onSubmit={Process_user_methods}>
            <h2><label htmlFor="title-input">what title for your awesome methods?</label></h2>
                <input ref={TITLE}   type="text" placeholder="The awesome methods" id="title-input" name="title-input"/>
            <h2><label htmlFor="content-input">how would you describe your methods?</label></h2>
            <input ref={CONTENT} type="text" placeholder="The something or its details" id="content-input" name="content-input"/>
            <h2><label htmlFor="effort_level"> the effort level:</label></h2>
            <div className="rado">
                <div><input type="radio" name="effort_level" value="sharky" onChange={() => setEffort("sharky")}/><label htmlFor="effort-level">Hard</label></div><br/>
                <div><input type="radio" name="effort_level" value="whale" onChange={() => setEffort("whale")}/><label htmlFor="effort-level">Medium</label></div><br/>
                <div><input type="radio" name="effort_level" value="fish" onChange={() => setEffort("fish")}/><label htmlFor="effort-level">Easy</label></div><br/>
            </div> 
            <button type="submit">ADD your methods</button>
        </form> 
         
    )}

export default AddingMethods;