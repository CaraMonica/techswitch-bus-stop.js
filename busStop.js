const TECHSWITCH_STOP = "490008660N";
const IMPERIAL_POSTCODE = "SW72AZ";
const EUSTON_POSTCODE = "NW12RT";
const POSTCODES_API = "http://api.postcodes.io/postcodes/";
const NUM_BUSES = 5;
const SEARCH_RADIUS = 500;

const readline = require("readline-sync");
const fetch = require("node-fetch");

const getStopArrivalsAPI = (stopID) =>
  `https://api.tfl.gov.uk/StopPoint/${stopID}/Arrivals`;

const getStopsInAreaAPI = (lat, lon, radius) =>
  `https://api.tfl.gov.uk/StopPoint/?lat=${lat}&lon=${lon}&stopTypes=NaptanPublicBusCoachTram&radius=${radius}`;

const convertSecsToMins = (seconds) =>
  `${Math.floor(seconds / 60)} min and ${seconds % 60} s`;

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
      timeToStation,
    }))
    .forEach((element) => {
      element.timeToStation = convertSecsToMins(element.timeToStation);
      console.log(`The ${element.lineName} to ${element.destinationName} in ${element.timeToStation}`);
    });

const postcode = getUserInput("\nEnter Postcode with no spaces:");

fetch(POSTCODES_API + postcode)
  .then((response) => response.json())
  .then((json) =>
    fetch(
      getStopsInAreaAPI(
        json.result.latitude,
        json.result.longitude,
        SEARCH_RADIUS
      )
    )
  )
  .then((response) => response.json())
  .then((json) => {
    const stops = json.stopPoints
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map(({ naptanId, indicator, distance }) => ({
        naptanId,
        indicator,
        distance,
      }));
    stops.forEach(
      (element) => (element.distance = Math.floor(element.distance))
    );
    return stops;
  })
  .then((stops) => {
    console.log(`\n${stops[0].indicator}, distance ${stops[0].distance} m`);
    fetch(getStopArrivalsAPI(stops[0].naptanId))
      .then((response) => response.json())
      .then((json) => logNextNBuses(json, NUM_BUSES))
      .then(() => {
        console.log(`\n${stops[1].indicator}, distance ${stops[1].distance} m`);
        fetch(getStopArrivalsAPI(stops[1].naptanId))
          .then((response) => response.json())
          .then((json) => logNextNBuses(json, NUM_BUSES));
      });
  });
