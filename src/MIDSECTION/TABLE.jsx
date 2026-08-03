import YesorNo from "./TABLE_STATUS";
import LOGO from "../image/LOGO.png"
function Table(){
    return(
        <div className="table-wrapper">
        <h2>How Edulience makes study easier</h2>
        <table>
            <thead>
                <tr>
                    <th>
                    </th>
                    <th className="Logo">
                        <img src={LOGO} alt="" />
                    </th>
                    <th>
                        School
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Focus on how to learn</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="no" ownership="them"/>
                </tr>
                <tr>
                    <td>Offer  knowledges</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="yes" ownership="them"/>
                </tr>
                <tr>
                    <td>Loves learners</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="yes" ownership="them"/>
                </tr>
                <tr>
                    <td>Free to use</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="no" ownership="them"/>
                </tr>
            </tbody>
            
        </table>
        </div>
    )
}

export default Table