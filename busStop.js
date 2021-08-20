const readline = require("readline-sync");
const fetch = require("node-fetch");

const TECHSWITCH_STOP = "490008660N";
const IMPERIAL_POSTCODE = "SW72AZ";
const EUSTON_POSTCODE = "NW12RT";
const POSTCODES_API = "http://api.postcodes.io/postcodes/";
const NUM_BUSES = 5;
const MIN_RADIUS = 100;
const MAX_RADIUS = 600;

const getStopArrivalsAPI = stopID =>
  `https://api.tfl.gov.uk/StopPoint/${stopID}/Arrivals`;

const getStopsInAreaAPI = (lat, lon, radius) =>
  `https://api.tfl.gov.uk/StopPoint/?lat=${lat}&lon=${lon}&stopTypes=NaptanPublicBusCoachTram&radius=${radius}`;

const getJourneyAPI = (lat, long, stopId) =>
  `https://api.tfl.gov.uk/Journey/JourneyResults/${lat},${long}/to/${stopId}`;

const convertSecsToMins = seconds =>
  `${Math.floor(seconds / 60)} minutes, ${seconds % 60} seconds`;

const getUserInput = message => {
  console.log(message);
  return readline.prompt();
};

const getUserYesOrNo = message => {
  while (true) {
    const validAnswers = ["y", "n"];
    try {
      const answer = getUserInput(message).toLowerCase();
      if (validAnswers.includes(answer)) return answer;
      throw "Please type y for yes, or n for no.";
    } catch (err) {
      console.log(err);
    }
  }
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
    .forEach(element => {
      console.log(
        `The ${element.lineName} to ${element.destinationName} in ${element.timeToStation}`
      );
    });
};

const validateRadius = radius => {
  if (isNaN(radius)) throw "not a number";
  if (radius < MIN_RADIUS) throw `radius must not be less than ${MIN_RADIUS}`;
  if (radius > MAX_RADIUS)
    throw `radius must not be greater than ${MAX_RADIUS}`;
};

const getUserRadius = () => {
  const message = `\nEnter radius to search in meters (${MIN_RADIUS}-${MAX_RADIUS}):`;
  while (true) {
    try {
      const radius = parseInt(getUserInput(message));
      validateRadius(radius);
      return radius;
    } catch (err) {
      console.log(err);
    }
  }
};

const validateLondonPostcode = json => {
  if (json.status > 300) throw json.error;
  if (json.result.region !== "London") throw "Postcode not in London";
};

const getLatAndLong = json => {
  try {
    validateLondonPostcode(json);
    return {
      latitude: json.result.latitude,
      longitude: json.result.longitude,
    };
  } catch (err) {
    throw err;
  }
};

const fetchUserLatAndLong = () =>
  fetch(
    POSTCODES_API +
      getUserInput("\nEnter postcode in London:").replace(/\s/g, "")
  )
    .then(response => response.json())
    .then(json => getLatAndLong(json))
    .catch(err => {
      console.log(err);
      return fetchUserLatAndLong();
    });

const getNClosestStops = (json, travelInfo, n) => {
  travelInfo.stops = json.stopPoints
    .sort((a, b) => a.distance - b.distance)
    .slice(0, n)
    .map(({ id, indicator, distance }) => ({
      id,
      indicator,
      distance: Math.floor(distance),
    }));

  if (!travelInfo.stops.length) {
    throw "No stops in this area.";
  }

  return travelInfo;
};

const fetchNClosestStops = (travelInfo, n) =>
  fetch(
    getStopsInAreaAPI(
      travelInfo.latitude,
      travelInfo.longitude,
      getUserRadius()
    )
  )
    .then(response => response.json())
    .then(json => getNClosestStops(json, travelInfo, n));

const logStopInfo = (arrivals, stop) => {
  console.log(`\n${stop.indicator}, distance ${stop.distance} meters`);
  logNextNArrivals(arrivals, NUM_BUSES);
};

const fetchArrivalsAtStops = travelInfo =>
  Promise.all(
    travelInfo.stops.map(stop =>
      fetch(getStopArrivalsAPI(stop.id))
        .then(response => response.json())
        .then(json => logStopInfo(json, stop))
    )
  ).then(() => travelInfo);

const logDirections = json => {
  if (!json.journeys) {
    console.log("Directions not available.");
    return;
  }

  console.log(`\nTotal journey time: ${json.journeys[0].duration} minutes`);

  json.journeys[0].legs.map(leg => {
    let i = 0;
    console.log(`\nLeg ${++i}: ${leg.instruction.detailed}`);

    leg.instruction.steps.map(step => {
      console.log(`-> ${step.descriptionHeading.trim()} ${step.description}`);
    });
  });
};

const fetchJourneyInfo = travelInfo => {
  const answer = getUserYesOrNo(
    `\nWould you like directions to ${travelInfo.stops[0].indicator}? (Y/N)`
  );
  if (answer === "y") {
    return fetch(
      getJourneyAPI(
        travelInfo.latitude,
        travelInfo.longitude,
        travelInfo.stops[0].id
      )
    )
      .then(response => response.json())
      .then(json => {
        logDirections(json);
      });
  }

  return;
};
const runTflApp = () => {
  fetchUserLatAndLong()
    .then(travelInfo => fetchNClosestStops(travelInfo, 2))
    .then(travelInfo => fetchArrivalsAtStops(travelInfo))
    .then(travelInfo => fetchJourneyInfo(travelInfo))
    .catch(console.log)
    .finally(() => console.log("\nGoodbye!"));
};

runTflApp();
