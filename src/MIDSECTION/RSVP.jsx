import { useState, useRef, useEffect} from "react"

export default function RSVP(){

    const [rsvp, setRsvp] = useState([])

    const [word_shown, setWord_shown] = useState("the word shown here!")

    const [elapsedTime, setElapsedTime] = useState(0)

    function handlechange(e){
        setRsvp((e.target.value).split(/\s+/))
        console.log((e.target.value).split(/\s+/))
    }

    function showRSVP(e){
        setElapsedTime(1)
    }

    useEffect(()=>{
        if( elapsedTime < rsvp.length || elapsedTime === 0){
            setWord_shown(rsvp[elapsedTime - 1])
        }

        const Timer = setInterval(() => {setElapsedTime((prevElapsedTime)=> { return prevElapsedTime += 1})}, 250);

        return () => clearInterval(Timer);
    },[elapsedTime])

    return(
        <>
            <label htmlFor="RSVP">Input:</label><br/> 
            <textarea name="RSVP" id="" onChange={e => handlechange(e)}></textarea><br/>
            <h1>{word_shown}</h1>
            <button onClick={(e) => showRSVP(e)}>Press to see RVSP</button>
        </>
    )
}