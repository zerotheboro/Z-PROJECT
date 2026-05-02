import { useEffect, useRef, useState } from "react";
import { image_importor, images, imageFiles } from "./info_every_tips";

function Clock(){
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0)
    const [workornot, setWorkornot] = useState(0);
    let startTimeRef = useRef(0);
    const intervalIdRef = useRef(null)
    useEffect(()=>{
        if(isRunning){
            intervalIdRef.current = setInterval(() => {
                setElapsedTime(Date.now() - startTimeRef.current)
                console.log(Date.now)
            }, 10)
        }
        return () => {
            clearInterval(intervalIdRef.current);
        }
    }, [isRunning])
    function Cotinue(){
        setWorkornot(PrevWorkornot => PrevWorkornot += 1)
        setIsRunning(false);
        setElapsedTime(0)
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
        const totalMs = (workornot % 2 === 0 ? 25 : 5) * 60 * 1000;
        const remainingMs = totalMs - elapsedTime;

        if (remainingMs <= 0) return "00:00";

        const minutes = Math.floor(remainingMs / (1000 * 60));
        const seconds = Math.floor((remainingMs / 1000) % 60);
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return(
    <div className="Clock asset">
        <img src={image_importor("upper-tomato").src}/>
        <span>{FormatTime()}</span>
        <img src={image_importor("down-tomato").src}/>
        <div className="controls">
            <button onClick={Reset}><img src={image_importor("reset").src}/></button>
            <button onClick={StopandStart}>{(isRunning)? <img src={image_importor("pause").src}/> : <img src={image_importor("play").src}/>}</button>
            <button onClick={Cotinue}><img src={image_importor("continue-arrow").src}/></button>
        </div>
    </div>)
}

export default Clock;