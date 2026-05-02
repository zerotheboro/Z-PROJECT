
import VIDEO from "../image/Instruction.mp4";



function Instruction(){
    return(
        <>
        <div className="Instructions">
            <h1>Instructions</h1>
            <video autoPlay controls>
                <source src={VIDEO} type="video/mp4"></source>
            </video>
        </div>
        </>
    )
}
export default Instruction