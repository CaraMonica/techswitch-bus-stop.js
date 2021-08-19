const TECHSWITCH_STOP = "490008660N";
const IMPERIAL_POSTCODE = "SW72AZ";
const POSTCODES_API = "http://api.postcodes.io/postcodes/";

const fetch = require("node-fetch");

const getStopArrivalsAPI = (stopID) =>
  `https://api.tfl.gov.uk/StopPoint/${stopID}/Arrivals`;

const getStopsInAreaAPI = (lat, lon, radius) =>
  `https://api.tfl.gov.uk/StopPoint/?lat=${lat}&lon=${lon}&stopTypes=NaptanPublicBusCoachTram&radius=${radius}`;

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
      element["timeToStation"] = `${Math.floor(
        element["timeToStation"] / 60
      )} min: ${Math.floor(element["timeToStation"] % 60)}s`;
      console.log(element);
    });

fetch(POSTCODES_API + IMPERIAL_POSTCODE)
  .then((response) => response.json())
  .then((json) =>
    fetch(getStopsInAreaAPI(json.result.latitude, json.result.longitude, 1000))
  )
  .then((response) => response.json())
  .then((json) =>
    json.stopPoints
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map((element) => element.naptanId)
  )
  .then((stops) => {
      console.log(stops[0])
      fetch(getStopArrivalsAPI(stops[0]))})
  .then((response) => response.json())
  .then((json) => logNextNBuses(json, 5));


// fetch(getStopArrivalsAPI(TECHSWITCH_STOP))
//   .then((response) => response.json())
//   .then((json) => logNextNBuses(json, 5));
