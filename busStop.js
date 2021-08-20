const TECHSWITCH_STOP = "490008660N";
const IMPERIAL_POSTCODE = "SW72AZ";
const EUSTON_POSTCODE = "NW12RT";
const POSTCODES_API = "http://api.postcodes.io/postcodes/";
const NUM_BUSES = 5;
const MIN_RADIUS = 100;
const MAX_RADIUS = 2000;

const readline = require("readline-sync");
const fetch = require("node-fetch");

const getStopArrivalsAPI = (stopID) =>
  `https://api.tfl.gov.uk/StopPoint/${stopID}/Arrivals`;

const getStopsInAreaAPI = (lat, lon, radius) =>
  `https://api.tfl.gov.uk/StopPoint/?lat=${lat}&lon=${lon}&stopTypes=NaptanPublicBusCoachTram&radius=${radius}`;

const convertSecsToMins = (seconds) =>
  `${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds`;

const getUserInput = (message) => {
  console.log(message);
  return readline.prompt();
};

const logNextNBuses = (buses, n) =>
  buses
    .sort((a, b) => a.timeToStation - b.timeToStation)
    .slice(0, n)
    .map(({ lineName, destinationName, timeToStation }) => ({
      lineName,
      destinationName,
      timeToStation: convertSecsToMins(timeToStation),
    }))
    .forEach((element) => {
      console.log(
        `The ${element.lineName} to ${element.destinationName} in ${element.timeToStation}`
      );
    });

const isValidPostcode = (code) => {
  //   const postcodeRegEx = /[A-Z]{1,2}[0-9]{1,2} ?[0-9][A-Z]{2}/;
  //   return postcodeRegEx.test(code);
  return true;
};

let postcode;

while (true) {
  try {
    postcode = getUserInput("Enter postcode in London:");
    if (isValidPostcode(postcode)) break;
    else throw "Not a valid postcode.";
  } catch (err) {
    console.log(err);
  }
}

let radius;
while (true) {
  try {
    radius = parseInt(
      getUserInput(
        `\nEnter radius to search in meters (${MIN_RADIUS}-${MAX_RADIUS}):`
      )
    );
    if (isNaN(radius)) throw "not a number";
    else if (radius < MIN_RADIUS)
      throw `radius must be greater than ${MIN_RADIUS}`;
    else if (radius > MAX_RADIUS)
      throw `radius must be less than ${MAX_RADIUS}`;
    else break;
  } catch (err) {
    console.log(err);
  }
}

const getPostcodeLatAndLong = (postcode) =>
  fetch(POSTCODES_API + postcode)
    .then((response) => response.json())
    .then((json) => [json.result.latitude, json.result.longitude]);

const getClosestNStopsInArea = async (postcode, radius, n = 2) =>
  fetch(getStopsInAreaAPI(...(await getPostcodeLatAndLong(postcode)), radius))
    .then((response) => response.json())
    .then((json) =>
      json.stopPoints
        .sort((a, b) => a.distance - b.distance)
        .slice(0, n)
        .map(({ naptanId, indicator, distance }) => ({
          naptanId,
          indicator,
          distance: Math.floor(distance),
        }))
    );

const getArrivalsAtStop = (stop) =>
  fetch(getStopArrivalsAPI(stop.naptanId))
    .then((response) => response.json())
    .then((json) => {
      console.log(`\n${stop.indicator}, distance ${stop.distance} m`);
      logNextNBuses(json, NUM_BUSES);
    });

const getClosestNStopsArrivalInfo = async (postcode, radius, n=2) => {
    const stops = await getClosestNStopsInArea(postcode, radius, n)
    stops.forEach(getArrivalsAtStop)
}

getClosestNStopsArrivalInfo(postcode, radius);
