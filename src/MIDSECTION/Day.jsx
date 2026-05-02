const c  = ",i";
const now  = new Date();
const day = now.getDay();
const list_of_challenges = ["finish 3 promodoro intervals", "guess the colors of the strooper effect in pre-learn for 16 times", "complete the quiz correctly by 22 times", "watch the instruction video", "use the Feyman technique in the meta-learn to explain what is the feyman technique , why does it work?", "buy youself a yellow highlight", "use the auto-google feature in the pre-learn section to make this website auto-open whenever you opengoogle browser" ]
function Daily_challenge(){
    return(
        <div className="daily_challenge">
            <h1>daily challenge</h1>
            <p>{list_of_challenges[day]}</p>
        </div>
    )
}
export default Daily_challenge;
