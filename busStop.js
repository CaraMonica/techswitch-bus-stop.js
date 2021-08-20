const TECHSWITCH_STOP = "490008660N";
const IMPERIAL_POSTCODE = "SW72AZ";
const EUSTON_POSTCODE = "NW12RT";
const POSTCODES_API = "http://api.postcodes.io/postcodes/";
const NUM_BUSES = 5;
const MIN_RADIUS = 100;
const MAX_RADIUS = 600;

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

const logNextNArrivals = (arrivals, n) => {
  if (arrivals.length === 0) {
    console.log("No buses due");
    return;
  }
  arrivals
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
        throw `radius must not be less than ${MIN_RADIUS}`;
      if (radius > MAX_RADIUS)
        throw `radius must not be greater than ${MAX_RADIUS}`;
      return radius;
    } catch (err) {
      console.log(err);
    }
  }
};

const fetchURLandProcess = (url, func, ...args) =>
  fetch(url)
    .then((response) => response.json())
    .then((json) => func(json, ...args));

const isValidLondonPostCode = (json) => {
  if (json.status > 300) throw json.error;
  if (json.result.region !== "London") throw "Postcode not in London";
};

const getLatAndLong = (json) => {
  try {
    isValidLondonPostCode(json);
    return [json.result.latitude, json.result.longitude];
  } catch (err) {
    throw err;
  }
};

const fetchUserLatAndLong = () =>
  fetchURLandProcess(
    POSTCODES_API +
      getUserInput("Enter postcode in London:").replace(/\s/g, ""),
    getLatAndLong
  ).catch((err) => {
    console.log(err);
    return fetchUserLatAndLong();
  });

const getNClosestStops = (stops, n) =>
  stops
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map(({ naptanId, indicator, distance }) => ({
      naptanId,
      indicator,
      distance: Math.floor(distance),
    }));

const fetchNClosestStops = (n) =>
  fetchUserLatAndLong()
    .then((result) => fetch(getStopsInAreaAPI(...result, getUserRadius())))
    .then((response) => response.json())
    .then((json) => getNClosestStops(json.stopPoints, n));

const logStopInfo = (arrivals, stop) => {
  console.log(`\n${stop.indicator}, distance ${stop.distance} m`);
  logNextNArrivals(arrivals, NUM_BUSES);
};

const fetchArrivalsAtStop = (stop) =>
  fetchURLandProcess(getStopArrivalsAPI(stop.naptanId), logStopInfo, stop);

const getNClosestStopsArrivalInfo = (n) =>
  fetchNClosestStops(n)
    .then((stops) => {
      stops.forEach(fetchArrivalsAtStop);
    })
    .catch(console.log);

getNClosestStopsArrivalInfo(2);
