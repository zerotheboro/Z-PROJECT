import { useEffect, useRef, useState } from "react";
import { image_importor, images, imageFiles } from "./info_every_tips";

function Clock(){
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0)
    const [workornot, setWorkornot] = useState(0);
    const audioRef = useRef(new Audio("/alertsound.mp3"));
    const totalMs = (workornot % 2 === 0 ? 25 : 5) * 60 * 1000;
    const remainingMs = totalMs - elapsedTime;
    let startTimeRef = useRef(0);
    const intervalIdRef = useRef(null)
    useEffect(()=>{

        if(remainingMs < 1000 && remainingMs > 0){
            audioRef.current.play()
             .then(() => {
                ;
            })
            .catch(err => {
                console.error("Browser blocked autoplay! Click anywhere on the app layout first.", err);
                // Optional: Alert the user visually if audio is blocked
                alert("Timer finished! (Audio was muted by your browser until you click the page)");
            });
           
        }

        if(isRunning){
            intervalIdRef.current = setInterval(() => {
                setElapsedTime(Date.now() - startTimeRef.current)
            }, 250)
        }
        return () => {
            clearInterval(intervalIdRef.current);
        }
    }, [isRunning,  remainingMs])
    function Cotinue(){
        setWorkornot(PrevWorkornot => PrevWorkornot + 1)
        setIsRunning(false);
        setElapsedTime(0)
        document.title = "Edulience"

    }
    function StopandStart(){
        setIsRunning(PrevIsRunning => {
            if(PrevIsRunning){return false} 
            else{ startTimeRef.current = Date.now() - elapsedTime; return true }
        });
    }
    function Reset(){
        setIsRunning(false);
        setElapsedTime(0)
    }
    function FormatTime(){

        if (remainingMs <= 0){
            return "00:00"
        } ;

        const minutes = Math.floor(remainingMs / (1000 * 60));
        const seconds = Math.floor((remainingMs / 1000) % 60);

        if(minutes != 25){
            document.title  = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        }
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return(
    <div className="Clock asset">
        <div className="showtime">{FormatTime()}</div>
        <div className="controls">
            <button onClick={Reset}><img src={image_importor("reset").src}/></button>
            <button onClick={StopandStart}>{(isRunning)? <img src={image_importor("pause").src}/> : <img src={image_importor("play").src}/>}</button>
            <button onClick={Cotinue}><img src={image_importor("continue-arrow").src}/></button>
        </div>
    </div>)
}

export default Clock;