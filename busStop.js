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

const getUserLondonPostCodeLatAndLon = async () => {
  while (true) {
    try {
      const postcode = getUserInput("Enter postcode in London:");
      const json = await fetch(POSTCODES_API + postcode).then((request) =>
        request.json()
      );
      if (json.status > 300) throw json.error;
      if (json.result.region != "London") throw "Postcode must be in London";
      return [json.result.latitude, json.result.longitude];
    } catch (err) {
      console.log(err);
    }
  }
};

const getUserRadius = () => {
  while (true) {
    let radius;
    try {
      radius = parseInt(
        getUserInput(
          `\nEnter radius to search in meters (${MIN_RADIUS}-${MAX_RADIUS}):`
        )
      );
      if (isNaN(radius)) throw "not a number";
      if (radius < MIN_RADIUS)
        throw `radius must be greater than ${MIN_RADIUS}`;
      if (radius > MAX_RADIUS) throw `radius must be less than ${MAX_RADIUS}`;
      return radius;
    } catch (err) {
      console.log(err);
    }
  }
};

const getClosestNStopsInArea = async (n) =>
  fetch(
    getStopsInAreaAPI(
      ...(await getUserLondonPostCodeLatAndLon()),
      getUserRadius()
    )
  )
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

const getClosestNStopsArrivalInfo = async (n = 2) => {
  const stops = await getClosestNStopsInArea(n);
  stops.forEach(getArrivalsAtStop);
};

getClosestNStopsArrivalInfo();
s;
