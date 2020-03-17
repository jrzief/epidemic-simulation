import React from 'react';
import './App.css';
import * as d3 from 'd3';

const Person = ({ x, y, infected, dead, recovered }) => {
  //should use styled components here
  let strokeColor = 'rgb(146, 120, 226)';
  let fillColor = 'white';

  if (infected) {
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
      r="5"
      style={{ fill: fillColor, stroke: strokeColor, strokeWidth: 2 }}
    ></circle>
  );
};
// generates a poulation oriented around cx, cy
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
    y: cy
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

function App() {
  const population = createPopulation({
    cx: 400,
    cy: 200,
    width: 400,
    height: 300
  });

  return (
    <div className="App">
      <h1>Visualizing the spread of viruses in a population</h1>
      <svg
        style={{
          width: '100vw',
          height: '100vh'
        }}
      >
        {population.map(p => (
          <Person x={p.x} y={p.y} infected />
        ))}
      </svg>
    </div>
  );
}

export default App;
