import LOGO from "../image/LOGO.png";
import language from "../image/languages.svg";
import wayofgroups from "../image/ways of groups.svg";
import contact from "../image/contact.svg";
import quiz from "../image/quiz.svg";

import {
    NavLink,
    Link,
    useLocation
} from "react-router-dom";

import {
    loginWithGoogle
} from "../services/auth";

import {
    the_animation_obj
} from "./ANIMATION";

import {
    useEffect,
    useRef
} from "react";


function NAV(props) {

    const old_Y_value =
        useRef(window.scrollY);

    const location =
        useLocation();


    useEffect(() => {

        const nav =
            document.getElementById("NAV");

        if (!nav) return;

        const nav_height =
            2 * nav.offsetHeight;


        function nav_contract() {

            const current_Y_value =
                window.scrollY;

            if (
                current_Y_value >
                old_Y_value.current
            ) {

                the_animation_obj
                    .the_nav_anime(
                        nav,
                        nav_height * -2
                    );

            } else {

                the_animation_obj
                    .the_nav_anime(
                        nav,
                        0
                    );
            }

            old_Y_value.current =
                current_Y_value;
        }


        window.addEventListener(
            "scroll",
            nav_contract,
            {
                passive: true
            }
        );


        return () => {

            window.removeEventListener(
                "scroll",
                nav_contract
            );
        };

    }, []);


    const isLibraryPage =
        location.pathname === "/library";


    return (
        <header>

            <section id="NAV">

                {/* LOGO / HOME */}

                <Link
                    to="/"
                    className="logo"
                >
                    <img
                        src={LOGO}
                        alt=""
                    />

                    EDULIENCE
                </Link>


                {/* LIBRARY */}

                <NavLink
                    to="/library"
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "nav-link active"
                                : "nav-link"
                    }
                >
                    <span>

                        <img
                            src={wayofgroups}
                            alt=""
                        />

                        Library

                    </span>
                </NavLink>

                {/* TRAINING */}

                <NavLink
                    to="/training"
                    className={
                        ({ isActive }) =>
                            isActive
                                ? "nav-link active"
                                : "nav-link"
                    }
                >
                    <span>

                        <img
                            src={quiz}
                            alt=""
                        />

                        Training

                    </span>
                </NavLink>


                {/* CONTACT */}

                <a
                    href="#footer"
                    className="nav-link"
                >
                    <span>

                        <img
                            src={contact}
                            alt=""
                        />

                        Contact

                    </span>
                </a>


                {/* SIGN IN */}

                <button
                    type="button"
                    className="nav-sign-in"
                    onClick={async () => {

                        try {

                            const user =
                                await loginWithGoogle();

                            console.log(
                                "Logged in:",
                                user.uid,
                                user.email
                            );

                        } catch (error) {

                            console.error(
                                "Login failed:",
                                error
                            );
                        }

                    }}
                >
                    Sign in
                </button>

            </section>

        </header>
    );
}

export default NAV;