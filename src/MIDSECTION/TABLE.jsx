import YesorNo from "./TABLE_STATUS";
import LOGO from "../image/LOGO.png"
function Table(){
    return(
        <div className="table-wrapper">
        <h2>Edulience vs. other learning programs</h2>
        <table>
            <thead>
                <tr>
                    <th>
                    </th>
                    <th className="Logo">
                        <img src={LOGO} alt="" />
                    </th>
                    <th>
                        OTHERS
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>ROYAL students focus</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="no" ownership="them"/>
                </tr>
                <tr>
                    <td>Offer useful knowledges</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="yes" ownership="them"/>
                </tr>
                <tr>
                    <td>Update 1/2 weeks</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="yes" ownership="them"/>
                </tr>
                <tr>
                    <td>Give bonuses to ROYAL students</td>
                    <YesorNo yesorno="yes" ownership="inspire"/>
                    <YesorNo yesorno="no" ownership="them"/>
                </tr>
            </tbody>
            
        </table>
        </div>
    )
}

export default Table