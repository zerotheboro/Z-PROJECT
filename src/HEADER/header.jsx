import LOGO from "../image/LOGO.png";
import wayofgroups from "../image/Library.png";
import quiz from "../image/training rock.png";
import Home from "../image/Home button.png";
import Short from "../image/short-icon.png"

import {
  NavLink,
  Link
} from "react-router-dom";

import {
  getCurrentUser,
  loginWithGoogle,
  logoutUser,
  subscribeToAuth
} from "../services/auth";

import {
  the_animation_obj
} from "./ANIMATION";

import {
  default as React,
  useEffect,
  useRef,
  useState
} from "react";

function NAV() {
  const old_Y_value = useRef(window.scrollY);
  const accountRef = useRef(null);
  const [user, setUser] = useState(getCurrentUser);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const nav = document.getElementById("NAV");

    if (!nav) return;

    const navHeight = nav.offsetHeight;

    function nav_contract() {
      const currentY = window.scrollY;

      if (currentY > old_Y_value.current && currentY > 70) {
        the_animation_obj.the_nav_anime(
          nav,
          navHeight * -1.6
        );
      } else {
        the_animation_obj.the_nav_anime(
          nav,
          0
        );
      }

      old_Y_value.current = currentY;
    }

    window.addEventListener(
      "scroll",
      nav_contract,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        nav_contract
      );
    };
  }, []);

  useEffect(() => subscribeToAuth((currentUser) => {
    setUser(currentUser);

    if (!currentUser) {
      setAccountOpen(false);
    }
  }), []);

  useEffect(() => {
    if (!accountOpen) return undefined;

    function closeAccountMenu(event) {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    function closeAccountMenuWithEscape(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", closeAccountMenuWithEscape);

    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      document.removeEventListener("keydown", closeAccountMenuWithEscape);
    };
  }, [accountOpen]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setAccountOpen(false);
    } catch (error) {
      console.error(
        "Sign out failed:",
        error
      );
    }
  };

  const userLabel = user?.displayName || user?.email || "Account";
  const fallbackInitial = userLabel.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="site-header">
      <nav id="NAV">
        <Link
          to="/"
          className="nav-logo"
        >
          <img
            src={LOGO}
            alt="Edulience"
          />

          <h3>
            EDULIENCE
          </h3>
        </Link>

        <div className="nav-links">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <img
              src={Home}
              alt=""
            />

            <span>
              Home
            </span>
          </NavLink>

          <NavLink
            to="/training"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <img
              src={quiz}
              alt=""
            />

            <span>
              Training
            </span>
          </NavLink>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <img
              src={wayofgroups}
              alt=""
            />
            <span>Library</span>
          </NavLink>

          <NavLink
            to="/shorts"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <img src={Short}/>
            <span>Shorts</span>
          </NavLink>
        </div>

        {user ? (
          <div
            className="nav-account"
            ref={accountRef}
          >
            <button
              type="button"
              className="nav-account-button"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label={`Open account menu for ${userLabel}`}
              onClick={() => setAccountOpen((isOpen) => !isOpen)}
            >
              {user.photoURL ? (
                <img
                  className="nav-avatar"
                  src={user.photoURL}
                  alt=""
                />
              ) : (
                <span
                  className="nav-avatar nav-avatar-fallback"
                  aria-hidden="true"
                >
                  {fallbackInitial}
                </span>
              )}

              <span className="nav-account-name">
                {user.displayName || user.email}
              </span>
            </button>

            {accountOpen && (
              <div
                className="nav-account-menu"
                role="menu"
              >
                <div className="nav-account-details">
                  {user.displayName && (
                    <strong>{user.displayName}</strong>
                  )}
                  {user.email && (
                    <span>{user.email}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="nav-sign-out"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="nav-sign-in"
            onClick={handleLogin}
          >
            Sign in
          </button>
        )}
      </nav>
    </header>
  );
}

export default NAV;
