import { useState } from "react"
function getOFFSETDATE(number){

    let setday = new Date();
    setday.setDate(setday.getDate() + number);
    return setday.toDateString();
}
function getOFFSETHOURS(number, hours_spent){
    let hours = (hours_spent < 168)? Math.floor(hours_spent*number/34) : 42;
    let minute = 60*((hours_spent*number/34).toFixed(2) - Math.floor(hours_spent*number/34));
    minute = Math.round(minute);
    if(hours_spent > 160){
        return `42 hours in`;
    }
    else if(hours === 0){
        return `you haven't chosen your time right?`;
    }
    else{
        return `${hours} hours, ${minute} minutes in`
    }
}

function SpacePlan(){

    let first_interval = getOFFSETDATE(1);

    let second_interval = getOFFSETDATE(4);

    let third_interval = getOFFSETDATE(12);

    let fourth_interval = getOFFSETDATE(22);



    const [hours, setHours] = useState(null);

    function handlechange(e){
    setHours(e.target.value)
    }

    return(
    <div>
        <label for="hours-input">how many hours can you learn in a week?</label><br/>
        <input type="number" placeholder="ex:3" min={0} max={168} onChange={e => handlechange(e)} value={hours} name="hours-input"/>
        <p>+ Review 1: {getOFFSETHOURS(10, hours)} {first_interval}</p>             
        <p>+ Review 2: {getOFFSETHOURS(9, hours)} {second_interval}</p>
        <p>+ Review 3: {getOFFSETHOURS(8, hours)} {third_interval}</p>
        <p>+ Review 4: {getOFFSETHOURS(7, hours)} {fourth_interval}</p>
    </div>
    )
}

export default SpacePlan
