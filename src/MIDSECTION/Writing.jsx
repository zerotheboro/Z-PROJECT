import { useRef, useState } from "react";
import { DetailOfTips, image_importor } from "./info_every_tips";
import "./Writing.scss"

function AddingMethods() {
  const TITLE = useRef(null);
  const CONTENT = useRef(null);

  const [Effort, setEffort] = useState("fish");

  let user_list = JSON.parse(
    localStorage.getItem("user_lists") || "[]"
  ).filter(Boolean);

  function Process_user_methods(e) {
    e.preventDefault();

    if (
      !TITLE.current?.value.trim() ||
      !CONTENT.current?.value.trim()
    ) {
      return;
    }

    const adding = new DetailOfTips(
      {
        vn: TITLE.current.value,
        eng: TITLE.current.value,
        src: image_importor(Effort).src
      },

      {
        vn: CONTENT.current.value,
        eng: CONTENT.current.value
      }
    );

    localStorage.setItem(
      "user_lists",
      JSON.stringify([adding, ...user_list])
    );

    window.location.reload();
  }

  return (
    <section className="add-method-section">

      <div className="add-method-intro">
        <span className="add-method-tag">
          YOUR SYSTEM
        </span>

        <h2>
          Create your own
          <span> learning method.</span>
        </h2>

        <p>
          Found a study technique that works for you?
          Save it inside your personal learning system.
        </p>
      </div>


      <form
        className="add-method-form"
        onSubmit={Process_user_methods}
      >

        <div className="form-field">
          <label htmlFor="title-input">
            Method name
          </label>

          <input
            ref={TITLE}
            type="text"
            placeholder="e.g. 15 minute recall sprint"
            id="title-input"
            name="title-input"
          />
        </div>


        <div className="form-field form-field--large">
          <label htmlFor="content-input">
            How does your method work?
          </label>

          <textarea
            ref={CONTENT}
            placeholder="Describe the method, steps, when to use it..."
            id="content-input"
            name="content-input"
          />
        </div>


        <fieldset className="effort-selector">

          <legend>
            How much effort does it require?
          </legend>


          <label
            className={`effort-option ${
              Effort === "fish" ? "selected" : ""
            }`}
          >
            <input
              type="radio"
              name="effort_level"
              value="fish"
              checked={Effort === "fish"}
              onChange={() => setEffort("fish")}
            />

            <img
              src={image_importor("fish").src}
              alt=""
            />

            <div>
              <strong>Easy</strong>
            </div>
          </label>


          <label
            className={`effort-option ${
              Effort === "whale" ? "selected" : ""
            }`}
          >
            <input
              type="radio"
              name="effort_level"
              value="whale"
              checked={Effort === "whale"}
              onChange={() => setEffort("whale")}
            />

            <img
              src={image_importor("whale").src}
              alt=""
            />

            <div>
              <strong>Medium</strong>
            </div>
          </label>


          <label
            className={`effort-option ${
              Effort === "sharky" ? "selected" : ""
            }`}
          >
            <input
              type="radio"
              name="effort_level"
              value="sharky"
              checked={Effort === "sharky"}
              onChange={() => setEffort("sharky")}
            />

            <img
              src={image_importor("sharky").src}
              alt=""
            />

            <div>
              <strong>Hard</strong>
            </div>
          </label>

        </fieldset>


        <button
          className="add-method-button"
          type="submit"
        >
          <span>+</span>
          Add to my system
        </button>

      </form>

    </section>
  );
}

export default AddingMethods;