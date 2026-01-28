import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import "./HomePage.css";
import backgroundVideo from "../media/ski-video.mp4";
import FormInput from "../components/FormInput";
import Dropdown from "../components/Dropdown";
import CheckBox from "../components/CheckBox";
import DateSelector from "../components/DateSelector";
import SubmitPage from "./SubmitPage";

function HomePage() {
  const [init, setInit] = useState(false);
  const [data, setData] = useState(null);

  // Used to force-remount the form so ALL fields reset on Back
  const [formInstance, setFormInstance] = useState(0);

  // Controlled only for dates/checkboxes (matches your components)
  const [formValues, setFormValues] = useState({});

  const DEFAULTS = {
    region: "All",
    zip: "90210",
    guests: 2,
    startDate: () => dayjs().format("YYYY-MM-DD"),
    endDate: () => dayjs().add(3, "day").format("YYYY-MM-DD"),
  };

  const handleFormChange = (title, value) => {
    setFormValues((prev) =>
      title === "Start Date"
        ? { ...prev, [title]: value, "End Date": value }
        : { ...prev, [title]: value }
    );
  };

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options = useMemo(
    () => ({
      autoPlay: true,
      clear: true,
      delay: 0.1,
      detectRetina: true,
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { enable: false, mode: "push" },
          onHover: { enable: true, mode: "repulse" },
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 260, duration: 0.4 },
        },
      },
      particles: {
        color: { value: "rgba(255,255,255,0)" },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true,
          opacity: 0.9,
          width: 5,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "bounce" },
          random: false,
          speed: 6,
          straight: false,
        },
        number: { density: { enable: true }, value: 60 },
        opacity: { value: 0.8 },
        shape: { type: "circle" },
        size: { value: { min: 2, max: 7 } },
      },
      pauseOnBlur: true,
      pauseOnOutsideViewport: false,
      responsive: [],
      smooth: true,
      themes: [],
      zLayers: 1,
    }),
    []
  );

  const makePatchedData = (raw) => {
    const startStr =
      raw["Start Date"]?.format?.("YYYY-MM-DD") || raw["Start Date"] || "";
    const endStr =
      raw["End Date"]?.format?.("YYYY-MM-DD") || raw["End Date"] || "";

    const patched = {
      ...raw,
      // defaults
      Region: raw["Region"] || DEFAULTS.region,
      "Zip Code": raw["Zip Code"] || DEFAULTS.zip,
      "Number of Guests": (() => {
        const n =
          raw["Number of Guests"] !== undefined && raw["Number of Guests"] !== ""
            ? Number(raw["Number of Guests"])
            : DEFAULTS.guests;
        return Number.isFinite(n) ? n : DEFAULTS.guests;
      })(),
      "Start Date": startStr || DEFAULTS.startDate(),
      "End Date": endStr || DEFAULTS.endDate(),
      "Willing to fly?": !!raw["Willing to fly?"],
      Stay: raw["Stay"] || "Both",
      "Epic Pass": !!raw["Epic Pass"],
      "Ikon Pass": !!raw["Ikon Pass"],
    };

    // normalized fields for SubmitPage
    patched.Guests = patched["Number of Guests"];
    patched.checkIn = patched["Start Date"];
    patched.checkOut = patched["End Date"];
    return patched;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const rawData = {
      ...Object.fromEntries(formData.entries()),
      ...formValues,
    };

    const patched = makePatchedData(rawData);

    // Simulate API
    const response = await new Promise((resolve) =>
      setTimeout(() => resolve({ success: true, data: patched }), 200)
    );

    if (response.success) {
      setData(response.data);
    }
  };

  const startDate = formValues["Start Date"] || "";
  const endDate = formValues["End Date"] || "";
  const datesAreValid = () => {
    if (!startDate && !endDate) return true;
    if (!startDate || !endDate) return false;
    return !dayjs(startDate).isAfter(dayjs(endDate));
  };

  return (
    <div className="outer">
      {!data && (
        <div className="video-container" aria-hidden="true">
          <video autoPlay muted loop playsInline>
            <source src={backgroundVideo} type="video/mp4" />
            Ski Video
          </video>
          <div className="video-overlay"></div>
        </div>
      )}

      {init && <Particles id="tsparticles" options={options} />}

      {data ? (
        <SubmitPage
          data={data}
          onBack={() => {
            // Reset EVERYTHING to a fresh form with defaults
            setData(null);
            setFormValues({});
            setFormInstance((x) => x + 1); // force remount the form
            // optional: scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      ) : (
        <div key={formInstance} className="input-form">
          <form onSubmit={handleSubmit}>
            <div className="row-container">
              <Dropdown
                options={[
                  "All",
                  "Rockies",
                  "West",
                  "Northeast",
                  "Midatlantic",
                  "Midwest",
                ]}
                label={"Region"}
                onChange={handleFormChange}
                defaultValue={DEFAULTS.region}
              />
              {/* <CheckBox name={"Willing to fly?"} onChange={handleFormChange} />
              <Dropdown
                options={["AirBnB", "Hotel", "Both"]}
                label={"Stay"}
                onChange={handleFormChange}
                defaultValue={"Both"}
              /> */}
            </div>

            <div className="row-container">
              <FormInput
                name="Zip Code"
                placeholder="e.g. 90210"
                min="5"
                max="5"
                type="text"
                defaultValue={DEFAULTS.zip}
              />
              <FormInput
                name="Number of Guests"
                label="# of guests"
                type="number"
                minValue="1"
                maxValue="1000000"
                defaultValue={DEFAULTS.guests}
              />
              <CheckBox name={"Epic Pass"} onChange={handleFormChange} />
              <CheckBox name={"Ikon Pass"} onChange={handleFormChange} />
            </div>

            <div className="date-row-wrapper">
              <div className="row-container">
                <DateSelector
                  name="Start Date"
                  value={formValues["Start Date"]}
                  onChange={handleFormChange}
                />
                <DateSelector
                  name="End Date"
                  value={formValues["End Date"]}
                  onChange={handleFormChange}
                />
              </div>
              {!datesAreValid() && (
                <p className="error-text">
                  {!startDate || !endDate
                    ? "Please fill out both start and end dates."
                    : "Start date must be before end date."}
                </p>
              )}
            </div>

            <button type="submit" disabled={!datesAreValid()}>
              Find Best Trip...
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HomePage;
