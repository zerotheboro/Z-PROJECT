import NO from "../image/NO.svg";
import YES from "../image/YES.svg";

function YesorNo(props){
    return(
        <td className={(props.ownership === "inspire") ? "inspire": "them"}>
            {(props.yesorno === "yes") ? <img src={YES}></img> : <img src={NO}></img>}
        </td>
    )
}

export default YesorNo