import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import hexoid from 'hexoid';

const RADIUS = 5;
const ITERATIONS_TO_DIE = 20;
const ITERATIONS_TO_RECOVER = 40;
const MORTALITY = 0.04;

const Person = ({ x, y, infected, dead, recovered }) => {
  //should use styled components here
  let strokeColor = 'rgb(146, 120, 226)';
  let fillColor = 'white';

  if (dead) {
    return null;
    //strokeColor = 'rgba(0, 0, 0, 0.5)';
  } else if (infected !== null) {
    strokeColor = 'rgb(246, 102, 64)';
    fillColor = 'rgb(246, 102, 64)';
  } else if (dead) {
    strokeColor = 'rgbq(0, 0, 0, 0.5)';
  } else if (recovered) {
    strokeColor = 'rgb(146, 129, 227)';
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={RADIUS}
      style={{ fill: fillColor, stroke: strokeColor, strokeWidth: 2 }}
    ></circle>
  );
};

const Slider = ({ label, value, setter, unit = '%', editable }) => {
  return (
    <p>
      {label}:{''}
      {editable ? (
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={ev => setter(ev.target.value)}
          step={1}
        />
      ) : null}
      {value}
      {unit}
    </p>
  );
};
// generates a poulation oriented around cx, cy
//function usePopulation({ cx, cy, width, height }) {
function createRow({ cx, cy, width }) {
  ///fit as many as possible into row
  const N = Math.floor(width / 15);
  // point scale positions a row for us
  const xScale = d3
    .scalePoint()
    .domain(d3.range(0, N))
    .range([cx - width / 2, cx + width / 2]);

  const row = d3.range(0, N).map(i => ({
    x: xScale(i),
    y: cy,
    key: hexoid(25)(),
    infected: null
  }));

  return row;
}

function createPopulation({ cx, cy, width, height }) {
  const Nrows = Math.floor(height / 15);

  const yScale = d3
    .scalePoint()
    .domain(d3.range(0, Nrows + 1))
    .range([cy - height / 2, cy + height / 2]);

  // should replace the shape here with a circle
  const widthScale = d3
    .scaleLinear()
    .domain([0, Nrows / 2, Nrows])
    .range([15, width, 15]);

  const rows = d3
    .range(0, Nrows + 1)
    .map(i => createRow({ cx, cy: yScale(i), width: widthScale(i) }));

  console.log('rows', rows);
  //return rows;
  let reducerow = rows.reduce((population, row) => [...population, ...row]);

  //return rows;
  console.log('reducerow', reducerow);
  return reducerow;
}

//people move around here
function peopleMove(population, socialDistancing) {
  const percentMovement = 1 - socialDistancing / 100;
  const random = d3.randomUniform(-2 * percentMovement, 2 * percentMovement);
  return population.map(p =>
    p.dead
      ? p
      : {
          ...p,
          x: p.x + random(),
          y: p.y + random()
        }
  );
}

//when people collide they transfer viruses
function peopleCollisions(population) {
  //we only want infected people
  const infected = population.filter(p => p.infected !== null);

  // find people in vicinity of infected people
  const collisions = infected.map(person => {
    //subdivides whole space to find nearest candidates
    const subdividedSpace = d3
      .quadtree()
      .extent([
        [-1, 1],
        [RADIUS * 2, RADIUS * 2]
      ])
      .x(d => d.x)
      .y(d => d.y)
      .addAll(
        //everyone not infected and not current lookup
        population.filter(p => !p.infected).filter(p => p.key !== person.key)
      );
    //person nearest current lookup is candidate for collisuion
    //person within RADIUS*2 of lookup position
    const candidate = subdividedSpace.find(person.x, person.y, RADIUS * 2);

    return candidate ? candidate : null;
  });
  return collisions.filter(p => p !== null);
}

//takes a population and list of collisions -and returns population with more infections
// keep track of when aperson got infected with elapsedTime
function infectPeople(population, contacts, elapsedTime, virality) {
  const contactKeys = contacts.map(p => p.key);

  return population.map(p => {
    if (contactKeys.includes(p.key)) {
      //this person came into contact with an infected person
      if (d3.randomUniform(1, 100)() < virality) {
        return {
          ...p,
          infected: elapsedTime,
          recovered: false
        };
      } else {
        return p;
      }
    } else {
      return p;
    }
  });
  //let nextPopulation = population.filter(p => !keys.includes(p.key));

  //contacts = contacts.map(p => ({ ...p, infected: true }));
  //return [...nextPopulation, ...contacts];
}

