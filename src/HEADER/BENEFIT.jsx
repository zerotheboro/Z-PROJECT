import Idea from "./BENEFIT-BOX.jsx";
function Benifit(){
    return(
    <>
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <h1>WHY USE IT?</h1>
        <div id="BENEFIT">
            <Idea main="1. many ways you can learn" details={<>25+ tips, 1+ must fit u</>}/>
            <Idea main="2. you learn from expert" details={<>summerized from:<br/><a target="_blank" href="https://jamesclear.com/atomic-habits">Atomic Habits</a>, <a href="https://www.youtube.com/@JimKwik" target="_blank">Jim Kwik</a>,...</>}/>
            <Idea main="3. you learn + get bonuses" details={<>As you learn, there are bonuses in each tip including free<br/>gym <a href="" title="WE OFFER 1 MONTH FREE">California</a>, <a href="#contact">Boxito</a>,... and you can claim these awsome bonuses avaliable only at Edulience </>}/>
        </div>
    </>)
}

export default Benifit;