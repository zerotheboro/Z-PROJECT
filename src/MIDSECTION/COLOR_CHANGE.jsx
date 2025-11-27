



function givedecison(e){
    let list_of_colors =  [ { name: "red",    hsla: "hsla(0, 100%, 50%, 1)" },
                            { name: "orange", hsla: "hsla(30, 100%, 50%, 1)" },
                            { name: "yellow", hsla: "hsla(60, 100%, 50%, 1)" },
                            { name: "green",  hsla: "hsla(120, 100%, 40%, 1)" },
                            { name: "blue",   hsla: "hsla(240, 100%, 50%, 1)" },
                            { name: "purple", hsla: "hsla(280, 100%, 60%, 1)" },
                            { name: "pink",   hsla: "hsla(330, 100%, 70%, 1)" },
                            { name: "gray",   hsla: "hsla(0, 0%, 50%, 1)" },
                            { name: "white",  hsla: "hsla(0, 0%, 100%, 1)" },
                            { name: "black",  hsla: "hsla(0, 0%, 0%, 1)" },
                            { name: "crimson",      hsla: "hsla(348, 83%, 47%, 1)" },
                            { name: "darkorange",   hsla: "hsla(33, 100%, 45%, 1)" },
                            { name: "gold",         hsla: "hsla(50, 100%, 50%, 1)" },
                            { name: "lime",         hsla: "hsla(120, 100%, 50%, 1)" },
                            { name: "cyan",         hsla: "hsla(180, 100%, 50%, 1)" },]
   

    let  selector_color1 = Math.floor(Math.random()*list_of_colors.length);
    let  selector_color2 = Math.floor(Math.random()*list_of_colors.length);

    let current_value = e.target.textContent;
    if (list_of_colors[selector_color1].name !== current_value) {
    e.target.style.color = `${list_of_colors[selector_color1 + 2 >= list_of_colors.length ? selector_color1 - 3 : selector_color1 + 2 ].hsla}`
    e.target.textContent = `${list_of_colors[selector_color2 + 2 >= list_of_colors.length ? selector_color2 - 3 : selector_color2 + 2 ].name}`
    }
    else if (list_of_colors[selector_color1].name === current_value) {

        let indexremove = list_of_colors.indexOf(current_value)
        list_of_colors.splice(indexremove, 1)
        let  selector_color3 = Math.floor(Math.random()*list_of_colors.length)
        let  selector_color4 = Math.floor(Math.random()*list_of_colors.length)
        e.target.style.color = `${list_of_colors[selector_color4].hsla}`
        e.target.textContent = `${list_of_colors[selector_color3].name}`

    }

};

function BODY(){
    return(
        <>
            <section id="MAIN_CONTENT">
                <h1>STROOP EFFECT</h1>
                <button id="PROMPT" onClick={(e) => givedecison(e)}>COLOR!!!</button>
            </section>
        </>
    );
        
}

export default BODY