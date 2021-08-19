const fetch = require("node-fetch");
const TECHSWITCH_STOP = "490008660N";
const TFL_KEY = "?app_key=4270c89bdf034e6686245442ece733f5";

const stopArrivalsURL = `https://api.tfl.gov.uk/StopPoint/${TECHSWITCH_STOP}/Arrivals`;

fetch(stopArrivalsURL)
  .then((response) => response.json())
  .then((body) => console.log(body));