// after N iterations you either die or improve
function peopleDieOrGetBetter(
  population,
  iterationCount,
  mortality,
  lengthOfInfection
) {
  return population.map(p => {
    if (p.infected) {
      //infected people have a MORTALITY % chance of dying every day until they recover
      if (d3.randomUniform(0, 1)() < mortality / lengthOfInfection) {
        return {
          ...p,
          dead: true,
          infected: null // dead are invisible - this is necessary so cant infect more
        };
        //}
        /*  if ((elapsedTime - p.infected) / 60 > ITERATIONS_TO_DIE) {
        if (d3.randomUniform(0, 100)() < MORTALITY) {
          return {
            ...p,
            dead: true //100% mortatlity
          };
        } else {
          return p;
        } */
      } else if (iterationCount > lengthOfInfection) {
        return {
          ...p,
          infected: null,
          recovered: true
        };
      } else {
        return p;
      }
    } else {
      return p;
    }
  });
}

function usePopulation({
  cx,
  cy,
  width,
  height,
  mortality,
  virality,
  lengthOfInfection,
  socialDistancing
}) {
  //const [mortality, setMortality] = useState(defaultMortality);
  const [population, setPopulation] = useState(
    createPopulation({
      cx: width / 2,
      cy: height / 2,
      width: width - 15,
      height: height - 15
    })
  );
  //controls when simulation is running
  const [simulating, setSimulating] = useState(false);
  const [iterationCount, setIterationCount] = useState(0);

  function startSimulation() {
    // console.log('hello');
    //avoid changing values directly
    const nextPopulation = [...population];

    //infect a random person
    const person =
      nextPopulation[Math.floor(Math.random() * nextPopulation.length)];
    person.infected = 0;

    setPopulation(nextPopulation);
    setIterationCount(0);
    setSimulating(true);
  }

  function stopSimulation() {
    setSimulating(false);
  }

  function iteratePopulation(elapsedTime) {
    setPopulation(population => {
      // calculate the next state of our population on each tick
      let nextPopulation = [...population]; //avoid changing stuff directly

      nextPopulation = peopleMove(nextPopulation, socialDistancing);
      nextPopulation = infectPeople(
        nextPopulation,
        peopleCollisions(nextPopulation),
        elapsedTime,
        virality
      );
      nextPopulation = peopleDieOrGetBetter(
        nextPopulation,
        iterationCount,
        mortality / 100,
        lengthOfInfection
      );

      //console.log(peopleCollisions(nextPopulation));
      return nextPopulation;
    });
    setIterationCount(Math.floor(elapsedTime / 60));
  }
  //runs the simulation loop
  useEffect(() => {
    if (simulating) {
      const t = d3.timer(iteratePopulation);
      // calc next state
      // stop timer when cleaning up
      return () => t.stop();
    }
  }, [simulating]);

  return {
    population,
    startSimulation,
    stopSimulation,
    simulating,
    iterationCount
  };
}

export const Population = ({
  width,
  height,
  defaultMortality = 4,
  defaultVirality = 50,
  defaultLengthOfInfection = 20,
  defaultSocialDistancing = 0
}) => {
  const [mortality, setMortality] = useState(defaultMortality);
  const [virality, setVirality] = useState(defaultVirality);
  const [lengthOfInfection, setLengthOfInfection] = useState(
    defaultLengthOfInfection
  );
  const [socialDistancing, setSocialDistancing] = useState(
    defaultSocialDistancing
  );

  const {
    population,
    startSimulation,
    stopSimulation,
    simulating,
    iterationCount
  } = usePopulation({
    width,
    height,
    mortality,
    virality,
    lengthOfInfection,
    socialDistancing
  });

  return (
    <>
      <svg
        style={{
          width: width,
          height: height
        }}
      >
        {population.map(p => (
          <Person {...p} />
        ))}
      </svg>
      <div>
        {simulating ? (
          <button onClick={stopSimulation}>Stop</button>
        ) : (
          <button onClick={startSimulation}>Start simulation</button>
        )}
      </div>
      <p>
        Population" {population.filter(p => !p.dead).length}, Infected: {''}
        {population.filter(p => p.infected !== null).length}, Dead:{' '}
        {population.filter(p => p.dead).length}, Recovered:{' '}
        {population.filter(p => p.recovered).length}
      </p>
      {simulating ? <p>Iterations: {iterationCount}</p> : null}
      <Slider
        label="Social Distancing"
        value={socialDistancing}
        setter={setSocialDistancing}
        editable={!simulating}
      />
      <Slider
        label="Mortality"
        value={mortality}
        setter={setMortality}
        editable={!simulating}
      />
      <Slider
        label="Virality"
        value={virality}
        setter={setVirality}
        editable={!simulating}
      />
      <Slider
        label="Length of Infection"
        value={lengthOfInfection}
        setter={setLengthOfInfection}
        unit="steps"
        editable={!simulating}
      />
    </>
  );
};
